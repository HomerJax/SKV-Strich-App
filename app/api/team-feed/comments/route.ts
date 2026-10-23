import { NextRequest, NextResponse } from "next/server";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamFeedItems } from "@/lib/team-feed";

export const dynamic = "force-dynamic";

const feedPattern = /^(badge:[0-9a-zA-Z-]+|result:\d+|birthday:[0-9:-]+|beer:[0-9:-]+|late-rsvp:\d+)$/;

async function validFeed(clubId: string, feedId: string) {
  if (feedId.length > 160 || !feedPattern.test(feedId)) return false;
  const items = await getTeamFeedItems(clubId, 120);
  return items.some((item) => item.id === feedId);
}

export async function GET(request: NextRequest) {
  const { clubId, user } = await requireClub();
  const feedId = request.nextUrl.searchParams.get("feedId")?.trim() ?? "";
  if (!feedId || !feedPattern.test(feedId)) {
    return NextResponse.json({ error: "Ungültige Meldung" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("team_feed_comments")
    .select("user_id,body,created_at,updated_at")
    .eq("club_id", clubId).eq("feed_id", feedId).order("created_at");
  if (error) return NextResponse.json({ error: "Kommentare konnten nicht geladen werden." }, { status: 500 });
  const ids = [...new Set((data ?? []).map((row) => row.user_id))];
  const admin = createAdminClient();
  const { data: players } = ids.length
    ? await admin.from("players").select("user_id,first_name,last_name")
        .eq("club_id", clubId).in("user_id", ids)
    : { data: [] as { user_id: string | null; first_name: string | null; last_name: string | null }[] };
  const names = new Map((players ?? []).map((p) => [p.user_id, [p.first_name,p.last_name].filter(Boolean).join(" ")]));
  return NextResponse.json({
    myUserId: user.id,
    comments: (data ?? []).map((row) => ({
      userId: row.user_id, name: names.get(row.user_id) || "Mitspieler",
      body: row.body, createdAt: row.created_at, updatedAt: row.updated_at,
      mine: row.user_id === user.id,
    })),
  });
}

export async function POST(request: NextRequest) {
  const { clubId, user } = await requireClub();
  const body = await request.json().catch(() => null) as { feedId?: string; text?: string; action?: string } | null;
  const feedId = body?.feedId?.trim() ?? "";
  if (!await validFeed(clubId,feedId)) return NextResponse.json({ error: "Meldung nicht gefunden." }, { status: 400 });
  const admin = createAdminClient();
  if (body?.action === "delete") {
    const { error } = await admin.from("team_feed_comments").delete()
      .eq("club_id",clubId).eq("feed_id",feedId).eq("user_id",user.id);
    return error ? NextResponse.json({ error: "Löschen fehlgeschlagen." }, { status: 500 })
      : NextResponse.json({ ok:true });
  }
  const text = body?.text?.trim() ?? "";
  if (!text || text.length > 200) return NextResponse.json({error:"Maximal 200 Zeichen."},{status:400});
  const { error } = await admin.from("team_feed_comments").upsert(
    { club_id:clubId,feed_id:feedId,user_id:user.id,body:text,updated_at:new Date().toISOString() },
    { onConflict:"club_id,feed_id,user_id" }
  );
  return error ? NextResponse.json({error:"Kommentar konnte nicht gespeichert werden."},{status:500})
    : NextResponse.json({ok:true});
}
