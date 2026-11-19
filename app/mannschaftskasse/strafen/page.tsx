import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCashboxAccess } from "@/lib/cashbox/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPenaltyWorkflowClub } from "@/lib/cashbox/pilot-structure";
import { getServerI18n } from "@/lib/i18n/server";
import { formatCents, parseEuroToCents } from "@/lib/cashbox/money";
import { parseWheelSegments } from "@/lib/cashbox/wheel-config";
import { SKV_AH_CLUB_ID } from "@/lib/cashbox/pilot-structure";
import PenaltyFunWheel from "@/components/cashbox/PenaltyFunWheel";
import PenaltyFulfillmentForm from "./PenaltyFulfillmentForm";
import { pilotPenaltyAction } from "./actions";
import { addPenaltyAction } from "@/app/admin/penalties/actions";
import {parsePilotCashboxStructure} from "@/lib/cashbox/pilot-structure";

type Penalty={id:number;player_id:number;reason:string|null;value:string|null;type:string;source_key:string|null;resolved_at:string|null;created_at:string};
type Spin={penalty_id:number;outcome:string;outcome_label:string|null;outcome_detail:string|null;segments_snapshot:unknown};
type Settlement={penalty_id:number;state:string;effective_label:string;fulfillment_kind:string;amount_cents:number|null;payment_method:string|null;report_note:string;review_note:string};
type Event={penalty_id:number;action:string;occurred_at:string};
function effectivePayment(p:Penalty, spin?:Spin) {
  let isMoney=p.type==="money";
  let cents=isMoney?parseEuroToCents(p.value):null;
  const segment=spin?parseWheelSegments(spin.segments_snapshot)?.find((s)=>s.id===spin.outcome):undefined;
  const effect=segment?.effect;
  if(effect==="waive" || effect==="task" || effect==="goods"){
    isMoney=false;cents=null;
  }else if(effect==="fixed_money"){
    isMoney=true;cents=parseEuroToCents(segment?.effectValue??"");
  }else if(effect==="halve" && isMoney && cents!==null){
    cents=Math.round(cents/2);
  }else if(effect==="double" && isMoney && cents!==null){
    cents*=2;
  }
  return {isMoney, cents};
}
const field="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm";
const btn="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white";
const status:Record<string,string>={open:"Offen",reported:"Erfüllung gemeldet · Prüfung ausstehend",
 rejected:"Meldung abgelehnt",confirmed:"Erledigt",cancelled:"Storniert"};
export default async function PilotPenaltyPage({searchParams}:{searchParams?:Promise<{saved?:string;error?:string}>}){
 const q=await searchParams;
 const ctx=await requireCashboxAccess();
 if(!isPenaltyWorkflowClub(ctx.clubId)||ctx.isSupportView)redirect("/home");
 const {locale}=await getServerI18n();const en=locale==="en";
 const db=createAdminClient();
 const query=db.from("penalties").select("id,player_id,reason,value,type,source_key,resolved_at,created_at")
   .eq("club_id",ctx.clubId).order("created_at",{ascending:false}).limit(250);
 if(!ctx.player?.id)redirect("/home");
 query.eq("player_id",ctx.player.id);
 const {data:catalog}=ctx.canManageCashbox
   ?await db.from("penalty_rules").select("rule_key,label,type,value").eq("club_id",ctx.clubId).eq("enabled",true).order("sort_order")
   :{data:[]};
 const {data:pilotPaymentConfig}=ctx.clubId!==SKV_AH_CLUB_ID
  ?await db.from("cashbox_pilot_structures")
    .select("config").eq("club_id",ctx.clubId).maybeSingle()
  :{data:null};
 const {data:skvPenaltyPayment}=ctx.clubId===SKV_AH_CLUB_ID
  ?await db.from("penalty_payment_settings")
    .select("paypal_me_url,paypal_pool_url,sumup_url,cash_enabled")
    .eq("club_id",ctx.clubId).maybeSingle()
  :{data:null};
 // Only explicitly configured fine payment destinations are exposed to members.
 // The beer cashbox PayPal pool is never shown here unless separately saved.
 const payment=ctx.clubId===SKV_AH_CLUB_ID
   ?{
      paypalMeUrl:skvPenaltyPayment?.paypal_me_url??"",
      paypalPoolUrl:skvPenaltyPayment?.paypal_pool_url??"",
      sumupUrl:skvPenaltyPayment?.sumup_url??"",
      cashEnabled:skvPenaltyPayment?.cash_enabled===true,
    }
   :parsePilotCashboxStructure(pilotPaymentConfig?.config).payments;
 const methods=[
   ...(payment.paypalPoolUrl?[{key:"paypal",label:"PayPal-Pool",url:payment.paypalPoolUrl}]:[]),
   ...(payment.paypalMeUrl?[{key:"paypal_me",label:"PayPal.Me",url:payment.paypalMeUrl}]:[]),
   ...(payment.cashEnabled?[{key:"cash",label:en?"Cash":"Bar",url:""}]:[]),
   ...(payment.sumupUrl?[{key:"sumup",label:"SumUp",url:payment.sumupUrl}]:[]),
 ];
 const {data,error}=await query;
 if(error)throw new Error("Strafen konnten nicht geladen werden");
 const rows=(data??[]) as Penalty[];const ids=rows.map(x=>x.id);
 const [{data:states},{data:spins},{data:events},{data:players}]=await Promise.all([
   ids.length?db.from("pilot_penalty_settlements").select("penalty_id,state,effective_label,fulfillment_kind,amount_cents,payment_method,report_note,review_note").in("penalty_id",ids):Promise.resolve({data:[]}),
   ids.length?db.from("penalty_wheel_spins").select("penalty_id,outcome,outcome_label,outcome_detail,segments_snapshot").in("penalty_id",ids):Promise.resolve({data:[]}),
   ids.length?db.from("pilot_penalty_settlement_events").select("penalty_id,action,occurred_at").in("penalty_id",ids).order("occurred_at",{ascending:false}).limit(500):Promise.resolve({data:[]}),
   ctx.canManageCashbox?db.from("players").select("id,name,first_name,last_name,nickname").eq("club_id",ctx.clubId):Promise.resolve({data:[]}),
 ]);
 const stateMap=new Map(((states??[]) as Settlement[]).map(x=>[x.penalty_id,x]));
 const spinMap=new Map(((spins??[]) as Spin[]).map(x=>[x.penalty_id,x]));
 const names=new Map((players??[]).map(x=>[x.id,x.nickname||[x.first_name,x.last_name].filter(Boolean).join(" ")||x.name]));
 const history=new Map<number,Event[]>();
 for(const e of (events??[]) as Event[])history.set(e.penalty_id,[...(history.get(e.penalty_id)||[]),e]);
 const pending=rows.filter(x=>stateMap.get(x.id)?.state==="reported").length;
 return <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 pb-24"><div className="mx-auto max-w-3xl space-y-4">
  <Link href="/home" className="text-sm font-semibold text-slate-500">← Home</Link>
  <header className="py-2">
    <h1 className="text-2xl font-black tracking-tight text-slate-950">Meine offenen Posten</h1>
    <p className="mt-1 text-sm text-slate-500">Alles, was du noch erledigen musst.</p>
  </header>
  {q?.error?<p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{q.error==="wheel"?(en?"Spin the configured wheel first.":"Bitte zuerst das hinterlegte Glücksrad drehen.")
    :q.error==="payment"?(en?"This payment method is disabled.":"Dieser Zahlungsweg ist nicht freigeschaltet.")
    :en?"Request could not be saved; check status and fields.":"Aktion nicht möglich – bitte Status und Angaben prüfen."}</p>:null}
  {q?.saved?<p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{en?"Saved.":"Gespeichert."}</p>:null}
  {rows.filter(p=>!p.resolved_at && !["confirmed","cancelled"].includes(stateMap.get(p.id)?.state??"open")).length===0?<p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Alles erledigt. Du hast keine offenen Posten.</p>:null}
  {rows.filter(p=>!p.resolved_at && !["confirmed","cancelled"].includes(stateMap.get(p.id)?.state??"open")).map(p=>{const s=stateMap.get(p.id);const spin=spinMap.get(p.id);
    const payment=effectivePayment(p,spin);
    const requiresSpin=ctx.clubId===SKV_AH_CLUB_ID
      && new Date(p.created_at).getTime()>=Date.parse("2026-10-29T17:30:00Z")
      && !p.source_key?.startsWith("test:");
    const current=s?.state||(p.resolved_at?"confirmed":"open");
    const canReport=!p.resolved_at&&(!s||["open","rejected"].includes(s.state))&&ctx.player?.id===p.player_id;
    const canReview=false;
    const canCorrect=false;
    return <details key={p.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm open:border-violet-200">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-lg" aria-hidden>📋</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-slate-950">{p.reason||"Offener Posten"}</span>
          <span className="mt-0.5 block text-xs text-slate-500">{current==="reported"?"Wird geprüft":current==="rejected"?"Bitte erneut erledigen":canReport?"Noch zu erledigen":status[current]||"Offen"}</span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-violet-700 group-open:hidden">Öffnen →</span>
        <span className="hidden shrink-0 text-xs font-semibold text-slate-400 group-open:inline">Schließen ↑</span>
      </summary>
      <div className="space-y-4 border-t border-slate-100 px-4 pb-5 pt-5">
        {payment.isMoney && payment.cents!==null ? (
          <div className="text-center">
            <p className="text-xs font-medium text-slate-500">Deine Strafe</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{formatCents(payment.cents,locale)}</p>
          </div>
        ) : (
          <p className="text-center text-lg font-bold text-slate-950">{s?.effective_label||p.value||"Aufgabe erledigen"}</p>
        )}
        {p.source_key?.startsWith("test:")?<p className="text-center text-xs font-semibold text-cyan-700">Test · kein echtes Geld überweisen</p>:null}
        {current==="reported" ? (
          <p className="rounded-xl bg-slate-50 p-4 text-center text-sm font-semibold text-slate-700">Deine Meldung wird geprüft.</p>
        ) : canReport ? (
          <div className="space-y-3">
            {!spin && !s ? (
              <div className="rounded-2xl bg-slate-950 p-4 text-center text-white">
                <p className="text-base font-black">🎡 Willst du deine Strafe loswerden?</p>
                <p className="mt-1 text-xs text-slate-300">Versuch dein Glück – vielleicht wird’s günstiger.</p>
                <PenaltyFunWheel penaltyId={p.id}/>
              </div>
            ) : spin ? (
              <p className="rounded-xl bg-violet-50 p-3 text-center text-sm font-semibold text-violet-900">🎡 Dein Ergebnis: {spin.outcome_label}</p>
            ) : null}
            {requiresSpin && !spin ? (
              <p className="text-center text-xs text-slate-500">Dreh zuerst das Glücksrad, um fortzufahren.</p>
            ) : (
              <details className="rounded-xl border border-slate-200 bg-slate-50/70 p-3" open={!spin && !requiresSpin && !s}>
                <summary className="cursor-pointer text-center text-sm font-bold text-slate-900">
                  {payment.isMoney ? `${formatCents(payment.cents??0,locale)} bezahlen` : "Erfüllung melden"}
                </summary>
                <div className="mt-3">
                  <PenaltyFulfillmentForm penaltyId={p.id} methods={methods}
                    isMoney={payment.isMoney}
                    amountLabel={payment.isMoney && payment.cents!==null?formatCents(payment.cents,locale):null}/>
                </div>
              </details>
            )}
          </div>
        ) : (
          <p className="text-center text-sm text-slate-600">{status[current]||"Offen"}</p>
        )}
      </div>
    </details>;
  })}
 </div></main>;
}
