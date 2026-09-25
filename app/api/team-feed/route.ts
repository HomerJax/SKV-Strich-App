import { NextRequest, NextResponse } from "next/server";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getTeamFeedItems } from "@/lib/team-feed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { clubId } = await requireClub();
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("club_settings")
    .select("home_team_feed_enabled")
    .eq("club_id", clubId)
    .maybeSingle<{ home_team_feed_enabled: boolean | null }>();

  if (settings?.home_team_feed_enabled !== true) {
    return NextResponse.json({ items: [], nextOffset: null, hasMore: false });
  }

  const offsetParam = Number(request.nextUrl.searchParams.get("offset") ?? "0");
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "8");
  const offset =
    Number.isInteger(offsetParam) && offsetParam >= 0 ? offsetParam : 0;
  const limit =
    Number.isInteger(limitParam) && limitParam > 0
      ? Math.min(limitParam, 20)
      : 8;

  const allItems = await getTeamFeedItems(clubId, offset + limit + 1);
  const items = allItems.slice(offset, offset + limit);
  const hasMore = allItems.length > offset + items.length;

  return NextResponse.json({
    items,
    hasMore,
    nextOffset: hasMore ? offset + items.length : null,
  });
}
