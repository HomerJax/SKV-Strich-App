import { createClient } from "@/lib/supabase/browser";

type PlayerRow = {
  id: number | string;
};

type MembershipRow = {
  club_id: string;
};

export async function getPostLoginRoute() {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { route: "/login", activeClubId: null as string | null };
  }

  const { data: playerData, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (playerError) {
    return { route: "/onboarding", activeClubId: null as string | null };
  }

  const player = (playerData ?? null) as PlayerRow | null;

  if (!player) {
    return { route: "/onboarding", activeClubId: null as string | null };
  }

  const { data: membershipsData, error: membershipsError } = await supabase
    .from("club_memberships")
    .select("club_id")
    .eq("user_id", user.id);

  if (membershipsError) {
    return { route: "/waiting-for-invite", activeClubId: null as string | null };
  }

  const clubIds = Array.from(
    new Set(
      ((membershipsData ?? []) as MembershipRow[])
        .map((entry) => entry.club_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  if (clubIds.length === 0) {
    return { route: "/waiting-for-invite", activeClubId: null as string | null };
  }

  if (clubIds.length === 1) {
    return { route: "/", activeClubId: clubIds[0] };
  }

  return { route: "/select-club", activeClubId: null as string | null };
}