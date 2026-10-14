import { NextRequest, NextResponse } from "next/server";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/send-push";

const allowed = new Set(["prost","biermaschine","maschine","laeuft","glueckwunsch","kischde","herz","daumen_hoch","geilo"]);

export async function POST(request: NextRequest) {
  const { user, clubId } = await requireClub();
  const body = await request.json().catch(() => null) as { feedId?: string; reaction?: string } | null;
  const feedId = body?.feedId?.trim();
  const reaction = body?.reaction?.trim();
  if (!feedId || !reaction || !allowed.has(reaction) || (!feedId.startsWith("beer:") && !feedId.startsWith("birthday:"))) {
    return NextResponse.json({ error: "invalid_reaction" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: existingRows, error: existingError } = await supabase
    .from("team_feed_reactions")
    .select("id,reaction")
    .eq("club_id", clubId)
    .eq("feed_id", feedId)
    .eq("user_id", user.id);

  if (existingError) {
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  const alreadyActive = (existingRows ?? []).some((row) => row.reaction === reaction);

  if ((existingRows ?? []).length > 0) {
    const { error: deleteError } = await supabase
      .from("team_feed_reactions")
      .delete()
      .eq("club_id", clubId)
      .eq("feed_id", feedId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }
  }

  if (alreadyActive) {
    return NextResponse.json({ active: false, reaction: null });
  }

  const { error: insertError } = await supabase
    .from("team_feed_reactions")
    .insert({ club_id: clubId, feed_id: feedId, user_id: user.id, reaction });

  if (insertError) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  if (feedId.startsWith("beer:") && reaction === "biermaschine") {
    const admin = createAdminClient();
    const { count } = await admin
      .from("team_feed_reactions")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("feed_id", feedId)
      .eq("reaction", reaction);

    if ((count ?? 0) >= 3) {
      const playerId = Number(feedId.split(":")[2]);
      if (Number.isFinite(playerId)) {
        const { data: player } = await admin
          .from("players")
          .select("user_id, nickname, first_name")
          .eq("club_id", clubId)
          .eq("id", playerId)
          .maybeSingle();

        if (player?.user_id) {
          const eventKey = "beer_celebrated_3";
          const { data: claimed } = await admin
            .from("team_feed_reaction_push_events")
            .insert({ club_id: clubId, feed_id: feedId, event_key: eventKey })
            .select("id")
            .maybeSingle();

          if (claimed) {
            try {
              await sendPushToUsers({
                userIds: [player.user_id],
                title: "🙌 Die Kabine feiert dich!",
                body: "3 Mitspieler feiern deinen Bierabend. 🍺",
                url: "/home",
                preference: "announcements",
              });
            } catch (error) {
              console.error("Beer celebration push failed", error);
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ active: true, reaction });
}

export async function GET(request: NextRequest) {
  const { clubId } = await requireClub();
  const feedId = request.nextUrl.searchParams.get("feedId")?.trim();
  if (!feedId || feedId.length > 150 || !/^(beer|birthday|late_rsvp):/.test(feedId)) {
    return NextResponse.json({error:"invalid_feed"}, {status:400});
  }
  const admin = createAdminClient();
  const {data:reactions,error} = await admin.from("team_feed_reactions")
    .select("user_id,reaction").eq("club_id",clubId).eq("feed_id",feedId);
  if(error) return NextResponse.json({error:"lookup_failed"},{status:500});
  const userIds=[...new Set((reactions??[]).map(r=>r.user_id).filter(Boolean))];
  const {data:players} = userIds.length
    ? await admin.from("players").select("user_id,first_name,last_name,nickname").eq("club_id",clubId).in("user_id",userIds)
    : {data:[]};
  const names=new Map((players??[]).map(p=>[p.user_id,p.nickname?.trim()||[p.first_name,p.last_name].filter(Boolean).join(" ")||"Mitspieler"]));
  return NextResponse.json({reactions:(reactions??[]).map(r=>({reaction:r.reaction,name:names.get(r.user_id)||"Mitspieler"}))});
}
