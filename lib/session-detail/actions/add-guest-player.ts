import type { SupabaseClient } from "@supabase/supabase-js";
import { canManageClub, canManageGuestPlayer, maskGuestStrengthForClient } from "@/lib/auth/access";
import { fail, ok } from "@/lib/session-detail/response";
import { getServerI18n } from "@/lib/i18n/server";
import { canAddGuestToSession, FREE_GUESTS_PER_SESSION_LIMIT } from "@/lib/billing/product-limits";

type SessionDetailSupabase = SupabaseClient;

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
  adminSupabase: SessionDetailSupabase;
  sessionId: number;
  clubId: string;
  membership: {
    role: string | null;
  };
  canLeadTraining?: boolean;
  isPowerUser?: boolean;
  guestName: string;
  guestPosition: string;
  guestAgeGroup: string;
  guestStrength: string;
};

export async function handleAddGuestPlayer({
  adminSupabase,
  sessionId,
  clubId,
  membership,
  canLeadTraining = false,
  isPowerUser = false,
  guestName,
  guestPosition,
  guestAgeGroup,
  guestStrength,
}: AddGuestPlayerInput) {
  const { t } = await getServerI18n();
  const role = membership.role;

  if (!canManageGuestPlayer({ role, isPowerUser, canLeadTraining })) {
    return fail(
      t("sessionAction.guestAdminOnly"),
      403
    );
  }

  const { data: existingResult, error: existingResultError } = await adminSupabase
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

  const guestAllowed = await canAddGuestToSession(adminSupabase, clubId, sessionId);
  if (!guestAllowed) {
    return fail(`Im Free-Plan ist ${FREE_GUESTS_PER_SESSION_LIMIT} Gastspieler pro Termin enthalten. Mit PRO kannst du weitere Gäste hinzufügen.`, 403);
  }

  const cleanStrength = guestStrength.trim();
  const parsedStrength = cleanStrength === "" ? null : Number(cleanStrength);

  if (
    parsedStrength !== null &&
    (!Number.isInteger(parsedStrength) || parsedStrength < 1 || parsedStrength > 5)
  ) {
    return fail(t("sessionAction.guestStrengthInvalid"));
  }

  const normalizedCategory = guestAgeGroup.trim().toLocaleLowerCase("de-DE");
  const requestedCategoryKey = normalizedCategory === "ah" ? "ah" : normalizedCategory === "ü32" || normalizedCategory === "ue32" ? "ue32" : null;
  const { data: matchingCategory } = requestedCategoryKey
    ? await adminSupabase.from("club_categories").select("key").eq("club_id", clubId).eq("key", requestedCategoryKey).eq("is_active", true).maybeSingle()
    : { data: null };

  const payload = {
    club_id: clubId,
    name: guestName.trim(),
    is_active: true,
    is_guest: true,
    preferred_position: guestPosition.trim() === "" ? null : guestPosition.trim(),
    age_group: guestAgeGroup.trim() === "" ? null : guestAgeGroup.trim(),
    category_key: matchingCategory?.key ?? null,
    strength: parsedStrength,
  };

  // The service-role client is safe here only because the API verified session
  // membership, club scope, and guest-management permission before calling us.
  // A regular user client cannot SELECT the protected strength column, and
  // training leaders may not satisfy the admin-only player INSERT RLS policy.
  const { data: createdPlayer, error: insertPlayerError } = await adminSupabase
    .from("players")
    .insert(payload)
    .select(
      "id, name, first_name, last_name, nickname, is_active, age_group, category_key, preferred_position, strength, is_guest"
    )
    .single();

  if (insertPlayerError) {
    return fail(insertPlayerError.message, 500);
  }

  const typedCreatedPlayer = createdPlayer as PlayerRow;

  const { error: insertSessionPlayerError } = await adminSupabase
    .from("session_players")
    .insert({
      session_id: sessionId,
      player_id: typedCreatedPlayer.id,
    });

  if (insertSessionPlayerError) {
    await adminSupabase.from("players").delete().eq("id", typedCreatedPlayer.id);
    return fail(insertSessionPlayerError.message, 500);
  }

  return ok({
    message: t("sessionAction.guestCreated"),
    player: maskGuestStrengthForClient(typedCreatedPlayer, canManageClub({ role, isPowerUser })),
  });
}