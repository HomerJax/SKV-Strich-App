"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";

async function ctx() {
  const { clubId, membership, isPowerUser } = await requireClub();
  if (!canManageClub({ isPowerUser, role: membership.role })) redirect("/admin");
  const flags = await getFeatureFlagsForClub(clubId);
  if (!(flags.penalties ?? false)) redirect("/admin");
  return { supabase: await createClient(), clubId };
}

function url(params: Record<string, string>) {
  return `/admin/penalties?${new URLSearchParams(params)}`;
}

function addDaysIso(days: number | null) {
  if (!days || days < 1) return null;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function addPenaltyAction(formData: FormData) {
  const { supabase, clubId } = await ctx();
  const playerId = Number(String(formData.get("player_id") ?? ""));
  if (!Number.isFinite(playerId)) redirect(url({ error: "Bitte einen Spieler auswählen." }));

  const presetKey = String(formData.get("preset") ?? "").trim();
  const { data: preset } = presetKey
    ? await supabase.from("penalty_rules").select("reason,type,value,escalation_after_days,escalation_value").eq("club_id", clubId).eq("rule_key", presetKey).eq("enabled", true).maybeSingle()
    : { data: null };

  const reason = (preset?.reason ?? String(formData.get("reason") ?? "").trim()) || null;
  const typeRaw = preset?.type ?? String(formData.get("type") ?? "beer");
  const type: "beer" | "money" | "custom" = typeRaw === "money" || typeRaw === "custom" ? typeRaw : "beer";
  const value = (preset?.value ?? String(formData.get("value") ?? "").trim()) || null;
  if (!reason || !value) redirect(url({ error: "Bitte Grund und Posten angeben." }));

  const dueRaw = String(formData.get("due_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const escalationDays = preset?.escalation_after_days ?? (type === "beer" ? 28 : null);
  const escalationValue = preset?.escalation_value ?? (type === "beer" ? "+ 1 Sechserträger" : null);
  const { error } = await supabase.from("penalties").insert({
    club_id: clubId, player_id: playerId, reason, type, value,
    due_date: dueRaw || addDaysIso(escalationDays), notes,
    escalation_after_days: escalationDays, escalation_value: escalationValue,
  });
  if (error) redirect(url({ error: error.message }));
  revalidatePath("/admin/penalties");
  revalidatePath("/mannschaftskasse");
  redirect(url({ saved: "1" }));
}

export async function savePenaltyRuleAction(formData: FormData) {
  const { supabase, clubId } = await ctx();
  const ruleKey = String(formData.get("rule_key") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "beer");
  const type = typeRaw === "money" || typeRaw === "custom" ? typeRaw : "beer";
  const daysRaw = String(formData.get("escalation_after_days") ?? "").trim();
  const days = daysRaw ? Math.max(1, Number(daysRaw)) : null;
  const escalationValue = String(formData.get("escalation_value") ?? "").trim() || null;
  const enabled = formData.get("enabled") === "on";
  if (!ruleKey || !label || !reason || !value || (daysRaw && !Number.isFinite(days))) redirect(url({ error: "Regel unvollständig." }));

  const { error } = await supabase.from("penalty_rules").update({
    label, reason, type, value, enabled,
    escalation_after_days: days,
    escalation_value: days ? escalationValue : null,
    updated_at: new Date().toISOString(),
  }).eq("club_id", clubId).eq("rule_key", ruleKey);
  if (error) redirect(url({ error: error.message }));
  revalidatePath("/admin/penalties");
  revalidatePath("/mannschaftskasse");
  redirect(url({ saved: "1" }));
}

async function change(formData: FormData, mode: "resolve" | "reopen" | "delete") {
  const { supabase, clubId } = await ctx();
  const id = Number(String(formData.get("penalty_id") ?? ""));
  if (!Number.isFinite(id)) redirect(url({ error: "Ungültiger Posten." }));
  const q = mode === "delete" ? supabase.from("penalties").delete() : supabase.from("penalties").update({ resolved_at: mode === "resolve" ? new Date().toISOString() : null });
  const { error } = await q.eq("id", id).eq("club_id", clubId);
  if (error) redirect(url({ error: error.message }));
  revalidatePath("/admin/penalties");
  revalidatePath("/mannschaftskasse");
  redirect(url({ saved: "1" }));
}

export async function resolvePenaltyAction(f: FormData) { return change(f, "resolve"); }
export async function reopenPenaltyAction(f: FormData) { return change(f, "reopen"); }
export async function deletePenaltyAction(f: FormData) { return change(f, "delete"); }
