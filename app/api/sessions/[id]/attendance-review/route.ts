import { NextRequest, NextResponse } from "next/server";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { getSessionDeadlineEpochMs, berlinLocalDateTimeToEpochMs } from "@/lib/session-rsvp-deadline";
import { canManageClub } from "@/lib/auth/access";

export const dynamic = "force-dynamic";
type Kind = "late_cancel" | "no_show";

async function accessSession(context:{params:Promise<{id:string}>}) {
  const sessionId=Number((await context.params).id);
  if(!Number.isSafeInteger(sessionId)||sessionId<1) return {error:"Ungültiger Termin.",status:400 as const};
  return requireSessionAccess(sessionId);
}
function permitted(a:{isPowerUser:boolean;membership:{role:string|null}|null;canLeadTraining:boolean}) {
  return canManageClub({isPowerUser:a.isPowerUser,role:a.membership?.role}) || a.canLeadTraining;
}
export async function GET(_request:NextRequest,context:{params:Promise<{id:string}>}) {
  const access=await accessSession(context);
  if("error" in access) return NextResponse.json({error:access.error},{status:access.status});
  if(!permitted(access))return NextResponse.json({error:"Keine Berechtigung."},{status:403});
  const {adminSupabase:db,session,clubId}=access;
  const [{data:hist},{data:rsvps},{data:reviews},{data:settings}]=await Promise.all([
    db.from("session_rsvp_first_ins").select("player_id,first_in_at").eq("club_id",clubId).eq("session_id",session.id),
    db.from("session_rsvps").select("player_id,status,reason").eq("club_id",clubId).eq("session_id",session.id),
    db.from("session_attendance_reviews").select("id,player_id,kind,status,note,reported_at,penalty_id").eq("club_id",clubId).eq("session_id",session.id),
    db.from("club_settings").select("rsvp_deadline_minutes_before").eq("club_id",clubId).maybeSingle()
  ]);
  const ids=[...new Set([...(hist??[]).map(p=>p.player_id),...(rsvps??[]).map(p=>p.player_id),...(reviews??[]).map(p=>p.player_id)])];
  const {data:players}=ids.length?await db.from("players").select("id,first_name,last_name,name").eq("club_id",clubId).in("id",ids):{data:[]};
  const names=new Map((players??[]).map(p=>[p.id,[p.first_name,p.last_name].filter(Boolean).join(" ")||p.name||"Spieler"]));
  const statuses=new Map((rsvps??[]).map(r=>[r.player_id,r]));
  const history=new Map((hist??[]).map(r=>[r.player_id,r]));
  const reviewMap=new Map((reviews??[]).map(r=>[r.player_id,r]));
  const deadline=getSessionDeadlineEpochMs({date:session.date,startTime:session.start_time,sessionOverrideMinutes:session.rsvp_deadline_minutes_before,clubDefaultMinutes:settings?.rsvp_deadline_minutes_before??60});
  return NextResponse.json({
    date:session.date,startTime:session.start_time,deadlineAt:deadline?new Date(deadline).toISOString():null,
    rows:ids.map(id=>({id,name:names.get(id)??"Spieler",firstInAt:history.get(id)?.first_in_at??null,rsvp:statuses.get(id)?.status??"open",review:reviewMap.get(id)??null})).sort((a,b)=>a.name.localeCompare(b.name,"de"))
  });
}

export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}) {
  const access=await accessSession(context);
  if("error" in access)return NextResponse.json({error:access.error},{status:access.status});
  if(!permitted(access))return NextResponse.json({error:"Nur Trainingsleiter oder Admin."},{status:403});
  const {session,adminSupabase:db,clubId,currentUserId}=access;
  const body=await request.json().catch(()=>null) as {action?:string;playerId?:number;kind?:Kind;note?:string;decision?:string}|null;
  const playerId=Number(body?.playerId);
  if(!Number.isSafeInteger(playerId)||playerId<1)return NextResponse.json({error:"Ungültiger Spieler."},{status:400});
  const {data:player}=await db.from("players").select("id").eq("club_id",clubId).eq("id",playerId).eq("is_guest",false).maybeSingle();
  if(!player)return NextResponse.json({error:"Spieler gehört nicht zum Verein."},{status:404});
  const sessionId=session.id;
  const {data:settings}=await db.from("club_settings").select("rsvp_deadline_minutes_before").eq("club_id",clubId).maybeSingle();
  const deadline=getSessionDeadlineEpochMs({date:session.date,startTime:session.start_time,sessionOverrideMinutes:session.rsvp_deadline_minutes_before,clubDefaultMinutes:settings?.rsvp_deadline_minutes_before??60});
  const startAt=berlinLocalDateTimeToEpochMs(session.date,session.start_time);
  const {data:existing}=await db.from("session_attendance_reviews").select("id,kind,status").eq("club_id",clubId).eq("session_id",sessionId).eq("player_id",playerId).maybeSingle();

  if(body?.action==="report") {
    const kind=body.kind;
    if(kind!=="late_cancel"&&kind!=="no_show")return NextResponse.json({error:"Bitte einen Grund wählen."},{status:400});
    if(deadline===null||Date.now()<deadline)return NextResponse.json({error:"Die Deadline ist noch nicht vorbei."},{status:409});
    if(kind==="no_show"&&(startAt===null||Date.now()<startAt))return NextResponse.json({error:"Nichterscheinen erst nach Trainingsbeginn melden."},{status:409});
    if(existing?.status && existing.status!=="pending")return NextResponse.json({error:"Fall ist bereits abgeschlossen."},{status:409});
    const {data:initialYes}=await db.from("session_rsvp_first_ins").select("first_in_at").eq("club_id",clubId).eq("session_id",sessionId).eq("player_id",playerId).maybeSingle();
    if(!initialYes)return NextResponse.json({error:"Es liegt keine vorherige Zusage vor."},{status:409});
    const {data:currentRsvp}=await db.from("session_rsvps")
      .select("status,updated_at").eq("club_id",clubId).eq("session_id",sessionId)
      .eq("player_id",playerId).maybeSingle();
    if(!currentRsvp || currentRsvp.status==="open")
      return NextResponse.json({error:"Keine aktive oder verspätet zurückgezogene Zusage vorhanden."},{status:409});
    if(currentRsvp.status==="out" && (kind==="no_show" || (deadline!==null && new Date(currentRsvp.updated_at).getTime()<=deadline)))
      return NextResponse.json({error:"Der Spieler hatte bereits rechtzeitig abgesagt. Keine Strafe möglich."},{status:409});
    const note=(body.note??"").trim().slice(0,500);
    const {error}=await db.from("session_attendance_reviews").upsert({
      club_id:clubId,session_id:sessionId,player_id:playerId,kind,status:"pending",
      note,reported_by:currentUserId,reported_at:new Date().toISOString()
    },{onConflict:"session_id,player_id"});
    if(error)return NextResponse.json({error:error.message},{status:500});
    // Preserve the original commitment in session_rsvp_first_ins and the review.
    if(kind==="late_cancel") {
      const {error:rsvpError}=await db.from("session_rsvps").upsert({club_id:clubId,session_id:sessionId,player_id:playerId,status:"out",reason:note||"Spätabsage",updated_at:new Date().toISOString()},{onConflict:"session_id,player_id"});
      if(rsvpError)return NextResponse.json({error:rsvpError.message},{status:500});
    }
    const {error:removeError}=await db.from("session_players").delete().eq("session_id",sessionId).eq("player_id",playerId);
    if(removeError)return NextResponse.json({error:removeError.message},{status:500});
    return NextResponse.json({ok:true});
  }
  if(body?.action!=="decide"||!existing||existing.status!=="pending")return NextResponse.json({error:"Kein offener Fall gefunden."},{status:409});
  if(body.decision==="excuse") {
    const {error}=await db.from("session_attendance_reviews").update({status:"excused",reviewed_by:currentUserId,reviewed_at:new Date().toISOString()}).eq("id",existing.id).eq("status","pending");
    return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({ok:true});
  }
  if(body.decision!=="penalize")return NextResponse.json({error:"Ungültige Entscheidung."},{status:400});
  const {data:cashboxSettings}=await db.from("club_settings").select("cashbox_penalties_enabled").eq("club_id",clubId).maybeSingle();
  if(cashboxSettings?.cashbox_penalties_enabled!==true)return NextResponse.json({error:"Die Mannschaftskasse für Strafen ist deaktiviert."},{status:409});
  const {data:rule}=await db.from("penalty_rules").select("reason,type,value,escalation_after_days,escalation_value")
    .eq("club_id",clubId).eq("rule_key",existing.kind==="no_show"?"no_show":"late_cancel").eq("enabled",true).maybeSingle();
  if(!rule)return NextResponse.json({error:"Strafregel ist deaktiviert oder nicht konfiguriert."},{status:409});
  const sourceKey=`attendance-review:${sessionId}:${playerId}`;
  const {data:existingPenalty}=await db.from("penalties").select("id").eq("club_id",clubId).eq("player_id",playerId).eq("source_key",sourceKey).maybeSingle();
  let penaltyId=existingPenalty?.id??null;
  if(!penaltyId) {
    const dueDate=rule.escalation_after_days?new Date(Date.now()+rule.escalation_after_days*86400000).toISOString().slice(0,10):null;
    const {data:created,error}=await db.from("penalties").insert({club_id:clubId,session_id:sessionId,player_id:playerId,source_key:sourceKey,reason:rule.reason,type:rule.type,value:rule.value,escalation_after_days:rule.escalation_after_days,escalation_value:rule.escalation_value,due_date:dueDate,notes:"Bestätigt nach Anwesenheitsprüfung"}).select("id").single();
    if(error) {
      // Unique source key makes approval safe against duplicate requests.
      const {data:found}=await db.from("penalties").select("id").eq("club_id",clubId).eq("player_id",playerId).eq("source_key",sourceKey).maybeSingle();
      if(!found)return NextResponse.json({error:error.message},{status:500});
      penaltyId=found.id;
    }else penaltyId=created.id;
  }
  const {error:reviewError}=await db.from("session_attendance_reviews").update({
    status:"penalized",reviewed_by:currentUserId,reviewed_at:new Date().toISOString(),penalty_id:penaltyId
  }).eq("id",existing.id).eq("status","pending");
  return reviewError?NextResponse.json({error:reviewError.message},{status:500}):NextResponse.json({ok:true,penaltyId});
}
