import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerI18n } from "@/lib/i18n/server";
import { isPenaltyWorkflowClub, isCashboxPilotClub, parsePilotCashboxStructure } from "@/lib/cashbox/pilot-structure";
import PaymentEditor, { type PenaltyPaymentValues } from "./PaymentEditor";

export default async function PaymentSettings({searchParams}:{searchParams?:Promise<{saved?:string;error?:string}>}){
 const ctx=await requireClub();
 if(ctx.isSupportView||!isPenaltyWorkflowClub(ctx.clubId)||
   !canManageClub({role:ctx.membership.role,isPowerUser:ctx.isPowerUser}))redirect("/home");
 const q=await searchParams;const {locale}=await getServerI18n();
 const db=createAdminClient();
 const isPilot=isCashboxPilotClub(ctx.clubId);
 let initial:PenaltyPaymentValues={paypalMeUrl:"",paypalPoolUrl:"",sumupUrl:"",cashEnabled:false};
 if(isPilot){
   const {data,error}=await db.from("cashbox_pilot_structures").select("config").eq("club_id",ctx.clubId).maybeSingle();
   if(error)throw new Error("Zahlungseinstellungen konnten nicht geladen werden");
   initial=parsePilotCashboxStructure(data?.config).payments;
 } else {
   // Only SKV penalty payment settings. Never copy beer payment destinations.
   const {data,error}=await db.from("penalty_payment_settings")
     .select("paypal_me_url,paypal_pool_url,sumup_url,cash_enabled")
     .eq("club_id",ctx.clubId).maybeSingle();
   if(error)throw new Error("Zahlungseinstellungen konnten nicht geladen werden");
   if(data)initial={
     paypalMeUrl:data.paypal_me_url??"",
     paypalPoolUrl:data.paypal_pool_url??"",
     sumupUrl:data.sumup_url??"",
     cashEnabled:data.cash_enabled===true,
   };
 }
 return <main className="min-h-screen bg-slate-50 px-4 py-6 pb-20">
  <div className="mx-auto max-w-3xl space-y-4">
   <Link href="/mannschaftskasse/strafen" className="text-sm font-bold text-slate-600">← {locale==="en"?"Penalties":"Strafen"}</Link>
   <header className="rounded-2xl bg-slate-950 p-5 text-white">
    <p className="text-xs font-bold uppercase tracking-widest text-teal-300">Mannschaftskasse · Einstellungen</p>
    <h1 className="mt-2 text-2xl font-black">{locale==="en"?"Penalty payment methods":"Zahlungswege für Strafen"}</h1>
    <p className="mt-2 text-sm text-white/75">
      Hier legst du ausschließlich fest, wohin Strafzahlungen gehen.
      Die Zahlungslinks und Konten der Bierkasse bleiben unverändert.
    </p>
   </header>
   {q?.saved?<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Zahlungswege für Strafen gespeichert.</p>:null}
   {q?.error?<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">Zahlungslink ungültig oder Speichern fehlgeschlagen.</p>:null}
   <PaymentEditor initial={initial}/>
  </div>
 </main>;
}
