"use server";

import { revalidatePath } from "next/cache";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabledForClub } from "@/lib/feature-flags";

export type SessionType = "training" | "event";

function normalizeSessionType(value: FormDataEntryValue | null): SessionType | null {
  if (value === "training" || value === "event") return value;
  return null;
}

export async function updateSessionTypeAction(formData: FormData) {
  const { clubId, membership, isPowerUser } = await requireClub();

  if (!isPowerUser && membership.role !== "admin") {
    throw new Error("Nur Admins dürfen den Session-Typ ändern.");
  }

  const sessionIdRaw = String(formData.get("sessionId") ?? "").trim();
  const nextType = normalizeSessionType(formData.get("type"));

  if (!sessionIdRaw) {
    throw new Error("Session-ID fehlt.");
  }

  if (!nextType) {
    throw new Error("Ungültiger Session-Typ.");
  }

  const sessionId = Number(sessionIdRaw);

  if (!Number.isFinite(sessionId)) {
    throw new Error("Ungültige Session-ID.");
  }

  const sessionTypesEnabled = await isFeatureEnabledForClub(clubId, "session_types");

  if (!sessionTypesEnabled) {
    throw new Error("Session Types sind für diesen Club noch nicht aktiviert.");
  }

  const supabase = await createClient();

  const { data: sessionRow, error: sessionLoadError } = await supabase
    .from("sessions")
    .select("id, club_id, type")
    .eq("id", sessionId)
    .eq("club_id", clubId)
    .maybeSingle<{ id: number; club_id: string; type: SessionType | null }>();

  if (sessionLoadError) {
    throw new Error(`Session konnte nicht geladen werden: ${sessionLoadError.message}`);
  }

  if (!sessionRow) {
    throw new Error("Session nicht gefunden.");
  }

  const currentType: SessionType = sessionRow.type === "event" ? "event" : "training";

  if (currentType === nextType) {
    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath("/sessions");
    revalidatePath("/home");
    return;
  }

  const { error: updateError } = await supabase
    .from("sessions")
    .update({
      type: nextType,
    })
    .eq("id", sessionId)
    .eq("club_id", clubId);

  if (updateError) {
    throw new Error(`Session-Typ konnte nicht gespeichert werden: ${updateError.message}`);
  }

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  revalidatePath("/home");
  revalidatePath("/stats");
}