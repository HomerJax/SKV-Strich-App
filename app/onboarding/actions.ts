"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { ensureDefaultSeasonForClub } from "@/lib/seasons/default-season";

export type OnboardingState = {
  error: string;
};

type ExistingPlayerRow = {
  id: number;
  club_id: string | null;
  user_id: string | null;
  email: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  preferred_position: "attack" | "defense" | "goalkeeper" | null;
  category_key: string | null;
  strength: number | null;
  is_active: boolean | null;
  age_group: string | null;
};

function toText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function normalizeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "").trim();

  if (!next) return "";
  if (!next.startsWith("/")) return "";
  if (next.startsWith("//")) return "";

  return next;
}

function isInviteJoinNext(next: string) {
  return next.startsWith("/join?token=");
}

function pickProfileSeed(
  profiles: ExistingPlayerRow[],
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
    email: userEmail ?? null,
    name: null,
    first_name: null,
    last_name: null,
    nickname: null,
    preferred_position: null,
    category_key: null,
    strength: null,
    is_active: true,
    age_group: null,
  } satisfies ExistingPlayerRow;
}

function buildDisplayName(
  firstName: string,
  lastName: string,
  nickname: string,
  fallbackEmail: string | null | undefined
) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return (
    fullName ||
    nickname.trim() ||
    fallbackEmail?.split("@")[0]?.trim() ||
    "Spieler"
  );
}

export async function completeOnboarding(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: "Deine Anmeldung ist nicht mehr gültig. Bitte logge dich erneut ein.",
    };
  }

  const firstName = toText(formData.get("firstName"));
  const lastName = toText(formData.get("lastName"));
  const nickname = toText(formData.get("nickname"));
  const rawIntention = toText(formData.get("intention"));
  const clubName = toText(formData.get("clubName"));
  const next = normalizeNext(formData.get("next"));

  const inviteFlow = isInviteJoinNext(next);
  const intention = inviteFlow ? "wait-for-invite" : rawIntention;

  if (!firstName || !lastName) {
    return {
      error: "Bitte gib Vorname und Nachname ein.",
    };
  }

  if (intention !== "create-team" && intention !== "wait-for-invite") {
    return {
      error: "Bitte wähle aus, wie du starten möchtest.",
    };
  }

  if (intention === "create-team" && !clubName) {
    return {
      error: "Bitte gib einen Teamnamen ein.",
    };
  }

  const fullName = buildDisplayName(firstName, lastName, nickname, user.email ?? null);

  const { data: existingPlayersData, error: existingPlayerError } = await supabase
    .from("players")
    .select(
      "id, club_id, user_id, email, name, first_name, last_name, nickname, preferred_position, category_key, strength, is_active, age_group"
    )
    .eq("user_id", user.id)
    .eq("is_guest", false)
    .limit(20);

  if (existingPlayerError) {
    return {
      error: `Spielerprofil konnte nicht geladen werden: ${existingPlayerError.message}`,
    };
  }

  const existingPlayers = (existingPlayersData ?? []) as ExistingPlayerRow[];

  if (intention === "wait-for-invite") {
    const profileWithoutClub =
      existingPlayers.find((player) => player.club_id === null) ?? null;

    if (!profileWithoutClub) {
      const { error: insertPlayerError } = await supabase.from("players").insert({
        user_id: user.id,
        club_id: null,
        first_name: firstName,
        last_name: lastName,
        nickname: nickname || null,
        name: fullName,
        email: user.email ?? null,
        is_guest: false,
        is_active: true,
      });

      if (insertPlayerError) {
        return {
          error:
            insertPlayerError.message ||
            "Spielerprofil konnte nicht erstellt werden.",
        };
      }
    } else {
      const { error: updatePlayerError } = await supabase
        .from("players")
        .update({
          first_name: firstName,
          last_name: lastName,
          nickname: nickname || null,
          name: fullName,
          email: user.email ?? null,
          is_guest: false,
          is_active: true,
        })
        .eq("id", profileWithoutClub.id);

      if (updatePlayerError) {
        return {
          error:
            updatePlayerError.message ||
            "Spielerprofil konnte nicht aktualisiert werden.",
        };
      }
    }

    if (next) {
      redirect(next);
    }

    redirect("/waiting-for-invite");
  }

  const { data: club, error: clubError } = await adminSupabase
    .from("clubs")
    .insert({
      name: clubName,
      display_name: clubName,
    })
    .select("id")
    .single<{ id: string }>();

  if (clubError || !club) {
    return {
      error: clubError?.message || "Team konnte nicht erstellt werden.",
    };
  }

  const existingPlayerInTargetClub = existingPlayers.find(
    (player) => player.club_id === club.id
  );

  if (!existingPlayerInTargetClub) {
    const seed = pickProfileSeed(existingPlayers, user.email ?? null);

    const { error: insertPlayerError } = await supabase.from("players").insert({
      user_id: user.id,
      club_id: club.id,
      first_name: firstName,
      last_name: lastName,
      nickname: nickname || null,
      name: fullName,
      email: seed.email ?? user.email ?? null,
      preferred_position: seed.preferred_position ?? null,
      category_key: null,
      strength: seed.strength ?? null,
      is_guest: false,
      is_active: seed.is_active ?? true,
      age_group: seed.age_group ?? null,
    });

    if (insertPlayerError) {
      return {
        error:
          insertPlayerError.message ||
          "Spielerprofil konnte nicht erstellt werden.",
      };
    }
  }

  const { error: membershipError } = await adminSupabase
    .from("club_memberships")
    .insert({
      user_id: user.id,
      club_id: club.id,
      role: "admin",
    });

  if (membershipError) {
    return {
      error:
        membershipError.message || "Mitgliedschaft konnte nicht erstellt werden.",
    };
  }

  const { error: settingsError } = await adminSupabase
    .from("club_settings")
    .insert({
      club_id: club.id,
    });

  if (settingsError) {
    return {
      error:
        settingsError.message ||
        "Team-Einstellungen konnten nicht erstellt werden.",
    };
  }

  const { error: defaultSeasonError } = await ensureDefaultSeasonForClub(
    adminSupabase,
    club.id
  );

  if (defaultSeasonError) {
    return {
      error:
        defaultSeasonError ||
        "Standard-Saison konnte nicht für das Team erstellt werden.",
    };
  }

  const { error: billingError } = await adminSupabase
    .from("club_billing")
    .upsert(
      {
        club_id: club.id,
        plan_key: "supercup_trial",
        status: "active",
        trial_ends_at: "2026-07-31T21:59:59.000Z",
        pro_ends_at: "2026-07-31T21:59:59.000Z",
        billing_note:
          "Automatisch beim Onboarding als Supercup Trial bis Ende Juli angelegt.",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "club_id",
      }
    );

  if (billingError) {
    return {
      error:
        billingError.message ||
        "Billing konnte nicht für das Team erstellt werden.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set("active_club_id", club.id, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/club-setup?created=1");
}