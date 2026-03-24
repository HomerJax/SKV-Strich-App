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

  const { error } = await supabase.from("players").upsert(
    {
      user_id: user.id,
      email: user.email ?? null,
      first_name: firstName,
      last_name: lastName,
      nickname,
      name: fullName,
      is_guest: false,
    },
    {
      onConflict: "user_id",
    }
  );

  if (error) {
    redirect("/onboarding?error=save-failed");
  }

  redirect("/club-setup");
}