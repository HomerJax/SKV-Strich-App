import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_EVENTS = new Set([
  "home_open","sessions_open","session_detail_open","my_stats_open",
  "standings_open","player_pass_open","compare_open","mvp_open",
  "team_feed_open","badge_open","team_cashbox_open","beer_cashbox_open",
  "event_roster_open","admin_open","other_page_open"
]);

function normalizeEvent(path: string) {
  if (path === "/home") return "home_open";
  if (path === "/sessions") return "sessions_open";
  if (/^\/sessions\/[^/]+/.test(path)) return "session_detail_open";
  if (path === "/stats" || path.startsWith("/stats/")) return "my_stats_open";
  if (path === "/standings" || path.startsWith("/standings/")) return "standings_open";
  if (path.includes("compare") || path.includes("vergleich")) return "compare_open";
  if (path.includes("player-pass") || path.includes("spielerpass") || path.startsWith("/profile")) return "player_pass_open";
  if (path.includes("mvp")) return "mvp_open";
  if (path.startsWith("/mannschaftskasse")) return "team_cashbox_open";
  if (path.includes("beerkasse")) return "beer_cashbox_open";
  if (path.startsWith("/admin")) return "admin_open";
  return "other_page_open";
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext();
    if (!ctx.user) return NextResponse.json({ ok: false }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as {
      event?: string; path?: string; metadata?: Record<string, unknown>;
    };
    const path = typeof body.path === "string" ? body.path.slice(0, 300) : null;
    const requested = typeof body.event === "string" ? body.event : null;
    const eventName = requested && ALLOWED_EVENTS.has(requested)
      ? requested
      : path ? normalizeEvent(path) : null;
    if (!eventName) return NextResponse.json({ ok: false }, { status: 400 });

    const metadata = body.metadata && typeof body.metadata === "object"
      ? body.metadata : {};

    const admin = createAdminClient();
    const { error } = await admin.from("product_analytics_events").insert({
      user_id: ctx.user.id,
      club_id: ctx.activeClubId ?? null,
      event_name: eventName,
      path,
      metadata,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("analytics track failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
