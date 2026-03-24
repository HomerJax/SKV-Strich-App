"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function saveOnboardingAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("saveOnboardingAction:getUser failed", userError);
    redirect("/login");
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const nicknameRaw = String(formData.get("nickname") ?? "").trim();
  const nickname = nicknameRaw.length ? nicknameRaw : null;

  if (!firstName || !lastName) {
    redirect("/onboarding?error=missing-fields");
  }

  const fullName = `${firstName} ${lastName}`.trim();

  const basePayload = {
    email: user.email ?? null,
    first_name: firstName,
    last_name: lastName,
    nickname,
    name: fullName,
    is_guest: false,
  };

  const { data: existingPlayer, error: existingPlayerError } = await adminClient
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingPlayerError) {
    console.error("saveOnboardingAction:select existing player failed", {
      message: existingPlayerError.message,
      details: existingPlayerError.details,
      hint: existingPlayerError.hint,
      code: existingPlayerError.code,
    });

    redirect(
      `/onboarding?error=save-failed&detail=${encodeURIComponent(
        existingPlayerError.message || "unknown"
      )}`
    );
  }

  if (existingPlayer?.id) {
    const { error: updateError } = await adminClient
      .from("players")
      .update(basePayload)
      .eq("id", existingPlayer.id);

    if (updateError) {
      console.error("saveOnboardingAction:update failed", {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
      });

      redirect(
        `/onboarding?error=save-failed&detail=${encodeURIComponent(
          updateError.message || "unknown"
        )}`
      );
    }
  } else {
    const insertPayload = {
      user_id: user.id,
      ...basePayload,
    };

    const { error: insertError } = await adminClient
      .from("players")
      .insert(insertPayload);

    if (insertError) {
      console.error("saveOnboardingAction:insert failed", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });

      redirect(
        `/onboarding?error=save-failed&detail=${encodeURIComponent(
          insertError.message || "unknown"
        )}`
      );
    }
  }

  redirect("/club-setup");
}