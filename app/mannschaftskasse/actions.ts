"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";

const PRESETS: Record<string,{reason:string;type:"beer"|"money"|"custom";value:string;escalation:string|null}> = {
  missed_penalty:{reason:"Elfmeter verschossen",type:"beer",value:"1 Kiste Bier",escalation:"+ 1 Sechserträger"},
  birthday:{reason:"Geburtstag",type:"beer",value:"1 Kiste Bier",escalation:"+ 1 Sechserträger"},
  no_show:{reason:"Zugesagt, aber nicht gekommen",type:"beer",value:"1 Kiste Bier",escalation:"+ 1 Sechserträger"},
  late:{reason:"Zugesagt, aber zu spät gekommen",type:"money",value:"0,50 €",escalation:null},
  walk_in:{reason:"Nicht zugesagt, aber trotzdem gekommen",type:"money",value:"0,50 €",escalation:null},
};

function url(params:Record<string,string>){return `/mannschaftskasse?${new URLSearchParams(params)}`;}

export async function reportPenaltyAction(formData:FormData){
  const {clubId}=await requireClub();
  const flags=await getFeatureFlagsForClub(clubId);
  if(!(flags.penalties??false)) redirect("/home");
  const supabase=await createClient();
  const playerId=Number(String(formData.get("player_id")??""));
  if(!Number.isFinite(playerId)) redirect(url({error:"Bitte einen Spieler auswählen."}));
  const {data:target}=await supabase.from("players").select("id").eq("club_id",clubId).eq("id",playerId).eq("is_active",true).maybeSingle();
  if(!target) redirect(url({error:"Spieler nicht gefunden."}));
  const preset=PRESETS[String(formData.get("preset")??"")];
  const reason=(preset?.reason ?? String(formData.get("reason")??"").trim()) || null;
  const typeRaw=preset?.type ?? String(formData.get("type")??"beer");
  const type:"beer"|"money"|"custom"=typeRaw==="money"||typeRaw==="custom"?typeRaw:"beer";
  const value=(preset?.value ?? String(formData.get("value")??"").trim()) || null;
  if(!reason || !value) redirect(url({error:"Bitte Grund und Posten angeben."}));
  const notes=String(formData.get("notes")??"").trim()||null;
  const escalation=preset?.escalation ?? (type==="beer"?"+ 1 Sechserträger":null);
  const {error}=await supabase.from("penalties").insert({club_id:clubId,player_id:playerId,reason,type,value,notes,escalation_after_days:28,escalation_value:escalation});
  if(error) redirect(url({error:"Posten konnte nicht eingetragen werden."}));
  revalidatePath("/mannschaftskasse"); revalidatePath("/admin/penalties");
  redirect(url({saved:"1"}));
}
