import { createClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/session-detail/response";

type SessionDetailSupabase = Awaited<ReturnType<typeof createClient>>;

type TogglePresenceInput = {
  supabase: SessionDetailSupabase;
  sessionId: number;
  playerId: number;
};

export async function handleTogglePresence({
  supabase,
  sessionId,
  playerId,
}: TogglePresenceInput) {
  if (!Number.isFinite(playerId)) {
    return fail("Ungültige Spieler-ID.");
  }

  const { data: existingResult, error: existingResultError } = await supabase
    .from("results")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existingResultError) {
    return fail(existingResultError.message, 500);
  }

  if (existingResult?.id) {
    return fail(
      "Anwesenheit ist gesperrt, weil bereits ein Ergebnis gespeichert ist."
    );
  }

  const { data: existingPresence, error: presenceError } = await supabase
    .from("session_players")
    .select("player_id")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (presenceError) {
    return fail(presenceError.message, 500);
  }

  if (existingPresence) {
    const { error: deleteError } = await supabase
      .from("session_players")
      .delete()
      .eq("session_id", sessionId)
      .eq("player_id", playerId);

    if (deleteError) {
      return fail(deleteError.message, 500);
    }

    return ok({
      mode: "removed",
      playerId,
    });
  }

  const { error: insertError } = await supabase.from("session_players").insert({
    session_id: sessionId,
    player_id: playerId,
  });

  if (insertError) {
    return fail(insertError.message, 500);
  }

  return ok({
    mode: "added",
    playerId,
  });
}