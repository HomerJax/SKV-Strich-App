"use server";

import { revalidatePath } from "next/cache";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabledForClub } from "@/lib/feature-flags";
import { getServerI18n } from "@/lib/i18n/server";

export type SessionType = "training" | "event";

function normalizeSessionType(value: FormDataEntryValue | null): SessionType | null {
  if (value === "training" || value === "event") return value;
  return null;
}

export async function updateSessionTypeAction(formData: FormData) {
  const { t } = await getServerI18n();
  const { clubId, membership, isPowerUser } = await requireClub();

  if (!isPowerUser && membership.role !== "admin") {
    throw new Error(t("sessionEdit.adminTypeOnly"));
  }

  const sessionIdRaw = String(formData.get("sessionId") ?? "").trim();
  const nextType = normalizeSessionType(formData.get("type"));
  const nextEventKind = nextType === "event" && formData.get("event_kind") === "match" ? "match" : "event";

  if (!sessionIdRaw) {
    throw new Error(t("sessionEdit.idMissing"));
  }

  if (!nextType) {
    throw new Error(t("sessionEdit.invalidType"));
  }

  const sessionId = Number(sessionIdRaw);

  if (!Number.isFinite(sessionId)) {
    throw new Error(t("sessionAction.invalidId"));
  }

  const sessionTypesEnabled = await isFeatureEnabledForClub(clubId, "session_types");

  if (!sessionTypesEnabled) {
    throw new Error(t("sessionEdit.typesDisabled"));
  }

  const supabase = await createClient();

  const { data: sessionRow, error: sessionLoadError } = await supabase
    .from("sessions")
    .select("id, club_id, type, event_kind")
    .eq("id", sessionId)
    .eq("club_id", clubId)
    .maybeSingle<{ id: number; club_id: string; type: SessionType | null; event_kind: "match" | "event" | null }>();

  if (sessionLoadError) {
    throw new Error(t("sessionEdit.loadFailed", { error: sessionLoadError.message }));
  }

  if (!sessionRow) {
    throw new Error(t("sessionEdit.notFound"));
  }

  const currentType: SessionType = sessionRow.type === "event" ? "event" : "training";

  if (currentType === nextType && (nextType !== "event" || (sessionRow.event_kind ?? "event") === nextEventKind)) {
    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath("/sessions");
    revalidatePath("/home");
    return;
  }

  const { error: updateError } = await supabase
    .from("sessions")
    .update({
      type: nextType,
      event_kind: nextEventKind,
      ...(nextEventKind === "event" ? { event_score_for: null, event_score_against: null } : {}),
    })
    .eq("id", sessionId)
    .eq("club_id", clubId);

  if (updateError) {
    throw new Error(t("sessionEdit.typeSaveFailed", { error: updateError.message }));
  }

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  revalidatePath("/home");
  revalidatePath("/stats");
}