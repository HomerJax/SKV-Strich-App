"use server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

function adminClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Supabase ENV fehlt");return createAdminClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});}
export async function createAbsenceAction(formData:FormData){
 const {clubId,player}=await requireClub(); if(!player) redirect("/profile?absence_error=Kein+Spielerprofil");
 const start=String(formData.get("start_date")??""); const end=String(formData.get("end_date")??""); const reason=String(formData.get("reason")??"other"); const note=String(formData.get("note")??"").trim()||null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<start) redirect("/profile?absence_error=Bitte+gültigen+Zeitraum+angeben");
 const supabase=await createClient(); const admin=adminClient(); const {data:sessions,error:sessionsError}=await supabase.from("sessions").select("id,date").eq("club_id",clubId).gte("date",start).lte("date",end);
 if(sessionsError) redirect("/profile?absence_error=Trainings+konnte+nicht+geladen+werden"); const sessionIds=(sessions??[]).map(s=>Number(s.id)).filter(Number.isFinite);
 const {data:absence,error}=await admin.from("player_absences").insert({club_id:clubId,player_id:player.id,start_date:start,end_date:end,reason,note}).select("id").single(); if(error||!absence) redirect("/profile?absence_error=Abwesenheit+konnte+nicht+gespeichert+werden");
 if(sessionIds.length){const now=new Date().toISOString();const {error:rsvpError}=await admin.from("session_rsvps").upsert(sessionIds.map(session_id=>({club_id:clubId,session_id,player_id:player.id,status:"out",updated_at:now})),{onConflict:"session_id,player_id"});if(rsvpError){await admin.from("player_absences").delete().eq("id",absence.id);redirect("/profile?absence_error=Absagen+konnten+nicht+gespeichert+werden");}await admin.from("session_players").delete().eq("player_id",player.id).in("session_id",sessionIds);}
 revalidatePath("/home");revalidatePath("/profile");redirect(`/profile?absence_saved=${sessionIds.length}`);
}
export async function deleteAbsenceAction(formData:FormData){const {clubId,player}=await requireClub();if(!player)redirect("/profile");const id=Number(String(formData.get("absence_id")??""));if(!Number.isFinite(id))redirect("/profile");await adminClient().from("player_absences").delete().eq("id",id).eq("club_id",clubId).eq("player_id",player.id);revalidatePath("/profile");redirect("/profile");}
