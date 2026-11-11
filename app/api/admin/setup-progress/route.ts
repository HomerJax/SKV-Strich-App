import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
const IDS=["club","season","players","training","series","leaders","teams","categories","rsvp","games","stats","cashbox","notifications","pro"];
export async function POST(req:NextRequest){
 const ctx=await getAuthContext();
 if(!ctx.user||!ctx.activeClubId)return NextResponse.json({error:"Unauthorized"},{status:401});
 const member=ctx.memberships.find(m=>m.club_id===ctx.activeClubId);
 if(!ctx.isPowerUser&&member?.role!=="admin")return NextResponse.json({error:"Forbidden"},{status:403});
 const body=await req.json().catch(()=>null);
 if(!body||!IDS.includes(body.current_step)||!Array.isArray(body.skipped)||!Array.isArray(body.test_completed))return NextResponse.json({error:"Invalid payload"},{status:400});
 const skipped=body.skipped.filter((s:unknown):s is string=>typeof s==="string"&&IDS.includes(s)).slice(0,14);
 const testCompleted=body.test_completed.filter((s:unknown):s is string=>typeof s==="string"&&IDS.includes(s)).slice(0,14);
 const db=await createClient();
 const {data:club}=await db.from("clubs").select("display_name").eq("id",ctx.activeClubId).maybeSingle();
 const allowTest=ctx.isPowerUser&&club?.display_name==="1. FC Strikr 2026";
 const {error}=await db.from("admin_setup_progress").upsert({club_id:ctx.activeClubId,user_id:ctx.user.id,current_step:body.current_step,skipped,test_mode:allowTest&&body.test_mode===true,test_completed:allowTest?testCompleted:[],updated_at:new Date().toISOString()},{onConflict:"club_id,user_id"});
 return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({ok:true});
}
