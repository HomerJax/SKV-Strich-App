import { createClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/session-detail/response";
import { getServerI18n } from "@/lib/i18n/server";

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
  guestStrength: string;
};

function canAddGuestPlayer(role: string | null | undefined) {
  return role === "admin" || role === "power_user";
}

export async function handleAddGuestPlayer({
  supabase,
  sessionId,
  clubId,
  membership,
  guestName,
  guestPosition,
  guestAgeGroup,
  guestStrength,
}: AddGuestPlayerInput) {
  const { t } = await getServerI18n();
  const role = membership.role;

  if (!canAddGuestPlayer(role)) {
    return fail(
      t("sessionAction.guestAdminOnly"),
      403
    );
  }

  const { data: existingResult, error: existingResultError } = await supabase
    .from("results")
    .select("id")
    .eq("session_id", sessionId)
    .limit(1)
    .maybeSingle();

  if (existingResultError) {
    return fail(existingResultError.message, 500);
  }

  if (existingResult?.id) {
    return fail(
      t("sessionAction.guestAfterResult")
    );
  }

  if (!guestName.trim()) {
    return fail(t("sessionAction.guestNameRequired"));
  }

  const cleanStrength = guestStrength.trim();
  const parsedStrength = cleanStrength === "" ? null : Number(cleanStrength);

  if (
    parsedStrength !== null &&
    (!Number.isInteger(parsedStrength) || parsedStrength < 1 || parsedStrength > 5)
  ) {
    return fail(t("sessionAction.guestStrengthInvalid"));
  }

  const payload = {
    club_id: clubId,
    name: guestName.trim(),
    is_active: true,
    is_guest: true,
    preferred_position: guestPosition.trim() === "" ? null : guestPosition.trim(),
    age_group: guestAgeGroup.trim() === "" ? null : guestAgeGroup.trim(),
    strength: parsedStrength,
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
    message: t("sessionAction.guestCreated"),
    player: typedCreatedPlayer,
  });
}