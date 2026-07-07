import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, ok } from "@/lib/session-detail/response";

type TogglePresenceInput = {
  supabase: SupabaseClient;
  sessionId: number;
  clubId: string;
  playerId: number;
};

export async function handleTogglePresence({
  supabase,
  sessionId,
  clubId,
  playerId,
}: TogglePresenceInput) {
  if (!Number.isFinite(playerId)) {
    return fail("Ungültige Spieler-ID.");
  }

  const { data: playerData, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("id", playerId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (playerError) {
    return fail(`Spieler konnte nicht geladen werden: ${playerError.message}`, 500);
  }

  if (!playerData?.id) {
    return fail("Spieler gehört nicht zu diesem Team.", 404);
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

    const { error: rsvpDeleteError } = await supabase
      .from("session_rsvps")
      .delete()
      .eq("session_id", sessionId)
      .eq("player_id", playerId);

    if (rsvpDeleteError) {
      return fail(rsvpDeleteError.message, 500);
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

  const { error: rsvpError } = await supabase.from("session_rsvps").upsert(
    {
      club_id: clubId,
      session_id: sessionId,
      player_id: playerId,
      status: "in",
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "session_id,player_id",
    }
  );

  if (rsvpError) {
    return fail(rsvpError.message, 500);
  }

  return ok({
    mode: "added",
    playerId,
  });
}