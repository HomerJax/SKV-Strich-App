"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const payload = {
    user_id: user.id,
    email: user.email ?? null,
    first_name: firstName,
    last_name: lastName,
    nickname,
    name: fullName,
    is_guest: false,
  };

  console.log("saveOnboardingAction:payload", payload);

  const { data, error } = await supabase
    .from("players")
    .upsert(payload, {
      onConflict: "user_id",
    })
    .select();

  if (error) {
    console.error("saveOnboardingAction:upsert failed", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });

    redirect(
      `/onboarding?error=save-failed&detail=${encodeURIComponent(
        error.message || "unknown"
      )}`
    );
  }

  console.log("saveOnboardingAction:upsert ok", data);

  redirect("/club-setup");
}