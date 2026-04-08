"use server";

import { createClient } from "@/lib/supabase/server";

export type ProfileState = {
  error: string;
  success: string;
};

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function updateProfileAction(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const firstName = normalizeText(formData.get("first_name"));
  const lastName = normalizeText(formData.get("last_name"));
  const nickname = normalizeText(formData.get("nickname"));
  const email = normalizeText(formData.get("email")).toLowerCase();

  if (!firstName || !lastName) {
    return {
      error: "Vorname und Nachname sind erforderlich.",
      success: "",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: "Du musst eingeloggt sein.",
      success: "",
    };
  }

  const { data: existingPlayer, error: playerLoadError } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_guest", false)
    .maybeSingle();

  if (playerLoadError) {
    return {
      error: "Spielerprofil konnte nicht geladen werden.",
      success: "",
    };
  }

  if (existingPlayer) {
    const { error: playerUpdateError } = await supabase
      .from("players")
      .update({
        first_name: firstName,
        last_name: lastName,
        nickname: nickname || null,
        email: email || user.email || null,
      })
      .eq("id", existingPlayer.id);

    if (playerUpdateError) {
      return {
        error: "Profil konnte nicht aktualisiert werden.",
        success: "",
      };
    }
  } else {
    const { error: playerInsertError } = await supabase.from("players").insert({
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      nickname: nickname || null,
      email: email || user.email || null,
      is_guest: false,
      is_active: true,
    });

    if (playerInsertError) {
      return {
        error: "Profil konnte nicht angelegt werden.",
        success: "",
      };
    }
  }

  if (email && email !== (user.email ?? "").toLowerCase()) {
    const { error: emailUpdateError } = await supabase.auth.updateUser({
      email,
    });

    if (emailUpdateError) {
      return {
        error:
          "Profil gespeichert, aber die E-Mail-Adresse konnte nicht geändert werden.",
        success: "",
      };
    }
  }

  return {
    error: "",
    success: "Profil erfolgreich gespeichert.",
  };
}