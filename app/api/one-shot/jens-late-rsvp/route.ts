import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendClubPush } from "@/lib/push/club-events";

export const runtime = "nodejs";

const CLUB_ID = "108590d9-0877-4787-90a5-4679615b3b76";
const FEED_ID = "late-rsvp:883:14:team-push";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("team_feed_push_events")
    .select("id")
    .eq("club_id", CLUB_ID)
    .eq("feed_id", FEED_ID)
    .maybeSingle();

  if (existing) return NextResponse.json({ ok: true, skipped: true, reason: "already-sent" });

  const result = await sendClubPush({
    clubId: CLUB_ID,
    title: "⏰ Jens ist doch noch dabei!",
    body: "Schön, dass du’s noch geschafft hast. 😄 Danke auch für deinen 1 € FBZG – die Mannschaftskasse freut sich. 🍻",
    url: "/sessions/883",
    preference: "announcements",
  });

  if (result.sent > 0) {
    const { error } = await supabase.from("team_feed_push_events").insert({
      club_id: CLUB_ID,
      feed_id: FEED_ID,
    });
    if (error) return NextResponse.json({ error: error.message, push: result }, { status: 500 });
  }

  return NextResponse.json({ ok: true, push: result });
}
