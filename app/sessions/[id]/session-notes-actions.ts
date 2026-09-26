"use server";

import { revalidatePath } from "next/cache";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getServerI18n } from "@/lib/i18n/server";

const MAX_NOTE_LENGTH = 280;

export async function updateSessionNotesAction(formData: FormData) {
  const { t } = await getServerI18n();
  const { clubId, membership, isPowerUser } = await requireClub();

  if (!isPowerUser && membership.role !== "admin") {
    throw new Error(t("sessionEdit.adminNotesOnly"));
  }

  const sessionId = Number(String(formData.get("sessionId") ?? "").trim());
  const notesRaw = String(formData.get("notes") ?? "").trim();

  if (!Number.isFinite(sessionId)) {
    throw new Error(t("sessionAction.invalidId"));
  }

  if (notesRaw.length > MAX_NOTE_LENGTH) {
    throw new Error(`Der Hinweis darf maximal ${MAX_NOTE_LENGTH} Zeichen lang sein.`);
  }

  const notes = notesRaw || null;
  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("club_id", clubId)
    .maybeSingle<{ id: number }>();

  if (sessionError) {
    throw new Error(t("sessionEdit.checkFailed", { error: sessionError.message }));
  }

  if (!session) {
    throw new Error(t("sessionEdit.notFound"));
  }

  const { error: updateError } = await supabase
    .from("sessions")
    .update({ notes })
    .eq("id", sessionId)
    .eq("club_id", clubId);

  if (updateError) {
    throw new Error(t("sessionEdit.noteSaveFailed", { error: updateError.message }));
  }

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  revalidatePath("/home");
}
