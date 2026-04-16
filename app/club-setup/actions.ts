"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

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

function buildDisplayName(seed: ExistingPlayerSeed, userEmail: string | null | undefined) {
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

export async function createClubAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!displayName) {
    redirect("/club-setup?error=missing-name");
  }

  const { data: existingProfilesData, error: existingProfilesError } =
    await adminClient
      .from("players")
      .select(
        "id, club_id, user_id, name, first_name, last_name, nickname, email, preferred_position, category_key, strength, is_active, age_group"
      )
      .eq("user_id", user.id)
      .eq("is_guest", false);

  if (existingProfilesError) {
    throw new Error("Spielerprofile konnten nicht geladen werden.");
  }

  const existingProfiles = (existingProfilesData ?? []) as ExistingPlayerSeed[];

  const { data: createdClub, error: clubError } = await adminClient
    .from("clubs")
    .insert({
      name: displayName,
      display_name: displayName,
    })
    .select("id")
    .single();

  if (clubError || !createdClub?.id) {
    redirect("/club-setup?error=club-create-failed");
  }

  const clubId = String(createdClub.id);

  const { error: membershipError } = await adminClient
    .from("club_memberships")
    .insert({
      user_id: user.id,
      club_id: clubId,
      role: "admin",
    });

  if (membershipError) {
    redirect("/club-setup?error=membership-create-failed");
  }

  const { error: settingsError } = await adminClient
    .from("club_settings")
    .insert({
      club_id: clubId,
    });

  if (settingsError) {
    redirect("/club-setup?error=settings-create-failed");
  }

  const existingPlayerInTargetClub = existingProfiles.find(
    (profile) => profile.club_id === clubId
  );

  if (!existingPlayerInTargetClub) {
    const seed = pickProfileSeed(existingProfiles, user.email ?? null);
    const displayNameForPlayer = buildDisplayName(seed, user.email ?? null);

    const { error: playerInsertError } = await adminClient.from("players").insert({
      user_id: user.id,
      club_id: clubId,
      name: displayNameForPlayer,
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
      redirect("/club-setup?error=player-create-failed");
    }
  }

  const cookieStore = await cookies();
  cookieStore.set("active_club_id", clubId, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/");
}