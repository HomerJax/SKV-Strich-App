import { NextRequest, NextResponse } from "next/server";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const allowed = new Set(["prost","biermaschine","maschine","laeuft","glueckwunsch","kischde","herz"]);

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

  return NextResponse.json({ active: true, reaction });
}
