import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const go = (status: string) => NextResponse.redirect(new URL("/admin/players/activate?status=" + status, origin), { status: 303 });
  const ctx = await getAuthContext();
  const member = ctx.memberships.find(m => m.club_id === ctx.activeClubId);
  if (!ctx.user || !ctx.activeClubId || (!ctx.isPowerUser && member?.role !== "admin")) return go("error");
  const data = await request.formData();
  const id = Number(data.get("player_id"));
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  if (!Number.isSafeInteger(id) || id <= 0 || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return go("invalid");
  const db = createAdminClient();
  if (email) {
    const { data: duplicates, error } = await db.from("players").select("id")
      .eq("club_id", ctx.activeClubId).eq("is_guest", false).ilike("email", email).neq("id", id).limit(1);
    if (error || duplicates?.length) return go("duplicate");
  }
  const { data: updated, error } = await db.from("players").update({email: email || null})
    .eq("id", id).eq("club_id", ctx.activeClubId).is("user_id", null).eq("is_guest", false).select("id").maybeSingle();
  return go(error || !updated ? "error" : "updated");
}
