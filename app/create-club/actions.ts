"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export type CreateClubState = {
  error: string;
};

type ExistingPlayerSeed = {
  id: number;
  club_id: string | null;
  user_id: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
  preferred_position: "attack" | "defense" | "goalkeeper" | null;
  category_key: string | null;
  strength: number | null;
  is_active: boolean | null;
  age_group: string | null;
};

function normalizeClubName(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function pickProfileSeed(
  profiles: ExistingPlayerSeed[],
  userEmail: string | null | undefined
) {
  const withNames = profiles.find(
    (profile) =>
      Boolean(profile.nickname?.trim()) ||
      Boolean(profile.first_name?.trim()) ||
      Boolean(profile.last_name?.trim()) ||
      Boolean(profile.name?.trim())
  );

  if (withNames) return withNames;
  if (profiles.length > 0) return profiles[0];

  return {
    id: -1,
    club_id: null,
    user_id: null,
    name: null,
    first_name: null,
    last_name: null,
    nickname: null,
    email: userEmail ?? null,
    preferred_position: null,
    category_key: null,
    strength: null,
    is_active: true,
    age_group: null,
  } satisfies ExistingPlayerSeed;
}

function buildDisplayName(
  seed: ExistingPlayerSeed,
  userEmail: string | null | undefined
) {
  const fullName = [seed.first_name?.trim(), seed.last_name?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    seed.nickname?.trim() ||
    seed.name?.trim() ||
    seed.email?.trim() ||
    userEmail?.split("@")[0]?.trim() ||
    "Spieler"
  );
}

export async function createClubAction(
  _prevState: CreateClubState,
  formData: FormData
): Promise<CreateClubState> {
  const clubName = normalizeClubName(formData.get("name"));

  if (!clubName) {
    return { error: "missing-name" };
  }

  if (clubName.length < 2) {
    return { error: "name-too-short" };
  }

  const supabase = await createClient();
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "not-authenticated" };
  }

  const { data: existingProfilesData, error: existingProfilesError } =
    await adminSupabase
      .from("players")
      .select(
        "id, club_id, user_id, name, first_name, last_name, nickname, email, preferred_position, category_key, strength, is_active, age_group"
      )
      .eq("user_id", user.id)
      .eq("is_guest", false);

  if (existingProfilesError) {
    return { error: "player-seed-load-failed" };
  }

  const existingProfiles = (existingProfilesData ?? []) as ExistingPlayerSeed[];

  const { data: club, error: clubError } = await adminSupabase
    .from("clubs")
    .insert({
      name: clubName,
      display_name: clubName,
      sport_type: "football",
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (clubError || !club) {
    return { error: "club-create-failed" };
  }

  const { error: membershipError } = await adminSupabase
    .from("club_memberships")
    .insert({
      club_id: club.id,
      user_id: user.id,
      role: "admin",
    });

  if (membershipError) {
    return { error: "membership-create-failed" };
  }

  const { error: settingsError } = await adminSupabase
    .from("club_settings")
    .insert({
      club_id: club.id,
    });

  if (settingsError) {
    return { error: "settings-create-failed" };
  }

  const { error: billingError } = await adminSupabase
    .from("club_billing")
    .upsert(
      {
        club_id: club.id,
        plan_key: "free",
        status: "active",
        trial_ends_at: null,
        pro_ends_at: null,
        billing_note: "Automatisch beim Club-Erstellen als Free angelegt.",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "club_id",
      }
    );

  if (billingError) {
    return { error: "billing-create-failed" };
  }

  const existingPlayerInTargetClub = existingProfiles.find(
    (profile) => profile.club_id === club.id
  );

  if (!existingPlayerInTargetClub) {
    const seed = pickProfileSeed(existingProfiles, user.email ?? null);
    const displayName = buildDisplayName(seed, user.email ?? null);

    const { error: playerInsertError } = await adminSupabase
      .from("players")
      .insert({
        user_id: user.id,
        club_id: club.id,
        name: displayName,
        first_name: seed.first_name?.trim() || null,
        last_name: seed.last_name?.trim() || null,
        nickname: seed.nickname?.trim() || null,
        email: seed.email?.trim() || user.email || null,
        preferred_position: seed.preferred_position ?? null,
        category_key: null,
        strength: seed.strength ?? null,
        is_guest: false,
        is_active: seed.is_active ?? true,
        age_group: seed.age_group ?? null,
      });

    if (playerInsertError) {
      return { error: "player-create-failed" };
    }
  }

  const cookieStore = await cookies();

  cookieStore.set("active_club_id", club.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/club-setup?created=1");
}