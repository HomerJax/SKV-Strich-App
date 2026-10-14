import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PILOT_ACCESS } from "./access";
import FeedbackForm from "./FeedbackForm";
export const dynamic="force-dynamic";
export const metadata={title:"Pilotteams Feedback | strikr"};
export default async function PilotFeedbackPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login?next=/pilot-feedback");
 const clubId=PILOT_ACCESS[user.id];
 if(!clubId)return <main className="mx-auto max-w-xl px-4 py-12"><h1 className="text-2xl font-bold">Kein Zugriff</h1><p className="mt-3 text-slate-600">Dieser Fragebogen ist nur für persönlich eingeladene Testpersonen vorgesehen.</p></main>;
 const [{data:club},{data:existing}]=await Promise.all([supabase.from("clubs").select("display_name,name").eq("id",clubId).maybeSingle(),supabase.from("pilot_admin_feedback").select("id").eq("user_id",user.id).eq("club_id",clubId).maybeSingle()]);
 return <main className="mx-auto max-w-xl px-4 py-8 pb-24"><div className="mb-6"><div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">strikr · Pilotphase</div><h1 className="text-3xl font-extrabold text-slate-950">Dein Admin-Feedback</h1><p className="mt-2 text-sm text-slate-600">Für {club?.display_name||club?.name||"deinen Verein"} · ca. 3 Minuten. Ehrlich und direkt – auch Kritik ist willkommen.</p></div>{existing?<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900"><h2 className="font-bold">Danke! Dein Feedback ist bereits eingegangen.</h2></div>:<FeedbackForm/>}</main>;
}
