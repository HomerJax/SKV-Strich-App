"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";

async function getAdminPenaltyContext() {
  const { clubId, membership, isPowerUser } = await requireClub();

  const hasAdminAccess = canManageClub({
    isPowerUser,
    role: membership.role,
  });

  if (!hasAdminAccess) {
    redirect("/admin");
  }

  const flags = await getFeatureFlagsForClub(clubId);

  if (!(flags.penalties ?? false)) {
    redirect("/admin");
  }

  const supabase = await createClient();

  return { supabase, clubId };
}

function buildRedirectUrl(params: Record<string, string>) {
  const url = new URLSearchParams(params).toString();
  return `/admin/penalties?${url}`;
}

export async function addPenaltyAction(formData: FormData) {
  const { supabase, clubId } = await getAdminPenaltyContext();

  const playerId = Number(String(formData.get("player_id") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "beer").trim();
  const value = String(formData.get("value") ?? "").trim();
  const dueDateRaw = String(formData.get("due_date") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();

  if (!Number.isFinite(playerId)) {
    redirect(buildRedirectUrl({ error: "Bitte einen Spieler auswählen." }));
  }

  const type =
    typeRaw === "money" || typeRaw === "custom" ? typeRaw : "beer";

  const { error } = await supabase.from("penalties").insert({
    club_id: clubId,
    player_id: playerId,
    reason: reason || null,
    type,
    value: value || null,
    due_date: dueDateRaw || null,
    notes: notesRaw || null,
  });

  if (error) {
    redirect(buildRedirectUrl({ error: error.message }));
  }

  revalidatePath("/admin/penalties");
  redirect(buildRedirectUrl({ saved: "1" }));
}

export async function resolvePenaltyAction(formData: FormData) {
  const { supabase, clubId } = await getAdminPenaltyContext();

  const penaltyId = Number(String(formData.get("penalty_id") ?? ""));

  if (!Number.isFinite(penaltyId)) {
    redirect(buildRedirectUrl({ error: "Ungültige Strafe." }));
  }

  const { error } = await supabase
    .from("penalties")
    .update({
      resolved_at: new Date().toISOString(),
    })
    .eq("id", penaltyId)
    .eq("club_id", clubId);

  if (error) {
    redirect(buildRedirectUrl({ error: error.message }));
  }

  revalidatePath("/admin/penalties");
  redirect(buildRedirectUrl({ saved: "1" }));
}

export async function reopenPenaltyAction(formData: FormData) {
  const { supabase, clubId } = await getAdminPenaltyContext();

  const penaltyId = Number(String(formData.get("penalty_id") ?? ""));

  if (!Number.isFinite(penaltyId)) {
    redirect(buildRedirectUrl({ error: "Ungültige Strafe." }));
  }

  const { error } = await supabase
    .from("penalties")
    .update({
      resolved_at: null,
    })
    .eq("id", penaltyId)
    .eq("club_id", clubId);

  if (error) {
    redirect(buildRedirectUrl({ error: error.message }));
  }

  revalidatePath("/admin/penalties");
  redirect(buildRedirectUrl({ saved: "1" }));
}

export async function deletePenaltyAction(formData: FormData) {
  const { supabase, clubId } = await getAdminPenaltyContext();

  const penaltyId = Number(String(formData.get("penalty_id") ?? ""));

  if (!Number.isFinite(penaltyId)) {
    redirect(buildRedirectUrl({ error: "Ungültige Strafe." }));
  }

  const { error } = await supabase
    .from("penalties")
    .delete()
    .eq("id", penaltyId)
    .eq("club_id", clubId);

  if (error) {
    redirect(buildRedirectUrl({ error: error.message }));
  }

  revalidatePath("/admin/penalties");
  redirect(buildRedirectUrl({ saved: "1" }));
}