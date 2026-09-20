import { createClient } from "@/lib/supabase/server";
import { syncClubAchievements } from "@/lib/badges/engine";
import { fail, ok } from "@/lib/session-detail/response";

type SessionDetailSupabase = Awaited<ReturnType<typeof createClient>>;

type DeleteResultInput = {
  supabase: SessionDetailSupabase;
  sessionId: number;
  clubId: string;
  gameNo: number;
  winnerPhotoPath?: string | null;
};

export async function handleDeleteResult({
  supabase,
  sessionId,
  clubId,
  gameNo,
  winnerPhotoPath = null,
}: DeleteResultInput) {
  if (!Number.isInteger(gameNo) || gameNo < 1) {
    return fail("Ungültige Spielnummer.");
  }

  const { error } = await supabase
    .from("results")
    .delete()
    .eq("session_id", sessionId)
    .eq("game_no", gameNo);

  if (error) return fail(error.message, 500);

  const { count, error: countError } = await supabase
    .from("results")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (countError) return fail(countError.message, 500);

  let winnerPhotoCleared = false;
  if (winnerPhotoPath) {
    const { error: photoResetError } = await supabase
      .from("sessions")
      .update({ winner_photo_path: null })
      .eq("id", sessionId)
      .eq("club_id", clubId);

    if (!photoResetError) {
      winnerPhotoCleared = true;
      await supabase.storage.from("session-photos").remove([winnerPhotoPath]);
    } else {
      console.error("Winner photo reset after result deletion failed", photoResetError);
    }
  }

  try {
    await syncClubAchievements(clubId);
  } catch (error) {
    console.error("Badge sync after result deletion failed", error);
  }

  const hasResult = (count ?? 0) > 0;

  return ok({
    message: hasResult
      ? `Spiel ${gameNo} gelöscht. Die übrigen Spiele bleiben bestehen.`
      : "Letztes Ergebnis gelöscht. Aufstellungen & Anwesenheit sind wieder bearbeitbar.",
    hasResult,
    goalsA: "",
    goalsB: "",
    gameNo,
    winnerPhotoCleared,
  });
}
