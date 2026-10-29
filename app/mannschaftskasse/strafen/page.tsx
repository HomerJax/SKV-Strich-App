import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCashboxAccess } from "@/lib/cashbox/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCashboxPilotClub } from "@/lib/cashbox/pilot-structure";
import { getServerI18n } from "@/lib/i18n/server";
import { formatCents } from "@/lib/cashbox/money";
import PenaltyFunWheel from "@/components/cashbox/PenaltyFunWheel";
import { pilotPenaltyAction } from "./actions";
import { addPenaltyAction } from "@/app/admin/penalties/actions";
import {parsePilotCashboxStructure} from "@/lib/cashbox/pilot-structure";

type Penalty={id:number;player_id:number;reason:string|null;value:string|null;type:string;source_key:string|null;resolved_at:string|null};
type Settlement={penalty_id:number;state:string;effective_label:string;fulfillment_kind:string;amount_cents:number|null;payment_method:string|null;report_note:string;review_note:string};
type Event={penalty_id:number;action:string;occurred_at:string};
const field="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm";
const btn="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white";
const status:Record<string,string>={open:"Offen",reported:"Erfüllung gemeldet · Prüfung ausstehend",
 rejected:"Meldung abgelehnt",confirmed:"Erledigt",cancelled:"Storniert"};
export default async function PilotPenaltyPage({searchParams}:{searchParams?:Promise<{saved?:string;error?:string}>}){
 const q=await searchParams;
 const ctx=await requireCashboxAccess();
 if(!isCashboxPilotClub(ctx.clubId)||ctx.isSupportView)redirect("/home");
 const {locale}=await getServerI18n();const en=locale==="en";
 const db=createAdminClient();
 const query=db.from("penalties").select("id,player_id,reason,value,type,source_key,resolved_at")
   .eq("club_id",ctx.clubId).order("created_at",{ascending:false}).limit(250);
 if(!ctx.canManageCashbox){
   if(!ctx.player?.id)redirect("/home");
   query.eq("player_id",ctx.player.id);
 }
 const {data:catalog}=ctx.canManageCashbox
   ?await db.from("penalty_rules").select("rule_key,label,type,value").eq("club_id",ctx.clubId).eq("enabled",true).order("sort_order")
   :{data:[]};
 const {data:paymentConfig}=await db.from("cashbox_pilot_structures")
  .select("config").eq("club_id",ctx.clubId).maybeSingle();
 const payment=parsePilotCashboxStructure(paymentConfig?.config).payments;
 const methods=[
   ...(payment.cashEnabled?[{key:"cash",label:en?"Cash":"Bar",url:""}]:[]),
   ...(payment.paypalPoolUrl?[{key:"paypal",label:"PayPal-Pool",url:payment.paypalPoolUrl}]:[]),
   ...(payment.paypalMeUrl?[{key:"paypal_me",label:"PayPal.Me",url:payment.paypalMeUrl}]:[]),
   ...(payment.sumupUrl?[{key:"sumup",label:"SumUp",url:payment.sumupUrl}]:[]),
 ];
 const {data,error}=await query;
 if(error)throw new Error("Strafen konnten nicht geladen werden");
 const rows=(data??[]) as Penalty[];const ids=rows.map(x=>x.id);
 const [{data:states},{data:spins},{data:events},{data:players}]=await Promise.all([
   ids.length?db.from("pilot_penalty_settlements").select("penalty_id,state,effective_label,fulfillment_kind,amount_cents,payment_method,report_note,review_note").in("penalty_id",ids):Promise.resolve({data:[]}),
   ids.length?db.from("penalty_wheel_spins").select("penalty_id,outcome_label,outcome_detail").in("penalty_id",ids):Promise.resolve({data:[]}),
   ids.length?db.from("pilot_penalty_settlement_events").select("penalty_id,action,occurred_at").in("penalty_id",ids).order("occurred_at",{ascending:false}).limit(500):Promise.resolve({data:[]}),
   ctx.canManageCashbox?db.from("players").select("id,name,first_name,last_name,nickname").eq("club_id",ctx.clubId):Promise.resolve({data:[]}),
 ]);
 const stateMap=new Map(((states??[]) as Settlement[]).map(x=>[x.penalty_id,x]));
 const spinMap=new Map(((spins??[]) as {penalty_id:number;outcome_label:string|null;outcome_detail:string|null}[]).map(x=>[x.penalty_id,x]));
 const names=new Map((players??[]).map(x=>[x.id,x.nickname||[x.first_name,x.last_name].filter(Boolean).join(" ")||x.name]));
 const history=new Map<number,Event[]>();
 for(const e of (events??[]) as Event[])history.set(e.penalty_id,[...(history.get(e.penalty_id)||[]),e]);
 const pending=rows.filter(x=>stateMap.get(x.id)?.state==="reported").length;
 return <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 pb-24"><div className="mx-auto max-w-3xl space-y-4">
  <Link href="/mannschaftskasse" className="text-sm font-bold text-slate-600">← {en?"Cashbox":"Mannschaftskasse"}</Link>
  <header className="rounded-2xl bg-slate-950 p-5 text-white">
   <p className="text-xs font-bold uppercase tracking-widest text-teal-300">strikr · Pilot</p>
   <h1 className="mt-2 text-2xl font-black">{ctx.canManageCashbox?(en?"Review penalties":"Strafen prüfen"):(en?"My penalties":"Meine Strafen")}</h1>
   <p className="mt-2 text-sm text-slate-200">{en?"Only confirmed money payments are posted to the cash ledger.":"Geld wird erst nach bestätigtem Zahlungseingang gebucht."}</p>
   {ctx.canManageCashbox?<p className="mt-2 text-xs font-black">{pending} {en?"pending reports":"Meldungen zu prüfen"}</p>:null}
  </header>
  {q?.error?<p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{q.error==="wheel"?(en?"Spin the configured wheel first.":"Bitte zuerst das hinterlegte Glücksrad drehen.")
    :q.error==="payment"?(en?"This payment method is disabled.":"Dieser Zahlungsweg ist nicht freigeschaltet.")
    :en?"Request could not be saved; check status and fields.":"Aktion nicht möglich – bitte Status und Angaben prüfen."}</p>:null}
  {q?.saved?<p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{en?"Saved.":"Gespeichert."}</p>:null}
  {ctx.isClubAdmin?<Link className="block rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm font-black text-teal-950"
    href="/mannschaftskasse/zahlungen">💳 Zahlungswege für Strafen einrichten / bearbeiten →</Link>:null}
  {ctx.canManageCashbox?<details className="rounded-xl border border-teal-200 bg-white p-4">
    <summary className="cursor-pointer text-sm font-black text-teal-950">{en?"Create penalty":"Neue Strafe anlegen"}</summary>
    <form action={addPenaltyAction} className="mt-3 space-y-2">
      <select name="player_id" required className={field} defaultValue="">
        <option value="" disabled>{en?"Choose player":"Spieler auswählen"}</option>
        {(players??[]).map(p=><option key={p.id} value={p.id}>{names.get(p.id)||"Spieler"}</option>)}
      </select>
      <label className="block text-xs font-black text-slate-700">Strafenkatalog (optional)
        <select name="preset" className={field} defaultValue="">
          <option value="">Individuelle Strafe</option>
          {(catalog??[]).map(rule=><option key={rule.rule_key} value={rule.rule_key}>{rule.label} · {rule.value}</option>)}
        </select>
      </label>
      <input name="reason" className={field} required maxLength={120} placeholder={en?"Reason":"Grund, z. B. nach Deadline abgesagt"}/>
      <select name="type" className={field} defaultValue="money">
        <option value="money">{en?"Money":"Geld"}</option>
        <option value="beer">{en?"Beer / goods":"Bier / Sachleistung"}</option>
        <option value="custom">{en?"Other task":"Andere Aufgabe"}</option>
      </select>
      <input name="value" className={field} required maxLength={100} placeholder={en?"e.g. 2 or 1 crate":"z. B. 2 oder 1 Kiste Bier"}/>
      <button className={btn}>{en?"Add penalty":"Strafe speichern"}</button>
    </form>
  </details>:null}
  {rows.length===0?<p className="rounded-xl bg-white p-4 text-sm text-slate-600">{en?"No penalties yet.":"Noch keine Strafen."}</p>:null}
  {rows.map(p=>{const s=stateMap.get(p.id);const spin=spinMap.get(p.id);
    const current=s?.state||(p.resolved_at?"confirmed":"open");
    const canReport=!p.resolved_at&&(!s||["open","rejected"].includes(s.state))&&ctx.player?.id===p.player_id;
    const canReview=ctx.canManageCashbox&&current==="reported";
    const canCorrect=ctx.canManageCashbox&&Boolean(s);
    return <section key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
       <div><p className="text-xs text-slate-500">{names.get(p.player_id)||""} · #{p.id}</p>
        <h2 className="font-black text-slate-950">{p.reason||"Strafe"}</h2>
        <p className="text-sm text-slate-600">{s?.effective_label||p.value}</p>
        {spin?<p className="text-xs font-bold text-violet-700">🎡 {spin.outcome_label}{spin.outcome_detail?" · "+spin.outcome_detail:""}</p>:null}
        {p.source_key?.startsWith("test:")?<p className="text-xs font-bold text-amber-800">{en?"Test – no actual payment":"Test – keine echte Zahlung"}</p>:null}
       </div><span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold">{en?current:status[current]}</span>
      </div>
      {s?.fulfillment_kind==="money"?<p className="mt-2 text-sm font-bold">{formatCents(s.amount_cents??0,locale)} · {s.payment_method}</p>:null}
      {s?.report_note?<p className="mt-1 text-xs text-slate-600">{en?"Reported":"Gemeldet"}: {s.report_note}</p>:null}
      {s?.review_note?<p className="mt-1 text-xs text-slate-600">{en?"Reviewed":"Kassenwart"}: {s.review_note}</p>:null}
      {canReport?<div className="mt-4 space-y-2">
        {!s?<PenaltyFunWheel penaltyId={p.id}/>:null}
        <form action={pilotPenaltyAction} className="space-y-2 rounded-xl bg-slate-50 p-3">
         <input type="hidden" name="penalty_id" value={p.id}/><input type="hidden" name="action" value="report"/>
         {methods.length>0?<label className="block text-xs font-bold">{en?"Payment method if money is owed":"Zahlungsweg (falls Geld geschuldet)"}
           <select name="payment_method" className={field} defaultValue={methods[0].key}>
             {methods.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
           </select>
         </label>:<p className="text-xs font-bold text-rose-700">Kein Zahlungsweg freigeschaltet. Bitte Admin kontaktieren.</p>}
         {methods.some(m=>m.url)?<div className="flex flex-wrap gap-2">
           {methods.filter(m=>m.url).map(m=><a key={m.key} href={m.url} target="_blank" rel="noopener noreferrer"
             className="rounded-lg bg-teal-100 px-3 py-2 text-xs font-black text-teal-950">{m.label} öffnen ↗</a>)}
         </div>:null}
         <input className={field} name="note" maxLength={500} placeholder={en?"Optional note":"Notiz: wann, wie oder wo bezahlt / abgegeben"}/>
         <button className={btn}>{en?"Report payment/completion":"Zahlung / Erfüllung melden"}</button>
         <p className="text-xs text-slate-500">{en?"A report is not proof of payment.":"Erst der Kassenwart bestätigt den Eingang."}</p>
        </form></div>:null}
      {canReview?<div className="mt-3 grid gap-2 rounded-xl bg-amber-50 p-3 sm:grid-cols-2">
        <form action={pilotPenaltyAction} className="space-y-2">
         <input name="action" type="hidden" value="confirm"/><input name="penalty_id" type="hidden" value={p.id}/>
         <input name="note" className={field} maxLength={500} placeholder="Prüfnotiz (optional)"/>
         <button className={btn}>{en?"Confirm received":"Eingang / Erfüllung bestätigen"}</button>
        </form>
        <form action={pilotPenaltyAction} className="space-y-2">
         <input name="action" type="hidden" value="reject"/><input name="penalty_id" type="hidden" value={p.id}/>
         <input name="note" className={field} required minLength={3} maxLength={500} placeholder="Ablehnungsgrund"/>
         <button className={btn}>{en?"Reject":"Meldung ablehnen"}</button>
        </form>
       </div>:null}
      {ctx.canManageCashbox&&current!=="confirmed"&&current!=="cancelled"?<form action={pilotPenaltyAction} className="mt-3 flex gap-2">
        <input name="action" type="hidden" value="cancel"/><input name="penalty_id" type="hidden" value={p.id}/>
        <input name="note" className={field} required minLength={3} maxLength={500} placeholder="Storno-/Entschuldigungsgrund"/>
        <button className={btn}>{en?"Cancel":"Stornieren"}</button>
       </form>:null}
      {canCorrect&&(current==="confirmed"||current==="cancelled")?<form action={pilotPenaltyAction} className="mt-3 flex gap-2">
        <input name="action" type="hidden" value="reopen"/><input name="penalty_id" type="hidden" value={p.id}/>
        <input name="note" className={field} required minLength={3} maxLength={500} placeholder="Korrekturgrund"/>
        <button className={btn}>{en?"Reopen":"Wieder öffnen"}</button>
       </form>:null}
      {(history.get(p.id)||[]).length>0?<details className="mt-3 border-t pt-2 text-xs text-slate-600">
       <summary className="cursor-pointer font-bold">Verlauf ({history.get(p.id)?.length})</summary>
       {(history.get(p.id)||[]).map((e,i)=><p key={i} className="mt-1">{new Date(e.occurred_at).toLocaleString("de-DE")} · {e.action}</p>)}
      </details>:null}
    </section>;
  })}
 </div></main>;
}
