import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AUTH_ROUTES } from "@/lib/auth/routes";

type MembershipRow = {
  id: number;
  club_id: string;
  user_id: string;
  role: string | null;
};

export async function POST(request: Request) {
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    redirect(`/login?error=missing-fields&email=${encodeURIComponent(email)}`);
  }

  const supabase = await createClient();

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError || !signInData.user) {
    redirect(
      `/login?error=invalid-credentials&email=${encodeURIComponent(email)}`
    );
  }

  const user = signInData.user;

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, user_id, first_name, last_name, nickname")
    .eq("user_id", user.id)
    .maybeSingle();

  if (playerError) {
    redirect(
      `/login?error=${encodeURIComponent(
        `player-load-failed:${playerError.message}`
      )}&email=${encodeURIComponent(email)}`
    );
  }

  if (!player) {
    redirect(AUTH_ROUTES.onboarding);
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("club_memberships")
    .select("id, club_id, user_id, role")
    .eq("user_id", user.id);

  if (membershipsError) {
    redirect(
      `/login?error=${encodeURIComponent(
        `membership-load-failed:${membershipsError.message}`
      )}&email=${encodeURIComponent(email)}`
    );
  }

  const normalizedMemberships = (memberships ?? []) as MembershipRow[];

  if (!normalizedMemberships.length) {
    redirect(AUTH_ROUTES.waitingForInvite);
  }

  const cookieStore = await cookies();

  if (normalizedMemberships.length === 1) {
    cookieStore.set("active_club_id", normalizedMemberships[0].club_id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
      secure: true,
    });

    redirect(AUTH_ROUTES.dashboard);
  }

  const existingActiveClubId = cookieStore.get("active_club_id")?.value ?? null;

  const hasExistingMembership = existingActiveClubId
    ? normalizedMemberships.some(
        (membership) => membership.club_id === existingActiveClubId
      )
    : false;

  if (hasExistingMembership && existingActiveClubId) {
    cookieStore.set("active_club_id", existingActiveClubId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
      secure: true,
    });

    redirect(AUTH_ROUTES.dashboard);
  }

  redirect(AUTH_ROUTES.selectClub);
}