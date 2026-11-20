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
  const playerId = Number(form.get("player_id"));
  if (!Number.isSafeInteger(playerId) || playerId <= 0) return go("error");
  const db = createAdminClient();
  const { data: player } = await db.from("players").select("id,email,user_id")
    .eq("id", playerId).eq("club_id", ctx.activeClubId).eq("is_guest", false).maybeSingle();
  if (!player || player.user_id) return go("error");
  const email = player.email?.trim().toLowerCase();
  if (!email) return go("missing");
  // A one-time club invitation allows the verified email owner to claim the
  // original player ID in /api/join; never send passwords by email.
  const token = randomBytes(24).toString("hex");
  const { error: inviteError } = await db.from("invites").insert({
    club_id: ctx.activeClubId, token, role: "member", invited_by: ctx.user.id,
  });
  if (inviteError) return go("error");
  const redirectTo = new URL("/join?token=" + encodeURIComponent(token), origin).toString();
  // Supabase sends the standard account activation email to new users.
  // Existing users are not modified: they must join via the existing link flow.
  const { error: emailError } = await db.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (emailError) {
    console.error("Player activation invite failed:", emailError.message);
    await db.from("invites").delete().eq("token", token).eq("club_id", ctx.activeClubId);
    return go("error");
  }
  return go("sent");
}
