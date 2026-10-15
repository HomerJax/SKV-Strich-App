import { NextRequest, NextResponse } from "next/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { clubId, membership, isPowerUser } = await requireClub();
  if (!canManageClub({ isPowerUser, role: membership.role })) {
    return NextResponse.json({ error: "Nur Club-Admins dürfen Trainingsleiter festlegen." }, { status: 403 });
  }
  const form = await request.formData();
  const playerId = Number(form.get("player_id"));
  const enabled = form.get("enabled") === "true";
  if (!Number.isSafeInteger(playerId) || playerId <= 0) return NextResponse.json({ error: "Ungültiger Spieler." }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("players").update({ can_lead_training: enabled }).eq("id", playerId).eq("club_id", clubId).eq("is_guest", false).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Berechtigung konnte nicht gespeichert werden." }, { status: 400 });
  const destination = form.get("return_to") === "members" ? "/admin/members?success=training_leader_saved" : `/players/${playerId}?saved=1`;
  return NextResponse.redirect(new URL(destination, request.url), 303);
}
