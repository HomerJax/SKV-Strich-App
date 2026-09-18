"use server";

import { revalidatePath } from "next/cache";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { MAX_RSVP_DEADLINE_MINUTES } from "@/lib/session-rsvp-deadline";

export async function updateSessionRsvpSettingsAction(formData: FormData) {
  const { clubId, membership, isPowerUser } = await requireClub();

  if (!canManageClub({ isPowerUser, role: membership.role })) {
    throw new Error("Nur Admins dürfen Trainingszeit und Anmeldeschluss ändern.");
  }

  const sessionId = Number(String(formData.get("sessionId") ?? "").trim());
  const startTimeRaw = String(formData.get("start_time") ?? "").trim();
  const overrideRaw = String(formData.get("rsvp_deadline_minutes_before") ?? "").trim();

  if (!Number.isFinite(sessionId)) {
    throw new Error("Ungültige Session-ID.");
  }

  const startTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(startTimeRaw)
    ? startTimeRaw
    : null;

  if (!startTime) {
    throw new Error("Bitte eine gültige Startzeit angeben.");
  }

  let deadlineOverride: number | null = null;
  if (overrideRaw !== "") {
    const parsed = Number(overrideRaw);
    if (
      !Number.isInteger(parsed) ||
      parsed < 0 ||
      parsed > MAX_RSVP_DEADLINE_MINUTES
    ) {
      throw new Error("Ungültiger Anmeldeschluss.");
    }
    deadlineOverride = parsed;
  }

  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("club_id", clubId)
    .maybeSingle<{ id: number }>();

  if (sessionError) {
    throw new Error(`Session konnte nicht geprüft werden: ${sessionError.message}`);
  }
  if (!session) {
    throw new Error("Session nicht gefunden.");
  }

  const { error } = await supabase
    .from("sessions")
    .update({
      start_time: startTime,
      rsvp_deadline_minutes_before: deadlineOverride,
    })
    .eq("id", sessionId)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(`Einstellungen konnten nicht gespeichert werden: ${error.message}`);
  }

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  revalidatePath("/home");
}
