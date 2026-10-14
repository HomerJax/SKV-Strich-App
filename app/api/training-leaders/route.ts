import { NextRequest, NextResponse } from "next/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { clubId, membership, isPowerUser } = await requireClub();
  if (clubId !== "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60" || !canManageClub({ isPowerUser, role: membership.role })) {
    return NextResponse.json({ error: "Nur Club-Admins dürfen Trainingsleiter festlegen." }, { status: 403 });
  }
  const form = await request.formData();
  const playerId = Number(form.get("player_id"));
  const enabled = form.get("enabled") === "true";
  if (!Number.isSafeInteger(playerId) || playerId <= 0) return NextResponse.json({ error: "Ungültiger Spieler." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("players").update({ can_lead_training: enabled }).eq("id", playerId).eq("club_id", clubId).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Berechtigung konnte nicht gespeichert werden." }, { status: 400 });
  return NextResponse.redirect(new URL(`/players/${playerId}?saved=1`, request.url), 303);
}
