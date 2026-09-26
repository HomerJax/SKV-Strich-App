"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCashboxAccess } from "@/lib/cashbox/access";
import { parseEuroToCents } from "@/lib/cashbox/money";
import { getServerI18n } from "@/lib/i18n/server";

async function ctx() {
  const access = await requireCashboxAccess({ manage: true });
  return {
    ...access,
    supabase: createAdminClient(),
  };
}

function url(params: Record<string, string>, tab = "penalties") {
  return `/admin/penalties?${new URLSearchParams({ tab, ...params })}`;
}

function addDaysIso(days: number | null) {
  if (!days || days < 1) return null;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function refresh() {
  revalidatePath("/admin/penalties");
  revalidatePath("/mannschaftskasse");
  revalidatePath("/home");
}

async function reverseCashTransaction(params: {
  supabase: ReturnType<typeof createAdminClient>;
  clubId: string;
  transactionId: number;
  userId: string;
  penaltyId: number;
}) {
  const { supabase, clubId, transactionId, userId, penaltyId } = params;
  const { data: original, error: originalError } = await supabase
    .from("cash_transactions")
    .select("id,amount_cents,category,title")
    .eq("club_id", clubId)
    .eq("id", transactionId)
    .maybeSingle<{
      id: number;
      amount_cents: number;
      category: string;
      title: string;
    }>();

  if (originalError) throw new Error(originalError.message);
  if (!original) return;

  const { data: existingReversal, error: reversalCheckError } = await supabase
    .from("cash_transactions")
    .select("id")
    .eq("club_id", clubId)
    .eq("reversed_transaction_id", transactionId)
    .maybeSingle<{ id: number }>();

  if (reversalCheckError) throw new Error(reversalCheckError.message);
  if (existingReversal) return;

  const { error } = await supabase.from("cash_transactions").insert({
    club_id: clubId,
    amount_cents: -original.amount_cents,
    kind: "reversal",
    category: original.category,
    title: `Storno: ${original.title}`,
    source_type: "penalty_reversal",
    source_id: penaltyId,
    source_key: `penalty:${penaltyId}:reversal:${Date.now()}`,
    reversed_transaction_id: transactionId,
    created_by: userId,
  });

  if (error) throw new Error(error.message);
}

export async function addPenaltyAction(formData: FormData) {
  const { t } = await getServerI18n();
  const { supabase, clubId } = await ctx();
  const playerId = Number(String(formData.get("player_id") ?? ""));

  if (!Number.isFinite(playerId)) {
    redirect(url({ error: t("cashAction.playerRequired") }));
  }

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("club_id", clubId)
    .eq("id", playerId)
    .eq("is_active", true)
    .maybeSingle();

  if (!player) {
    redirect(url({ error: t("cashAction.playerNotFound") }));
  }

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

  const reason =
    (preset?.reason ?? String(formData.get("reason") ?? "").trim()) || null;
  const typeRaw = preset?.type ?? String(formData.get("type") ?? "beer");
  const type: "beer" | "money" | "custom" =
    typeRaw === "money" || typeRaw === "custom" ? typeRaw : "beer";
  const value =
    (preset?.value ?? String(formData.get("value") ?? "").trim()) || null;

  if (!reason || !value) {
    redirect(url({ error: t("cashAction.reasonValueRequired") }));
  }

  const dueRaw = String(formData.get("due_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const escalationDays =
    preset?.escalation_after_days ?? (type === "beer" ? 28 : null);
  const escalationValue =
    preset?.escalation_value ??
    (type === "beer" ? "+ 1 Sechserträger" : null);

  const { error } = await supabase.from("penalties").insert({
    club_id: clubId,
    player_id: playerId,
    reason,
    type,
    value,
    due_date: dueRaw || addDaysIso(escalationDays),
    notes,
    escalation_after_days: escalationDays,
    escalation_value: escalationValue,
  });

  if (error) redirect(url({ error: error.message }));

  refresh();
  redirect(url({ saved: "1" }));
}

export async function savePenaltyRuleAction(formData: FormData) {
  const { t } = await getServerI18n();
  const { supabase, clubId } = await ctx();
  const ruleKey = String(formData.get("rule_key") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "beer");
  const type =
    typeRaw === "money" || typeRaw === "custom" ? typeRaw : "beer";
  const daysRaw = String(formData.get("escalation_after_days") ?? "").trim();
  const days = daysRaw ? Math.max(1, Number(daysRaw)) : null;
  const escalationValue =
    String(formData.get("escalation_value") ?? "").trim() || null;
  const enabled = formData.get("enabled") === "on";

  if (
    !ruleKey ||
    !label ||
    !reason ||
    !value ||
    (daysRaw && !Number.isFinite(days))
  ) {
    redirect(url({ error: t("cashAction.ruleIncomplete") }, "rules"));
  }

  const { error } = await supabase
    .from("penalty_rules")
    .update({
      label,
      reason,
      type,
      value,
      enabled,
      escalation_after_days: days,
      escalation_value: days ? escalationValue : null,
      updated_at: new Date().toISOString(),
    })
    .eq("club_id", clubId)
    .eq("rule_key", ruleKey);

  if (error) redirect(url({ error: error.message }, "rules"));

  refresh();
  redirect(url({ saved: "1" }, "rules"));
}

async function change(
  formData: FormData,
  mode: "resolve" | "reopen" | "delete",
) {
  const { t } = await getServerI18n();
  const { supabase, clubId, user } = await ctx();
  const id = Number(String(formData.get("penalty_id") ?? ""));

  if (!Number.isFinite(id)) {
    redirect(url({ error: t("cashAction.invalidFbzg") }));
  }

  const { data: penalty, error: penaltyError } = await supabase
    .from("penalties")
    .select("id,reason,type,value,resolved_at,cash_transaction_id")
    .eq("id", id)
    .eq("club_id", clubId)
    .maybeSingle<{
      id: number;
      reason: string | null;
      type: "beer" | "money" | "custom";
      value: string | null;
      resolved_at: string | null;
      cash_transaction_id: number | null;
    }>();

  if (penaltyError || !penalty) {
    redirect(url({ error: penaltyError?.message ?? t("cashAction.fbzgNotFound") }));
  }

  if (mode === "resolve" && penalty.resolved_at) {
    redirect(url({ saved: "1" }));
  }

  try {
    if (mode === "resolve") {
      let transactionId: number | null = null;
      const amountCents =
        penalty.type === "money" ? parseEuroToCents(penalty.value) : null;

      if (amountCents && amountCents > 0) {
        const { data: transaction, error: transactionError } = await supabase
          .from("cash_transactions")
          .insert({
            club_id: clubId,
            amount_cents: amountCents,
            kind: "income",
            category: "Strafen",
            title: penalty.reason || "FBZG-Geldbeitrag",
            source_type: "penalty",
            source_id: penalty.id,
            source_key: `penalty:${penalty.id}:payment:${Date.now()}`,
            created_by: user.id,
          })
          .select("id")
          .single<{ id: number }>();

        if (transactionError || !transaction) {
          throw new Error(
            transactionError?.message ?? t("cashAction.paymentFailed"),
          );
        }
        transactionId = transaction.id;
      }

      const { error } = await supabase
        .from("penalties")
        .update({
          resolved_at: new Date().toISOString(),
          cash_transaction_id: transactionId,
        })
        .eq("id", id)
        .eq("club_id", clubId);

      if (error) throw new Error(error.message);
    }

    if (mode === "reopen") {
      if (penalty.cash_transaction_id) {
        await reverseCashTransaction({
          supabase,
          clubId,
          transactionId: penalty.cash_transaction_id,
          userId: user.id,
          penaltyId: penalty.id,
        });
      }

      const { error } = await supabase
        .from("penalties")
        .update({
          resolved_at: null,
          cash_transaction_id: null,
        })
        .eq("id", id)
        .eq("club_id", clubId);

      if (error) throw new Error(error.message);
    }

    if (mode === "delete") {
      if (penalty.cash_transaction_id) {
        await reverseCashTransaction({
          supabase,
          clubId,
          transactionId: penalty.cash_transaction_id,
          userId: user.id,
          penaltyId: penalty.id,
        });
      }

      const { error } = await supabase
        .from("penalties")
        .delete()
        .eq("id", id)
        .eq("club_id", clubId);

      if (error) throw new Error(error.message);
    }
  } catch (error) {
    redirect(
      url({
        error:
          error instanceof Error ? error.message : t("cashAction.actionFailed"),
      }),
    );
  }

  refresh();
  redirect(url({ saved: "1" }));
}

export async function resolvePenaltyAction(formData: FormData) {
  return change(formData, "resolve");
}

export async function reopenPenaltyAction(formData: FormData) {
  return change(formData, "reopen");
}

export async function deletePenaltyAction(formData: FormData) {
  return change(formData, "delete");
}
