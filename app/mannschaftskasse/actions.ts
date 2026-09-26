"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireClub } from "@/lib/auth/guards";
import { requireBeerManagementAccess } from "@/lib/cashbox/access";
import { notifyBeerManagers } from "@/lib/cashbox/beer-notifications";
import { getServerI18n } from "@/lib/i18n/server";

function url(params: Record<string, string>, base = "/mannschaftskasse") {
  return `${base}?${new URLSearchParams(params)}`;
}

function addDaysIso(days: number | null) {
  if (!days || days < 1) return null;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildPaypalUrl(baseUrl: string, totalCents: number) {
  try {
    const paypalUrl = new URL(baseUrl);
    if (!["paypal.me", "www.paypal.me"].includes(paypalUrl.hostname.toLowerCase())) {
      return baseUrl;
    }

    const parts = paypalUrl.pathname.split("/").filter(Boolean);
    if (!parts[0]) return baseUrl;

    paypalUrl.pathname = `/${parts[0]}/${(totalCents / 100).toFixed(2)}`;
    return paypalUrl.toString();
  } catch {
    return baseUrl;
  }
}

export async function recordBeerAction(formData: FormData) {
  const { t } = await getServerI18n();
  const returnTo =
    String(formData.get("return_to") ?? "") === "/home"
      ? "/home"
      : "/mannschaftskasse";
  const { clubId, player, user } = await requireClub();
  if (!player) redirect(url({ beer_error: t("cashAction.noPlayer") }, returnTo));

  const quantity = Number(String(formData.get("quantity") ?? "1"));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    redirect(url({ beer_error: t("cashAction.invalidQuantity") }, returnTo));
  }

  const paymentMethod =
    String(formData.get("payment_method") ?? "") === "cash" ? "cash" : "paypal";

  const supabase = await createClient();
  const { data: settings, error: settingsError } = await supabase
    .from("club_settings")
    .select(
      "beerkasse_premium_enabled,beerkasse_enabled,beerkasse_paypal_url,beerkasse_price_cents",
    )
    .eq("club_id", clubId)
    .maybeSingle();

  if (settingsError) {
    redirect(url({ beer_error: t("cashAction.beerLoadFailed") }, returnTo));
  }

  const premiumEnabled = settings?.beerkasse_premium_enabled === true;
  const featureEnabled = settings?.beerkasse_enabled === true;
  const paypalUrl = settings?.beerkasse_paypal_url?.trim() ?? "";
  const unitPriceCents = Number(settings?.beerkasse_price_cents ?? 0);

  if (!premiumEnabled || !featureEnabled) {
    redirect(url({ beer_error: t("cashAction.beerDisabled") }, returnTo));
  }

  if (paymentMethod === "paypal" && !paypalUrl) {
    redirect(url({ beer_error: t("cashAction.paypalMissing") }, returnTo));
  }

  if (!Number.isInteger(unitPriceCents) || unitPriceCents < 1) {
    redirect(url({ beer_error: t("cashAction.invalidBeerPrice") }, returnTo));
  }

  const totalCents = unitPriceCents * quantity;
  const { error } = await supabase.from("beer_consumptions").insert({
    club_id: clubId,
    player_id: player.id,
    quantity,
    unit_price_cents: unitPriceCents,
    total_cents: totalCents,
    payment_method: paymentMethod,
    payment_status: "pending",
    created_by: user.id,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    redirect(url({ beer_error: t("cashAction.beerRecordFailed") }, returnTo));
  }

  try {
    await notifyBeerManagers({
      clubId,
      playerId: player.id,
      quantity,
      totalCents,
      paymentMethod,
      excludeUserId: user.id,
    });
  } catch (pushError) {
    console.error("Beer manager push failed", pushError);
  }

  revalidatePath("/mannschaftskasse");
  revalidatePath("/mannschaftskasse/bier");
  revalidatePath("/home");
  revalidatePath("/power-user/beerkasse");

  if (paymentMethod === "cash") {
    redirect(url({ beer_saved: "cash" }, returnTo));
  }

  redirect(buildPaypalUrl(paypalUrl, totalCents));
}

function beerManageUrl(params: Record<string, string> = {}) {
  return url(params, "/mannschaftskasse/bier");
}

function refreshBeerViews() {
  revalidatePath("/mannschaftskasse");
  revalidatePath("/mannschaftskasse/bier");
  revalidatePath("/home");
  revalidatePath("/power-user");
  revalidatePath("/power-user/beerkasse");
}

export async function markBeerCashPaidAction(formData: FormData) {
  const { t } = await getServerI18n();
  const { clubId, user } = await requireBeerManagementAccess();
  const consumptionId = Number(String(formData.get("consumption_id") ?? ""));
  if (!Number.isFinite(consumptionId)) {
    redirect(beerManageUrl({ error: t("cashAction.invalidBeerEntry") }));
  }

  const admin = createAdminClient();
  const { data: entry, error: entryError } = await admin
    .from("beer_consumptions")
    .select("id,quantity,total_cents,payment_method,payment_status,cash_transaction_id")
    .eq("club_id", clubId)
    .eq("id", consumptionId)
    .maybeSingle<{
      id: number;
      quantity: number;
      total_cents: number;
      payment_method: "paypal" | "cash";
      payment_status: "pending" | "paid" | "cancelled";
      cash_transaction_id: number | null;
    }>();

  if (entryError || !entry) {
    redirect(beerManageUrl({ error: t("cashAction.beerNotFound") }));
  }

  if (entry.payment_status !== "pending") {
    redirect(beerManageUrl({ error: t("cashAction.entryClosed") }));
  }

  const sourceKey = `beer:${entry.id}:${entry.payment_method}-payment`;
  let transactionId = entry.cash_transaction_id;

  if (!transactionId) {
    const { data: transaction, error: transactionError } = await admin
      .from("cash_transactions")
      .insert({
        club_id: clubId,
        amount_cents: entry.total_cents,
        kind: "income",
        category: "Getränke",
        title: `Bierkasse · ${entry.quantity} Bier · ${entry.payment_method === "cash" ? "Bar" : "PayPal"}`,
        source_type: "beer",
        source_id: entry.id,
        source_key: sourceKey,
        created_by: user.id,
      })
      .select("id")
      .single<{ id: number }>();

    if (transactionError) {
      if (transactionError.code === "23505") {
        const { data: existingTransaction } = await admin
          .from("cash_transactions")
          .select("id")
          .eq("club_id", clubId)
          .eq("source_key", sourceKey)
          .maybeSingle<{ id: number }>();
        transactionId = existingTransaction?.id ?? null;
      } else {
        redirect(beerManageUrl({ error: t("cashAction.paymentFailed") }));
      }
    } else {
      transactionId = transaction?.id ?? null;
    }
  }

  if (!transactionId) {
    redirect(beerManageUrl({ error: t("cashAction.paymentFailed") }));
  }

  const { error: updateError } = await admin
    .from("beer_consumptions")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      confirmed_by: user.id,
      cash_transaction_id: transactionId,
      updated_at: new Date().toISOString(),
    })
    .eq("club_id", clubId)
    .eq("id", entry.id);

  if (updateError) {
    redirect(beerManageUrl({ error: t("cashAction.paymentStatusFailed") }));
  }

  refreshBeerViews();
  redirect(beerManageUrl({ saved: "paid" }));
}

export async function updateBeerConsumptionAction(formData: FormData) {
  const { t } = await getServerI18n();
  const { clubId, user } = await requireBeerManagementAccess();
  const consumptionId = Number(String(formData.get("consumption_id") ?? ""));
  const quantity = Number(String(formData.get("quantity") ?? ""));

  if (
    !Number.isFinite(consumptionId) ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 99
  ) {
    redirect(beerManageUrl({ error: t("cashAction.invalidBeerQuantity") }));
  }

  const admin = createAdminClient();
  const { data: entry, error: entryError } = await admin
    .from("beer_consumptions")
    .select("id,quantity,unit_price_cents,total_cents,payment_method,payment_status,cash_transaction_id")
    .eq("club_id", clubId)
    .eq("id", consumptionId)
    .maybeSingle<{
      id: number;
      quantity: number;
      unit_price_cents: number;
      total_cents: number;
      payment_method: "paypal" | "cash";
      payment_status: "pending" | "paid" | "cancelled";
      cash_transaction_id: number | null;
    }>();

  if (entryError || !entry) {
    redirect(beerManageUrl({ error: t("cashAction.beerNotFound") }));
  }

  if (entry.payment_status === "cancelled") {
    redirect(beerManageUrl({ error: t("cashAction.cancelledImmutable") }));
  }

  const nextTotalCents = quantity * entry.unit_price_cents;
  const deltaCents = nextTotalCents - entry.total_cents;

  if (entry.payment_status === "paid" && deltaCents !== 0) {
    if (!entry.cash_transaction_id) {
      redirect(beerManageUrl({ error: t("cashAction.cashReferenceMissing") }));
    }

    const { error: adjustmentError } = await admin.from("cash_transactions").insert({
      club_id: clubId,
      amount_cents: deltaCents,
      kind: deltaCents > 0 ? "income" : "reversal",
      category: "Getränke",
      title: `Korrektur Bierkasse · ${entry.quantity} → ${quantity} Bier`,
      source_type: "beer_adjustment",
      source_id: entry.id,
      reversed_transaction_id: deltaCents < 0 ? entry.cash_transaction_id : null,
      created_by: user.id,
    });

    if (adjustmentError) {
      redirect(beerManageUrl({ error: t("cashAction.adjustmentFailed") }));
    }
  }

  const { error } = await admin
    .from("beer_consumptions")
    .update({
      quantity,
      total_cents: nextTotalCents,
      updated_at: new Date().toISOString(),
    })
    .eq("club_id", clubId)
    .eq("id", entry.id);

  if (error) {
    redirect(beerManageUrl({ error: t("cashAction.quantityUpdateFailed") }));
  }

  refreshBeerViews();
  redirect(beerManageUrl({ saved: "updated" }));
}

export async function cancelBeerConsumptionAction(formData: FormData) {
  const { t } = await getServerI18n();
  const { clubId, user } = await requireBeerManagementAccess();
  const consumptionId = Number(String(formData.get("consumption_id") ?? ""));
  if (!Number.isFinite(consumptionId)) {
    redirect(beerManageUrl({ error: t("cashAction.invalidBeerEntry") }));
  }

  const admin = createAdminClient();
  const { data: entry, error: entryError } = await admin
    .from("beer_consumptions")
    .select("id,quantity,total_cents,payment_method,payment_status,cash_transaction_id")
    .eq("club_id", clubId)
    .eq("id", consumptionId)
    .maybeSingle<{
      id: number;
      quantity: number;
      total_cents: number;
      payment_method: "paypal" | "cash";
      payment_status: "pending" | "paid" | "cancelled";
      cash_transaction_id: number | null;
    }>();

  if (entryError || !entry) {
    redirect(beerManageUrl({ error: t("cashAction.beerNotFound") }));
  }

  if (entry.payment_status === "cancelled") {
    redirect(beerManageUrl());
  }

  if (entry.payment_status === "paid" && entry.cash_transaction_id) {
    const { error: reversalError } = await admin.from("cash_transactions").insert({
      club_id: clubId,
      amount_cents: -entry.total_cents,
      kind: "reversal",
      category: "Getränke",
      title: `Storno: Bierkasse · ${entry.quantity} Bier`,
      source_type: "beer_reversal",
      source_id: entry.id,
      source_key: `beer:${entry.id}:cash-reversal`,
      reversed_transaction_id: entry.cash_transaction_id,
      created_by: user.id,
    });

    if (reversalError && reversalError.code !== "23505") {
      redirect(beerManageUrl({ error: t("cashAction.reversalFailed") }));
    }
  }

  const { error } = await admin
    .from("beer_consumptions")
    .update({
      payment_status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("club_id", clubId)
    .eq("id", entry.id);

  if (error) {
    redirect(beerManageUrl({ error: t("cashAction.beerCancelFailed") }));
  }

  refreshBeerViews();
  redirect(beerManageUrl({ saved: "cancelled" }));
}

export async function reportPenaltyAction(formData: FormData) {
  const { t } = await getServerI18n();
  const { clubId } = await requireClub();
  const supabase = await createClient();

  const { data: cashboxSettings } = await supabase
    .from("club_settings")
    .select("cashbox_setup_completed,cashbox_penalties_enabled")
    .eq("club_id", clubId)
    .maybeSingle();

  if (
    cashboxSettings?.cashbox_setup_completed !== true ||
    cashboxSettings?.cashbox_penalties_enabled !== true
  ) {
    redirect(url({ error: t("cashAction.fbzgDisabled") }));
  }
  const playerId = Number(String(formData.get("player_id") ?? ""));
  if (!Number.isFinite(playerId)) redirect(url({ error: t("cashAction.playerRequired") }));

  const { data: target } = await supabase
    .from("players")
    .select("id")
    .eq("club_id", clubId)
    .eq("id", playerId)
    .eq("is_active", true)
    .maybeSingle();
  if (!target) redirect(url({ error: t("cashAction.playerNotFound") }));

  const presetKey = String(formData.get("preset") ?? "").trim();
  const { data: preset } = presetKey
    ? await supabase
        .from("penalty_rules")
        .select("reason,type,value,escalation_after_days,escalation_value")
        .eq("club_id", clubId)
        .eq("rule_key", presetKey)
        .eq("enabled", true)
        .maybeSingle()
    : { data: null };

  const reason = (preset?.reason ?? String(formData.get("reason") ?? "").trim()) || null;
  const typeRaw = preset?.type ?? String(formData.get("type") ?? "beer");
  const type: "beer" | "money" | "custom" =
    typeRaw === "money" || typeRaw === "custom" ? typeRaw : "beer";
  const value = (preset?.value ?? String(formData.get("value") ?? "").trim()) || null;
  if (!reason || !value) redirect(url({ error: t("cashAction.reasonValueRequired") }));

  const notes = String(formData.get("notes") ?? "").trim() || null;
  const escalationDays = preset?.escalation_after_days ?? (type === "beer" ? 28 : null);
  const escalationValue = preset?.escalation_value ?? (type === "beer" ? "+ 1 Sechserträger" : null);

  const { error } = await supabase.from("penalties").insert({
    club_id: clubId,
    player_id: playerId,
    reason,
    type,
    value,
    notes,
    due_date: addDaysIso(escalationDays),
    escalation_after_days: escalationDays,
    escalation_value: escalationValue,
  });

  if (error) redirect(url({ error: t("cashAction.fbzgCreateFailed") }));
  revalidatePath("/mannschaftskasse");
  revalidatePath("/admin/penalties");
  redirect(url({ saved: "1" }));
}
