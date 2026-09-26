"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerI18n } from "@/lib/i18n/server";

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
  const { t } = await getServerI18n();
  const firstName = normalizeText(formData.get("first_name"));
  const lastName = normalizeText(formData.get("last_name"));
  const nickname = normalizeText(formData.get("nickname"));
  const email = normalizeText(formData.get("email")).toLowerCase();

  if (!firstName || !lastName) {
    return {
      error: t("profileAction.nameRequired"),
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
      error: t("profileAction.signInRequired"),
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
      error: t("profileAction.playerLoadFailed"),
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
        error: t("profileAction.updateFailed"),
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
        error: t("profileAction.createFailed"),
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
          t("profileAction.emailUpdateFailed"),
        success: "",
      };
    }
  }

  return {
    error: "",
    success: t("profileAction.saved"),
  };
}