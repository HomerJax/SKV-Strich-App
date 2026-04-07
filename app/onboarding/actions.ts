"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = {
  error: string;
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

export async function completeOnboarding(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient();

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
  const intention = toText(formData.get("intention"));
  const clubName = toText(formData.get("clubName"));
  const next = normalizeNext(formData.get("next"));

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

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  const { data: existingPlayers, error: existingPlayerError } = await supabase
    .from("players")
    .select("id, club_id, user_id, email")
    .eq("user_id", user.id)
    .limit(5);

  if (existingPlayerError) {
    return {
      error: `Spielerprofil konnte nicht geladen werden: ${existingPlayerError.message}`,
    };
  }

  const existingPlayer =
    Array.isArray(existingPlayers) && existingPlayers.length > 0
      ? existingPlayers[0]
      : null;

  if (Array.isArray(existingPlayers) && existingPlayers.length > 1) {
    return {
      error:
        "Für diesen Benutzer existieren mehrere Spielerprofile. Bitte bereinige die doppelten Player-Datensätze in Supabase.",
    };
  }

  if (intention === "wait-for-invite") {
    if (!existingPlayer) {
      const { error: insertPlayerError } = await supabase.from("players").insert({
        user_id: user.id,
        club_id: null,
        first_name: firstName,
        last_name: lastName,
        nickname: nickname || null,
        name: fullName,
        email: user.email ?? null,
        is_guest: false,
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
        })
        .eq("id", existingPlayer.id);

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

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .insert({
      name: clubName,
      display_name: clubName,
    })
    .select("id")
    .single();

  if (clubError || !club) {
    return {
      error: clubError?.message || "Team konnte nicht erstellt werden.",
    };
  }

  if (!existingPlayer) {
    const { error: insertPlayerError } = await supabase.from("players").insert({
      user_id: user.id,
      club_id: club.id,
      first_name: firstName,
      last_name: lastName,
      nickname: nickname || null,
      name: fullName,
      email: user.email ?? null,
      is_guest: false,
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
        club_id: club.id,
        first_name: firstName,
        last_name: lastName,
        nickname: nickname || null,
        name: fullName,
        email: user.email ?? null,
        is_guest: false,
      })
      .eq("id", existingPlayer.id);

    if (updatePlayerError) {
      return {
        error:
          updatePlayerError.message ||
          "Spielerprofil konnte nicht aktualisiert werden.",
      };
    }
  }

  const { error: membershipError } = await supabase.from("club_memberships").insert({
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

  const { error: settingsError } = await supabase.from("club_settings").insert({
    club_id: club.id,
  });

  if (settingsError) {
    return {
      error:
        settingsError.message ||
        "Team-Einstellungen konnten nicht erstellt werden.",
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

  redirect("/");
}