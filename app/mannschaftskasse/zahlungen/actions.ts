"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPenaltyWorkflowClub, isCashboxPilotClub, parsePilotCashboxStructure } from "@/lib/cashbox/pilot-structure";

const back="/mannschaftskasse/zahlungen";
function validUrl(raw:string,hosts:string[],pathPrefix:string) {
  if(!raw)return true;
  try{
    const url=new URL(raw);
    return url.protocol==="https:" && !url.username && !url.password &&
      hosts.includes(url.hostname.toLowerCase()) &&
      url.pathname.startsWith(pathPrefix) &&
      url.pathname.length>pathPrefix.length;
  }catch{return false;}
}
export async function savePilotPenaltyPaymentsAction(form:FormData){
 const ctx=await requireClub();
 if(ctx.isSupportView||!isPenaltyWorkflowClub(ctx.clubId)||
   !canManageClub({role:ctx.membership.role,isPowerUser:ctx.isPowerUser}))
   redirect("/home");
 const json=String(form.get("payments_json")??"");
 if(json.length>2400)redirect(back+"?error=invalid");
 let raw:unknown;
 try{raw=JSON.parse(json);}catch{redirect(back+"?error=invalid");}
 if(!raw||typeof raw!=="object"||Array.isArray(raw))redirect(back+"?error=invalid");
 const obj=raw as Record<string,unknown>;
 if(typeof obj.cashEnabled!=="boolean" ||
  ["paypalPoolUrl","paypalMeUrl","sumupUrl"].some(key=>
     typeof obj[key]!=="string" || (obj[key] as string).length>500))
   redirect(back+"?error=invalid");
 const payments=parsePilotCashboxStructure({payments:obj}).payments;
 if(!validUrl(payments.paypalPoolUrl,["paypal.com","www.paypal.com"],"/pool/")||
    !validUrl(payments.paypalMeUrl,["paypal.me","www.paypal.me"],"/")||
    !validUrl(payments.sumupUrl,["pay.sumup.com","checkout.sumup.com"],"/"))
   redirect(back+"?error=invalid");
 const db=createAdminClient();
 if(!isCashboxPilotClub(ctx.clubId)){
   // Crucial: fine-only config. Never read, copy, or write the Bierkasse fields.
   const {error}=await db.from("penalty_payment_settings").upsert({
     club_id:ctx.clubId,
     paypal_me_url:payments.paypalMeUrl,
     paypal_pool_url:payments.paypalPoolUrl,
     sumup_url:payments.sumupUrl,
     cash_enabled:payments.cashEnabled,
     updated_by:ctx.user.id,
     updated_at:new Date().toISOString(),
   },{onConflict:"club_id"});
   if(error)redirect(back+"?error=save");
 }else{
   // Existing pilot retains its original settings layout.
   const {data,error}=await db.from("cashbox_pilot_structures")
     .select("config").eq("club_id",ctx.clubId).maybeSingle();
   if(error)redirect(back+"?error=save");
   const config=parsePilotCashboxStructure(data?.config);
   const {error:saveError}=await db.from("cashbox_pilot_structures").upsert({
     club_id:ctx.clubId,config:{...config,payments},updated_by:ctx.user.id,
     updated_at:new Date().toISOString(),
   },{onConflict:"club_id"});
   if(saveError)redirect(back+"?error=save");
 }
 revalidatePath(back);
 revalidatePath("/mannschaftskasse/strafen");
 revalidatePath("/mannschaftskasse");
 redirect(back+"?saved=1");
}
