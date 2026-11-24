import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/send-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Season = { id:number; club_id:string; name:string; start_date:string|null; end_date:string|null };
type Membership = { club_id:string; user_id:string; role:string };
function berlinToday() {
  const parts = new Intl.DateTimeFormat("en-GB",{ timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",year:"numeric"}).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return [map.year,map.month,map.day].join("-");
}
function plusDays(date:string,days:number) {
  const d = new Date(date+"T12:00:00Z"); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10);
}
export async function GET(request:NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({error:"Cron secret not configured"},{status:500});
  if (request.headers.get("authorization") !== "Bearer "+process.env.CRON_SECRET) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }
  try {
    const supabase = createAdminClient();
    const today = berlinToday();
    const until = plusDays(today,14);
    const {data:seasons,error:seasonError} = await supabase.from("seasons")
      .select("id,club_id,name,start_date,end_date")
      .lte("start_date",today).gte("end_date",today).lte("end_date",until);
    if (seasonError) throw seasonError;
    const validSeasons = (seasons ?? []) as Season[];
    if (!validSeasons.length) return NextResponse.json({ok:true,today,seasons:0,notifications:0,pushSent:0});
    const clubIds = [...new Set(validSeasons.map(s=>s.club_id))];
    const [{data:memberships,error:membershipError},{data:clubs,error:clubsError}] = await Promise.all([
      supabase.from("club_memberships").select("club_id,user_id,role").in("club_id",clubIds).in("role",["admin","owner"]),
      supabase.from("clubs").select("id").in("id",clubIds).is("deleted_at",null),
    ]);
    if (membershipError) throw membershipError;
    if (clubsError) throw clubsError;
    const activeClubs = new Set((clubs??[]).map(c=>c.id));
    const allowed = (memberships??[]) as Membership[];
    let notifications=0,pushSent=0,pushFailed=0;
    for (const season of validSeasons) {
      if (!activeClubs.has(season.club_id)) continue;
      const adminIds = [...new Set(allowed.filter(m=>m.club_id===season.club_id).map(m=>m.user_id))];
      if (!adminIds.length) continue;
      const pairs = adminIds.map(userId=>({
        userId,
        dedupeKey:"season_end_14:"+season.id+":"+season.end_date+":"+userId,
      }));
      const {data:existing,error:existingError} = await supabase.from("user_notifications")
        .select("dedupe_key").in("dedupe_key",pairs.map(p=>p.dedupeKey));
      if (existingError) throw existingError;
      const previous = new Set((existing??[]).map(row=>row.dedupe_key));
      const newPairs = pairs.filter(p=>!previous.has(p.dedupeKey));
      if (!newPairs.length) continue;
      const title = "Eure Saison endet bald";
      const body = season.name+" endet am "+new Date(season.end_date+"T12:00:00Z").toLocaleDateString("de-DE",{timeZone:"Europe/Berlin"})+". Bereitet den Abschluss und die nächste Saison vor.";
      const {error:insertError} = await supabase.from("user_notifications").insert(newPairs.map(pair=>({
        user_id:pair.userId,club_id:season.club_id,type:"season_end_reminder",title,body,
        cta_href:"/admin/season-transition",cta_label:"Neue Saison planen",dedupe_key:pair.dedupeKey,
      })));
      if (insertError) throw insertError;
      notifications+=newPairs.length;
      // The push uses the same per-admin preference as other administrative notices.
      // Existing dedupe keys prevent repeat notifications or re-sending on subsequent cron runs.
      try {
        const sent = await sendPushToUsers({
          userIds:newPairs.map(p=>p.userId), title, body,
          url:"/admin/season-transition",preference:"announcements",
        });
        pushSent+=sent.sent; pushFailed+=sent.failed;
      } catch(error) {
        console.error("season end push send failed",season.id,error);
        pushFailed+=newPairs.length;
      }
    }
    return NextResponse.json({ok:true,today,seasons:validSeasons.length,notifications,pushSent,pushFailed});
  } catch(error) {
    console.error("season end reminder cron failed",error);
    return NextResponse.json({error:"Season end reminder failed"},{status:500});
  }
}
