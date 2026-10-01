import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendClubPush } from "@/lib/push/club-events";

export const runtime = "nodejs";

const TIME_ZONE = "Europe/Berlin";
const FEATURE_START = "2026-10-01";

function berlinParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

function berlinDayStartUtc(dateKey: string) {
  // October launch dates are handled from stored timestamps; include a safe UTC window and regroup below.
  return new Date(`${dateKey}T00:00:00+01:00`).toISOString();
}

type BeerRow = { club_id: string; player_id: number; quantity: number | null; created_at: string; players: { nickname: string | null; first_name: string | null; last_name: string | null } | { nickname: string | null; first_name: string | null; last_name: string | null }[] | null };

function dateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function playerName(player: BeerRow["players"]) {
  const p = Array.isArray(player) ? player[0] : player;
  return p?.nickname?.trim() || [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || "Ein Spieler";
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = berlinParts();
  if (now.date < FEATURE_START || now.hour !== 22 && now.hour !== 23) return NextResponse.json({ ok: true, skipped: true, localDate: now.date, localHour: now.hour });

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("beer_consumptions")
    .select("club_id, player_id, quantity, created_at, players(nickname, first_name, last_name)")
    .gte("created_at", berlinDayStartUtc(now.date))
    .is("cancelled_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const totals = new Map<string, { clubId: string; playerId: number; quantity: number; player: BeerRow["players"] }>();
  for (const row of (data ?? []) as BeerRow[]) {
    if (dateKey(row.created_at) !== now.date) continue;
    const key = `${row.club_id}:${row.player_id}`;
    const current = totals.get(key);
    totals.set(key, { clubId: row.club_id, playerId: row.player_id, quantity: (current?.quantity ?? 0) + Number(row.quantity ?? 0), player: row.players });
  }

  const leaders = new Map<string, { playerId: number; quantity: number; player: BeerRow["players"] }>();
  for (const total of totals.values()) {
    const current = leaders.get(total.clubId);
    if (!current || total.quantity > current.quantity) leaders.set(total.clubId, total);
  }

  let pushed = 0;
  for (const [clubId, leader] of leaders) {
    if (leader.quantity < 3) continue;
    const feedId = `beer:${now.date}:${leader.playerId}`;
    const { data: existing } = await supabase.from("team_feed_push_events").select("id").eq("club_id", clubId).eq("feed_id", feedId).maybeSingle();
    if (existing) continue;

    const name = playerName(leader.player);
    await sendClubPush({ clubId, title: "🍺 Kabinen-Talk", body: `${name} ist heute Biermaschine: ${leader.quantity} Bier · Prost Mahlzeit! 🍻`, url: "/home", preference: "announcements" });
    const { error: logError } = await supabase.from("team_feed_push_events").insert({ club_id: clubId, feed_id: feedId });
    if (!logError) pushed += 1;
  }

  return NextResponse.json({ ok: true, localDate: now.date, clubs: leaders.size, pushed });
}
