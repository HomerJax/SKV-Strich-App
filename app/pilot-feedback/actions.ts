"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const PILOT_ACCESS: Record<string,string> = {
  "803ed713-04bb-40b5-9990-a0e02f0e505f":"92a02874-934f-4e3d-8fc9-543b01c43c16",
  "2a6421b1-dfaa-4c17-a5ce-adfc758c11d7":"b8d4b692-baf1-4263-8fdd-64df424114a7"

};
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
