import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const go = (status: string) => NextResponse.redirect(new URL("/admin/players/activate?status=" + status, origin), { status: 303 });
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.activeClubId) return go("error");
  const membership = ctx.memberships.find(m => m.club_id === ctx.activeClubId);
  if (!ctx.isPowerUser && membership?.role !== "admin") return go("error");
  const form = await request.formData();
  const bulk = form.get("bulk") === "1";
  const playerId = Number(form.get("player_id"));
  if (!bulk && (!Number.isSafeInteger(playerId) || playerId <= 0)) return go("error");
  const db = createAdminClient();
  const query = db.from("players").select("id,email,user_id")
    .eq("club_id", ctx.activeClubId).eq("is_guest", false).is("user_id", null);
  const { data: players, error: loadError } = bulk
    ? await query.order("id").limit(25)
    : await query.eq("id", playerId);
  if (loadError || !players?.length) return go("error");
  let sent = 0;
  let failed = 0;
  const seen = new Set<string>();
  for (const player of players) {
    const email = player.email?.trim().toLowerCase();
    if (!email || seen.has(email)) { failed++; continue; }
    seen.add(email);
    const { count, error: duplicateError } = await db.from("players")
      .select("id", { count: "exact", head: true })
      .eq("club_id", ctx.activeClubId).eq("is_guest", false).ilike("email", email);
    if (duplicateError || count !== 1) { failed++; continue; }
    const token = randomBytes(24).toString("hex");
    const { error: inviteError } = await db.from("invites").insert({
      club_id: ctx.activeClubId, token, role: "member", invited_by: ctx.user.id,
    });
    if (inviteError) { failed++; continue; }
    const joinPath = "/join?token=" + encodeURIComponent(token);
    const callback = new URL("/auth/callback", origin);
    callback.searchParams.set("next", joinPath);
    const { error: emailError } = await db.auth.admin.inviteUserByEmail(email, {
      redirectTo: callback.toString(),
    });
    if (emailError) {
      console.error("Player activation invite failed:", emailError.message);
      await db.from("invites").delete().eq("token", token).eq("club_id", ctx.activeClubId);
      failed++;
    } else sent++;
  }
  return go(sent ? (failed ? "partial" : "sent") : "error");
}
