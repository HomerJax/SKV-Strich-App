import { createClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/session-detail/response";

type SessionDetailSupabase = Awaited<ReturnType<typeof createClient>>;

type PlayerRow = {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  is_active: boolean | null;
  age_group: string | null;
  preferred_position: "attack" | "defense" | "goalkeeper" | null;
  strength: number | null;
  is_guest: boolean | null;
};

type AddGuestPlayerInput = {
  supabase: SessionDetailSupabase;
  sessionId: number;
  clubId: string;
  membership: {
    role: string | null;
  };
  guestName: string;
  guestPosition: string;
  guestAgeGroup: string;
};

export async function handleAddGuestPlayer({
  supabase,
  sessionId,
  clubId,
  membership,
  guestName,
  guestPosition,
  guestAgeGroup,
}: AddGuestPlayerInput) {
  const role = membership.role;

  if (role !== "admin") {
    return fail(
      "Gastspieler können aktuell nur von Admins angelegt werden.",
      403
    );
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
      "Gastspieler können nicht mehr hinzugefügt werden, wenn bereits ein Ergebnis gespeichert ist."
    );
  }

  if (!guestName.trim()) {
    return fail("Bitte einen Namen für den Gastspieler eingeben.");
  }

  const payload = {
    club_id: clubId,
    name: guestName.trim(),
    is_active: true,
    is_guest: true,
    preferred_position: guestPosition.trim() === "" ? null : guestPosition.trim(),
    age_group: guestAgeGroup.trim() === "" ? null : guestAgeGroup.trim(),
    strength: null,
  };

  const { data: createdPlayer, error: insertPlayerError } = await supabase
    .from("players")
    .insert(payload)
    .select(
      "id, name, first_name, last_name, nickname, is_active, age_group, preferred_position, strength, is_guest"
    )
    .single();

  if (insertPlayerError) {
    return fail(insertPlayerError.message, 500);
  }

  const typedCreatedPlayer = createdPlayer as PlayerRow;

  const { error: insertSessionPlayerError } = await supabase
    .from("session_players")
    .insert({
      session_id: sessionId,
      player_id: typedCreatedPlayer.id,
    });

  if (insertSessionPlayerError) {
    await supabase.from("players").delete().eq("id", typedCreatedPlayer.id);
    return fail(insertSessionPlayerError.message, 500);
  }

  return ok({
    message: "Gastspieler angelegt und direkt zur Anwesenheit hinzugefügt.",
    player: typedCreatedPlayer,
  });
}