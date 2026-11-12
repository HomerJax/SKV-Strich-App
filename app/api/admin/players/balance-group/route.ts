import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { getClubBillingAccess } from "@/lib/billing/club-billing";

export async function POST(request: Request) {
  const { clubId, membership, isPowerUser } = await requireClub();
  if (!canManageClub({ isPowerUser, role: membership.role })) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  let body: { playerId?: unknown; balanceGroup?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const playerId = body.playerId;
  const balanceGroup = body.balanceGroup;
  if (typeof playerId !== "number" || !Number.isSafeInteger(playerId) || playerId <= 0 ||
      (balanceGroup !== null && (typeof balanceGroup !== "string" || !balanceGroup.trim() || balanceGroup.length > 80))) {
    return NextResponse.json({ error: "Ungültige Spieler- oder Gruppenauswahl." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: player, error: playerError } = await supabase.from("players")
    .select("id,balance_group,is_active,roster_role,is_guest")
    .eq("club_id", clubId).eq("id", playerId).maybeSingle();
  if (playerError || !player || player.is_active === false || player.roster_role === "staff" || player.is_guest === true) {
    return NextResponse.json({ error: "Spieler in diesem Verein nicht gefunden." }, { status: 404 });
  }
  const nextGroup = typeof balanceGroup === "string" ? balanceGroup.trim() : null;
  if (nextGroup && player.balance_group && player.balance_group !== nextGroup) {
    return NextResponse.json({ error: "Der Spieler ist bereits einer Balance-Gruppe zugeordnet. Bitte zuerst entfernen." }, { status: 409 });
  }
  if (nextGroup) {
    const { data: groupRows, error: groupError } = await supabase.from("players")
      .select("id,balance_group").eq("club_id", clubId).not("balance_group", "is", null);
    if (groupError) return NextResponse.json({ error: "Gruppen konnten nicht geprüft werden." }, { status: 500 });
    const existingGroups = new Set((groupRows || []).map(row => row.balance_group).filter(Boolean));
    const permitted = new Set(["Gehfußballer", "Offensive Topspieler", "Defensive Topspieler", ...existingGroups]);
    if (!permitted.has(nextGroup)) {
      return NextResponse.json({ error: "Diese Balance-Gruppe ist für den Verein nicht verfügbar." }, { status: 400 });
    }
    const billing = await getClubBillingAccess(supabase, clubId);
    const groupsOtherPlayers = new Set((groupRows || []).filter(row => row.id !== playerId).map(row => row.balance_group).filter(Boolean));
    if (!billing.isPro && groupsOtherPlayers.size > 0 && !groupsOtherPlayers.has(nextGroup)) {
      return NextResponse.json({ error: "Free erlaubt nur eine aktive Balance-Gruppe. Mehrere Gruppen gibt es mit PRO." }, { status: 403 });
    }
  }
  const { error } = await supabase.from("players").update({ balance_group: nextGroup })
    .eq("club_id", clubId).eq("id", playerId);
  if (error) return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
