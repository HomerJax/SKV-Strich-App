import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppGateResult = {
  user: any;
  player: {
    id: number;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    nickname: string | null;
    name: string | null;
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

  const { data: player } = await supabase
    .from("players")
    .select("id, user_id, first_name, last_name, nickname, name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!player && !options?.allowOnboarding) {
    redirect("/onboarding");
  }

  const { data: memberships } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id);

  const clubList = memberships ?? [];

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const activeClubId = cookieStore.get("active_club_id")?.value ?? null;

  if (player && clubList.length === 0 && !options?.allowClubSetup) {
    redirect("/club-setup");
  }

  if (player && clubList.length > 1) {
    const hasValidActiveClub =
      activeClubId && clubList.some((m) => m.club_id === activeClubId);

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
        path: "/",
      });
    }
  }

  return {
    user,
    player: player ?? null,
    memberships: clubList,
    activeClubId,
  };
}