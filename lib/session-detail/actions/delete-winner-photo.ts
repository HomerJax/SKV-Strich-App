import { createClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/session-detail/response";

type SessionDetailSupabase = Awaited<ReturnType<typeof createClient>>;

type DeleteWinnerPhotoInput = {
  supabase: SessionDetailSupabase;
  sessionId: number;
  clubId: string;
  winnerPhotoPath: string | null;
};

export async function handleDeleteWinnerPhoto({
  supabase,
  sessionId,
  clubId,
  winnerPhotoPath,
}: DeleteWinnerPhotoInput) {
  if (!winnerPhotoPath) {
    return fail("Kein Siegerfoto vorhanden.");
  }

  const { error: updateError } = await supabase
    .from("sessions")
    .update({ winner_photo_path: null })
    .eq("id", sessionId)
    .eq("club_id", clubId);

  if (updateError) {
    return fail(updateError.message, 500);
  }

  await supabase.storage.from("session-photos").remove([winnerPhotoPath]);

  return ok({
    message: "Siegerfoto gelöscht.",
    winner_photo_path: null,
    winnerPhotoUrl: null,
  });
}