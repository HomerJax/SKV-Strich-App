import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export type AppGateResult = {
  user: {
    id: string;
    email?: string | null;
  };
  player: {
    id: number | string;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    nickname: string | null;
    name: string | null;
    club_id?: string | null;
  } | null;
  memberships: Array<{
    club_id: string;
    role: "admin" | "member";
  }>;
  activeClubId: string | null;
};

export async function requireAppAccess(
  options?: {
    allowOnboarding?: boolean;
    allowClubSetup?: boolean;
    allowSelectClub?: boolean;
  }
): Promise<AppGateResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: player, error: playerError } = await adminClient
    .from("players")
    .select("id, user_id, first_name, last_name, nickname, name, club_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (playerError) {
    throw new Error("Spielerprofil konnte nicht geladen werden.");
  }

  if (!player && !options?.allowOnboarding) {
    redirect("/onboarding");
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id);

  if (membershipsError) {
    throw new Error("Mitgliedschaften konnten nicht geladen werden.");
  }

  const clubList = memberships ?? [];

  const cookieStore = await cookies();
  const activeClubId = cookieStore.get("active_club_id")?.value ?? null;

  if (player && clubList.length === 0 && !options?.allowClubSetup) {
    redirect("/club-setup");
  }

  if (player && clubList.length > 1) {
    const hasValidActiveClub =
      !!activeClubId && clubList.some((m) => m.club_id === activeClubId);

    if (!hasValidActiveClub && !options?.allowSelectClub) {
      redirect("/select-club");
    }
  }

  if (player && clubList.length === 1) {
    const onlyClubId = clubList[0].club_id;

    if (activeClubId !== onlyClubId) {
      cookieStore.set("active_club_id", onlyClubId, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    player: player ?? null,
    memberships: clubList,
    activeClubId:
      clubList.length === 1 ? clubList[0].club_id : activeClubId ?? null,
  };
}