import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerI18n } from "@/lib/i18n/server";
import { isPenaltyWorkflowClub, isCashboxPilotClub, parsePilotCashboxStructure } from "@/lib/cashbox/pilot-structure";
import PaymentEditor from "./PaymentEditor";
export default async function PaymentSettings({searchParams}:{searchParams?:Promise<{saved?:string;error?:string}>}){
 const ctx=await requireClub();
 if(ctx.isSupportView||!isPenaltyWorkflowClub(ctx.clubId)||
  !canManageClub({role:ctx.membership.role,isPowerUser:ctx.isPowerUser}))redirect("/home");
 const q=await searchParams;const {locale}=await getServerI18n();

 const db=createAdminClient();
 const {data,error}=await db.from("cashbox_pilot_structures").select("config").eq("club_id",ctx.clubId).maybeSingle();
 if(error)throw new Error("Zahlungseinstellungen konnten nicht geladen werden");
 const {data:existingSkv}=!isCashboxPilotClub(ctx.clubId) && !data
  ?await db.from("club_settings").select("beerkasse_paypal_url,beerkasse_paypal_me_url,beerkasse_sumup_url,beerkasse_cash_enabled")
      .eq("club_id",ctx.clubId).maybeSingle():{data:null};
 const initial=parsePilotCashboxStructure(data?.config);
 const setup=existingSkv?{...initial,payments:{
   paypalPoolUrl:existingSkv.beerkasse_paypal_url||"",
   paypalMeUrl:existingSkv.beerkasse_paypal_me_url||"",
   sumupUrl:existingSkv.beerkasse_sumup_url||"",
   cashEnabled:existingSkv.beerkasse_cash_enabled!==false,
 }}:initial;
 
 return <main className="min-h-screen bg-slate-50 px-4 py-6 pb-20">
  <div className="mx-auto max-w-3xl space-y-4">
   <Link href="/mannschaftskasse/strafen" className="text-sm font-bold text-slate-600">← {locale==="en"?"Penalties":"Strafen"}</Link>
   <header className="rounded-2xl bg-slate-950 p-5 text-white">
    <h1 className="text-2xl font-black">{locale==="en"?"Accepted payment methods":"Zahlungswege für Mannschaftskasse & Strafen"}</h1>
    <p className="mt-2 text-sm text-white/75">Hier kannst du PayPal-Pool, PayPal.Me und Barzahlung für Strafen festlegen. Diese Zahlungswege sind von der Bierkasse getrennt. Spieler melden nur eine Zahlung; der Kassenwart bestätigt den Geldeingang.</p>
   </header>
   {q?.saved?<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Zahlungswege gespeichert.</p>:null}
   {q?.error?<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">Ungültiger Zahlungslink oder Speichern fehlgeschlagen.</p>:null}
   <PaymentEditor initial={setup}/>
  </div>
 </main>;
}