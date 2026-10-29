"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCashboxAccess } from "@/lib/cashbox/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCashboxPilotClub } from "@/lib/cashbox/pilot-structure";

const target="/mannschaftskasse/strafen";
export async function pilotPenaltyAction(form:FormData) {
  const access=await requireCashboxAccess();
  if(!isCashboxPilotClub(access.clubId)||access.isSupportView) redirect("/home");
  const action=String(form.get("action")??"");
  const id=Number(form.get("penalty_id"));
  const method=String(form.get("payment_method")??"");
  const note=String(form.get("note")??"").trim();
  if(!Number.isSafeInteger(id)||id<1 ||
     !["report","confirm","reject","cancel","reopen"].includes(action)||
     note.length>500) redirect(target+"?error=invalid");
  if(action!=="report"&&!access.canManageCashbox) redirect("/home");
  if(action==="report"&&!access.player?.id) redirect(target+"?error=player");

  const db=createAdminClient();
  // Role + player ownership are rechecked in the same atomic DB transaction
  // before any cash ledger changes.
  const {error}=await db.rpc("pilot_penalty_transition",{
    p_penalty_id:id, p_actor:access.user.id,p_action:action,
    p_payment_method:method||null,p_note:note,
  });
  if(error){
    console.error("Pilot penalty transition",action,error.code);
    redirect(target+"?error="+encodeURIComponent(error.code==="P0001"?"state":"save"));
  }
  revalidatePath(target);
  revalidatePath("/mannschaftskasse");
  revalidatePath("/admin/penalties");
  revalidatePath("/home");
  redirect(target+"?saved="+encodeURIComponent(action));
}
