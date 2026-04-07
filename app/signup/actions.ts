"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";

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

  const ctx = await getAuthContext();

  if (!ctx.user) {
    return { error: "session-not-ready" };
  }

  const cookieStore = await cookies();

  if (ctx.activeClubId) {
    cookieStore.set("active_club_id", ctx.activeClubId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
    });
  }

  if (next) {
    redirect(next);
  }

  if (!ctx.player) {
    redirect(AUTH_ROUTES.onboarding);
  }

  if (!ctx.memberships.length) {
    redirect(AUTH_ROUTES.waitingForInvite);
  }

  if (!ctx.activeClubId) {
    redirect(AUTH_ROUTES.selectClub);
  }

  cookieStore.set("active_club_id", ctx.activeClubId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });

  redirect(AUTH_ROUTES.dashboard);
}