"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCashboxPilotClub, parsePilotCashboxStructure } from "@/lib/cashbox/pilot-structure";

const back="/mannschaftskasse/zahlungen";
function validUrl(raw:string,hosts:string[]){
  if(!raw)return true;
  try{const u=new URL(raw);return u.protocol==="https:"&&!u.username&&!u.password&&hosts.includes(u.hostname.toLowerCase());}
  catch{return false;}
}
export async function savePilotPenaltyPaymentsAction(form:FormData){
 const ctx=await requireClub();
 if(ctx.isSupportView||!isCashboxPilotClub(ctx.clubId)||
   !canManageClub({role:ctx.membership.role,isPowerUser:ctx.isPowerUser}))redirect("/home");
 const json=String(form.get("payments_json")??"");
 if(json.length>2400)redirect(back+"?error=invalid");
 let raw:unknown;
 try{raw=JSON.parse(json);}catch{redirect(back+"?error=invalid");}
 if(!raw||typeof raw!=="object"||Array.isArray(raw))redirect(back+"?error=invalid");
 const obj=raw as Record<string,unknown>;
 if(typeof obj.cashEnabled!=="boolean" ||
  ["paypalPoolUrl","paypalMeUrl","sumupUrl"].some(key=>typeof obj[key]!=="string"||(obj[key] as string).length>500))
  redirect(back+"?error=invalid");
 const payments=parsePilotCashboxStructure({payments:obj}).payments;
 if(!validUrl(payments.paypalPoolUrl,["paypal.com","www.paypal.com"])||
    !validUrl(payments.paypalMeUrl,["paypal.me","www.paypal.me"])||
    !validUrl(payments.sumupUrl,["pay.sumup.com","checkout.sumup.com"]))
   redirect(back+"?error=invalid");
 const db=createAdminClient();
 const {data,error}=await db.from("cashbox_pilot_structures").select("config").eq("club_id",ctx.clubId).maybeSingle();
 if(error)redirect(back+"?error=save");
 const config=parsePilotCashboxStructure(data?.config);
 const {error:saveError}=await db.from("cashbox_pilot_structures").upsert({
   club_id:ctx.clubId,config:{...config,payments},updated_by:ctx.user.id,updated_at:new Date().toISOString(),
 },{onConflict:"club_id"});
 if(saveError)redirect(back+"?error=save");
 revalidatePath(back);revalidatePath("/mannschaftskasse/strafen");revalidatePath("/mannschaftskasse");
 redirect(back+"?saved=1");
}
