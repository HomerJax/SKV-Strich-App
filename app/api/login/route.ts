import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export async function POST(request: Request) {
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    redirect("/login?error=missing-fields&email=" + encodeURIComponent(email));
  }

  const supabase = await createClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    redirect("/login?error=invalid-credentials&email=" + encodeURIComponent(email));
  }

  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect("/login?error=session-not-ready&email=" + encodeURIComponent(email));
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