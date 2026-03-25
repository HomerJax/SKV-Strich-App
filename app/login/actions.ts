"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export type LoginState = {
  error: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return { error: "missing-fields" };
  }

  const supabase = await createClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: "invalid-credentials" };
  }

  const ctx = await getAuthContext();

  if (!ctx.user) {
    return { error: "session-not-ready" };
  }

  const cookieStore = await cookies();

  if (!ctx.player) {
    redirect(AUTH_ROUTES.onboarding);
  }

  if (!ctx.memberships.length) {
    redirect(AUTH_ROUTES.selectClub);
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