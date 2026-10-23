import { NextRequest,NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { requireClub } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const labels:Record<string,string>={
  lucky:"🍀 Kabinen-Joker! Heute keine dummen Sprüche.",
  usual:"😎 Alles bleibt beim Alten – immerhin gut gedreht!",
  confession:"🎤 Kabinen-Beichte: Erzähl beim nächsten Training deine beste Ausrede.",
  challenge:"🔥 Kabinen-Challenge: Übernimm beim nächsten Training das Aufwärmen."
};
export async function POST(request:NextRequest) {
  const {clubId,user,player}=await requireClub();
  const body=await request.json().catch(()=>null) as {penaltyId?:number}|null;
  const penaltyId=Number(body?.penaltyId);
  if(!player?.id||!Number.isSafeInteger(penaltyId)||penaltyId<1)return NextResponse.json({error:"Kein gültiger Spieler oder Strafe."},{status:400});
  const db=createAdminClient();
  const {data:penalty}=await db.from("penalties").select("id,player_id,resolved_at")
    .eq("club_id",clubId).eq("id",penaltyId).eq("player_id",player.id).maybeSingle();
  if(!penalty)return NextResponse.json({error:"Strafe nicht gefunden."},{status:404});
  const {data:existing}=await db.from("penalty_wheel_spins").select("outcome")
    .eq("club_id",clubId).eq("penalty_id",penaltyId).maybeSingle();
  if(existing)return NextResponse.json({outcome:existing.outcome,label:labels[existing.outcome],alreadySpun:true});
  if(penalty.resolved_at)return NextResponse.json({error:"Nur offene Strafen haben einen Dreh."},{status:409});
  const random=randomInt(100);
  const outcome=random<10?"lucky":random<80?"usual":random<95?"confession":"challenge";
  const {error}=await db.from("penalty_wheel_spins").insert({
    club_id:clubId,penalty_id:penaltyId,player_id:player.id,spun_by:user.id,outcome
  });
  if(error){
    // In case of concurrent clicks, return the first persisted outcome.
    const {data:saved}=await db.from("penalty_wheel_spins").select("outcome")
      .eq("club_id",clubId).eq("penalty_id",penaltyId).maybeSingle();
    if(saved)return NextResponse.json({outcome:saved.outcome,label:labels[saved.outcome],alreadySpun:true});
    return NextResponse.json({error:"Glücksrad konnte nicht gespeichert werden."},{status:500});
  }
  return NextResponse.json({outcome,label:labels[outcome],alreadySpun:false});
}
export async function GET(request:NextRequest) {
  const {clubId,player}=await requireClub();
  const penaltyId=Number(request.nextUrl.searchParams.get("penaltyId"));
  if(!player?.id||!Number.isSafeInteger(penaltyId))return NextResponse.json({error:"Ungültige Anfrage"},{status:400});
  const db=createAdminClient();
  const {data:penalty}=await db.from("penalties").select("id").eq("club_id",clubId).eq("player_id",player.id).eq("id",penaltyId).maybeSingle();
  if(!penalty)return NextResponse.json({error:"Nicht gefunden"},{status:404});
  const {data:spin}=await db.from("penalty_wheel_spins").select("outcome").eq("club_id",clubId).eq("penalty_id",penaltyId).maybeSingle();
  return NextResponse.json({outcome:spin?.outcome??null,label:spin?labels[spin.outcome]:null});
}
