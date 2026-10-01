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
  const { data: existing } = await supabase.from("team_feed_reactions").select("id")
    .eq("club_id", clubId).eq("feed_id", feedId).eq("user_id", user.id).eq("reaction", reaction).maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from("team_feed_reactions").delete().eq("id", existing.id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    return NextResponse.json({ active: false });
  }

  const { error } = await supabase.from("team_feed_reactions").insert({ club_id: clubId, feed_id: feedId, user_id: user.id, reaction });
  if (error) return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  return NextResponse.json({ active: true });
}
