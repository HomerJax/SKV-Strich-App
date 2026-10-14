"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

import { PILOT_ACCESS } from "./access";
export type FeedbackState={error?:string;success?:boolean};
export async function submitPilotFeedback(_:FeedbackState,formData:FormData):Promise<FeedbackState>{
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user || !PILOT_ACCESS[user.id]) return {error:"Kein Zugriff auf diesen Fragebogen."};
 const clubId=PILOT_ACCESS[user.id];
 const keys=["usage","useful","other_organization","positive","issues","players_positive","players_negative","fairness","missing","price","recommend","other"];
 const answers:Record<string,string>={};
 for(const key of keys){const values=formData.getAll(key).filter((v):v is string=>typeof v==="string");const value=values.join(", ").trim();if(value.length>2500)return {error:"Eine Antwort ist zu lang."};answers[key]=value;const other=formData.get(key+"_other");if(typeof other==="string"&&other.trim())answers[key+"_other"]=other.trim().slice(0,1000);}
 const {error}=await supabase.from("pilot_admin_feedback").insert({user_id:user.id,club_id:clubId,answers});
 if(error){if(error.code==="23505")return {error:"Du hast den Fragebogen bereits abgeschickt."};return {error:"Speichern fehlgeschlagen. Bitte erneut versuchen."};}
 revalidatePath("/pilot-feedback");
 return {success:true};
}
