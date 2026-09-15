"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";

const PRESETS: Record<string,{reason:string;type:"beer"|"money"|"custom";value:string;escalation:string|null}> = {
  missed_penalty:{reason:"Elfmeter verschossen",type:"beer",value:"1 Kiste Bier",escalation:"+ 1 Sechserträger"},
  birthday:{reason:"Geburtstag",type:"beer",value:"1 Kiste Bier",escalation:"+ 1 Sechserträger"},
  no_show:{reason:"Zugesagt, aber nicht gekommen",type:"beer",value:"1 Kiste Bier",escalation:"+ 1 Sechserträger"},
  late:{reason:"Zugesagt, aber zu spät gekommen",type:"money",value:"0,50 €",escalation:null},
  walk_in:{reason:"Nicht zugesagt, aber trotzdem gekommen",type:"money",value:"0,50 €",escalation:null},
};
async function ctx(){ const {clubId,membership,isPowerUser}=await requireClub(); if(!canManageClub({isPowerUser,role:membership.role})) redirect("/admin"); const flags=await getFeatureFlagsForClub(clubId); if(!(flags.penalties??false)) redirect("/admin"); return {supabase:await createClient(),clubId}; }
function url(params:Record<string,string>){return `/admin/penalties?${new URLSearchParams(params)}`;}
export async function addPenaltyAction(formData:FormData){
  const {supabase,clubId}=await ctx(); const playerId=Number(String(formData.get("player_id")??"")); if(!Number.isFinite(playerId)) redirect(url({error:"Bitte einen Spieler auswählen."}));
  const preset=PRESETS[String(formData.get("preset")??"")];
  const reason=(preset?.reason ?? String(formData.get("reason")??"").trim()) || null;
  const typeRaw=preset?.type ?? String(formData.get("type")??"beer");
  const type: "beer"|"money"|"custom" = typeRaw==="money"||typeRaw==="custom"?typeRaw:"beer";
  const value=(preset?.value ?? String(formData.get("value")??"").trim()) || null;
  const dueRaw=String(formData.get("due_date")??"").trim(); const notes=String(formData.get("notes")??"").trim()||null;
  const escalation=preset?.escalation ?? (type==="beer"?"+ 1 Sechserträger":null);
  const {error}=await supabase.from("penalties").insert({club_id:clubId,player_id:playerId,reason,type,value,due_date:dueRaw||null,notes,escalation_after_days:28,escalation_value:escalation});
  if(error) redirect(url({error:error.message})); revalidatePath("/admin/penalties"); redirect(url({saved:"1"}));
}
async function change(formData:FormData,mode:"resolve"|"reopen"|"delete") { const {supabase,clubId}=await ctx(); const id=Number(String(formData.get("penalty_id")??"")); if(!Number.isFinite(id)) redirect(url({error:"Ungültiger Posten."})); const q=mode==="delete"?supabase.from("penalties").delete():supabase.from("penalties").update({resolved_at:mode==="resolve"?new Date().toISOString():null}); const {error}=await q.eq("id",id).eq("club_id",clubId); if(error) redirect(url({error:error.message})); revalidatePath("/admin/penalties"); redirect(url({saved:"1"})); }
export async function resolvePenaltyAction(f:FormData){return change(f,"resolve");}
export async function reopenPenaltyAction(f:FormData){return change(f,"reopen");}
export async function deletePenaltyAction(f:FormData){return change(f,"delete");}
