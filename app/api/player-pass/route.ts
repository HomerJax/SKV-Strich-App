import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/auth/context";
import { canManageClub } from "@/lib/auth/access";

export const runtime = "nodejs";
const ALLOWED = new Set(["image/png","image/jpeg","image/webp"]);
const MAX = 2 * 1024 * 1024;

function serviceClient() { return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken:false, persistSession:false } }); }
function go(request: NextRequest, playerId: number, params: Record<string,string>) { const url = new URL(`/players/${playerId}`, request.url); Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v)); return NextResponse.redirect(url,{status:303}); }
function safe(name:string){ return name.normalize("NFKD").replace(/[^\w.\-]+/g,"-").toLowerCase(); }

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx.user || !ctx.activeClubId) return NextResponse.redirect(new URL("/login",request.url),{status:303});
  const form = await request.formData();
  const playerId = Number(String(form.get("player_id") ?? ""));
  if (!Number.isFinite(playerId)) return NextResponse.redirect(new URL("/players",request.url),{status:303});
  const membership = ctx.memberships.find(m=>m.club_id===ctx.activeClubId);
  const canEdit = ctx.player?.id===playerId || canManageClub({isPowerUser:ctx.isPowerUser,role:membership?.role});
  if (!canEdit) return go(request,playerId,{error:"forbidden"});
  const db = serviceClient();
  const { data: existing } = await db.from("players").select("id,photo_path").eq("id",playerId).eq("club_id",ctx.activeClubId).maybeSingle();
  if (!existing) return go(request,playerId,{error:"missing"});
  const birthDate = String(form.get("birth_date") ?? "").trim() || null;
  const jerseyNumber = String(form.get("jersey_number") ?? "").trim().slice(0,8) || null;
  let photoPath = existing.photo_path as string | null;
  const entry = form.get("photo");
  if (entry instanceof File && entry.size > 0) {
    if (!ALLOWED.has(entry.type) || entry.size > MAX) return go(request,playerId,{error:"photo"});
    const path = `${ctx.activeClubId}/${playerId}/${Date.now()}-${safe(entry.name)}`;
    const { error: uploadError } = await db.storage.from("player-photos").upload(path,Buffer.from(await entry.arrayBuffer()),{contentType:entry.type});
    if (uploadError) return go(request,playerId,{error:"upload"});
    if (photoPath) await db.storage.from("player-photos").remove([photoPath]);
    photoPath = path;
  }
  const { error } = await db.from("players").update({birth_date:birthDate,jersey_number:jerseyNumber,photo_path:photoPath}).eq("id",playerId).eq("club_id",ctx.activeClubId);
  return go(request,playerId,error?{error:"save"}:{saved:"1"});
}
