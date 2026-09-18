"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";

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

export async function buyBeerAction(formData: FormData) {
  const returnTo =
    String(formData.get("return_to") ?? "") === "/home"
      ? "/home"
      : "/mannschaftskasse";
  const { clubId, player } = await requireClub();
  const flags = await getFeatureFlagsForClub(clubId);
  if (!(flags.penalties ?? false)) redirect("/home");
  if (!player) redirect(url({ beer_error: "Kein Spielerprofil gefunden." }, returnTo));

  const quantity = Number(String(formData.get("quantity") ?? "1"));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    redirect(url({ beer_error: "Bitte eine gültige Anzahl wählen." }, returnTo));
  }

  const supabase = await createClient();
  const { data: settings, error: settingsError } = await supabase
    .from("club_settings")
    .select(
      "beerkasse_premium_enabled,beerkasse_enabled,beerkasse_paypal_url,beerkasse_price_cents",
    )
    .eq("club_id", clubId)
    .maybeSingle();

  if (settingsError) {
    redirect(url({ beer_error: "Bierkasse konnte nicht geladen werden." }, returnTo));
  }

  const premiumEnabled = settings?.beerkasse_premium_enabled === true;
  const featureEnabled = settings?.beerkasse_enabled === true;
  const paypalUrl = settings?.beerkasse_paypal_url?.trim() ?? "";
  const unitPriceCents = Number(settings?.beerkasse_price_cents ?? 0);

  if (!premiumEnabled || !featureEnabled || !paypalUrl) {
    redirect(url({ beer_error: "Bierkasse+ ist für diesen Club nicht aktiv." }, returnTo));
  }

  if (!Number.isInteger(unitPriceCents) || unitPriceCents < 1) {
    redirect(url({ beer_error: "Für die Bierkasse ist kein gültiger Preis hinterlegt." }, returnTo));
  }

  const totalCents = unitPriceCents * quantity;
  const { error } = await supabase.from("beer_consumptions").insert({
    club_id: clubId,
    player_id: player.id,
    quantity,
    unit_price_cents: unitPriceCents,
    total_cents: totalCents,
  });

  if (error) {
    redirect(url({ beer_error: "Bier konnte nicht gebucht werden." }, returnTo));
  }

  revalidatePath("/mannschaftskasse");
  revalidatePath("/home");
  redirect(buildPaypalUrl(paypalUrl, totalCents));
}

export async function reportPenaltyAction(formData: FormData) {
  const { clubId } = await requireClub();
  const flags = await getFeatureFlagsForClub(clubId);
  if (!(flags.penalties ?? false)) redirect("/home");

  const supabase = await createClient();
  const playerId = Number(String(formData.get("player_id") ?? ""));
  if (!Number.isFinite(playerId)) redirect(url({ error: "Bitte einen Spieler auswählen." }));

  const { data: target } = await supabase
    .from("players")
    .select("id")
    .eq("club_id", clubId)
    .eq("id", playerId)
    .eq("is_active", true)
    .maybeSingle();
  if (!target) redirect(url({ error: "Spieler nicht gefunden." }));

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
  if (!reason || !value) redirect(url({ error: "Bitte Grund und Posten angeben." }));

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

  if (error) redirect(url({ error: "Posten konnte nicht eingetragen werden." }));
  revalidatePath("/mannschaftskasse");
  revalidatePath("/admin/penalties");
  redirect(url({ saved: "1" }));
}
