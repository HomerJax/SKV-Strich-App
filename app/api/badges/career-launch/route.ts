import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CAREER_BADGE_ORDER = [
  "career_appearances_10",
  "career_appearances_25",
  "career_appearances_50",
  "career_appearances_100",
  "career_appearances_250",
  "career_appearances_500",
  "career_wins_1",
  "career_wins_10",
  "career_wins_25",
  "career_wins_50",
  "career_wins_100",
  "career_wins_250",
] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: notification, error: notificationError } = await supabase
    .from("user_notifications")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "career_badges_launch")
    .is("seen_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: number }>();

  if (notificationError) {
    return NextResponse.json({ error: notificationError.message }, { status: 500 });
  }

  if (!notification) {
    return NextResponse.json({ launch: null });
  }

  const { data: players, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id);

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 });
  }

  const playerIds = (players ?? []).map((player) => player.id as number);
  let badgeKeys: string[] = [];

  if (playerIds.length > 0) {
    const { data: achievements, error: achievementError } = await supabase
      .from("player_achievements")
      .select("badge_key")
      .in("player_id", playerIds)
      .like("badge_key", "career_%");

    if (achievementError) {
      return NextResponse.json({ error: achievementError.message }, { status: 500 });
    }

    const earned = new Set((achievements ?? []).map((row) => String(row.badge_key)));
    badgeKeys = CAREER_BADGE_ORDER.filter((key) => earned.has(key));
  }

  return NextResponse.json({
    launch: {
      notificationId: notification.id,
      badgeKeys,
    },
  });
}
