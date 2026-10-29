"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recordGrowthEvent } from "@/lib/analytics/growth-funnel";
import { hasNewAuthIdentity } from "@/lib/analytics/growth-funnel-guards";

export type SignupState = {
  error: string;
};

function normalizeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "").trim();

  if (!next) return "";
  if (!next.startsWith("/")) return "";
  if (next.startsWith("//")) return "";

  return next;
}

export async function signupAction(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const next = normalizeNext(formData.get("next"));

  if (!email || !password || !passwordConfirm) {
    return { error: "missing-fields" };
  }

  if (password !== passwordConfirm) {
    return { error: "password-mismatch" };
  }

  if (password.length < 8) {
    return { error: "password-too-short" };
  }

  const supabase = await createClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    const message = signUpError.message.toLowerCase();

    if (
      message.includes("already registered") ||
      message.includes("already been registered") ||
      message.includes("user already registered")
    ) {
      return { error: "email-already-used" };
    }

    return { error: "signup-failed" };
  }

  if (!signUpData.user) {
    return { error: "signup-failed" };
  }

  // This milestone means a new Supabase Auth identity was created. It does not
  // imply that email confirmation or the first usable login has completed.
  // Supabase may return an empty identities array for an existing email to
  // avoid account enumeration; do not count that as a new registration.
  if (hasNewAuthIdentity(signUpData.user.identities)) {
    await recordGrowthEvent("registration_completed");
  }

  try {
    await supabase.rpc("link_existing_player_by_email", {
      user_email: email,
    });
  } catch {
    // unkritisch
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: "login-after-signup-failed" };
  }

  if (/^\/organization\/new-team\/[a-f0-9]{64}$/.test(next)) {
    // This invite provisions a fresh player and team admin atomically. Do not
    // force the generic onboarding to create an unrelated club first.
    redirect(next);
  }
  if (next) {
    redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  }

  redirect("/onboarding");
}
