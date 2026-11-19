import Link from "next/link";
import { requireBeerManagementAccess } from "@/lib/cashbox/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { markBeerCashPaidAction, cancelBeerConsumptionAction } from "../../actions";

type Row = { id:number;player_id:number;quantity:number;unit_price_cents:number;total_cents:number;donation_cents:number;payment_method:string;created_at:string };
type Player = {id:number;name:string|null;first_name:string|null;last_name:string|null;nickname:string|null};
const money=(n:number)=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(n/100);
export default async function BeerReviewPage({searchParams}:{searchParams?:Promise<{saved?:string;error?:string}>}) {
 const {clubId}=await requireBeerManagementAccess();
 const q=await searchParams;
 const db=createAdminClient();
 const [{data:entries},{data:players},{data:settings}]=await Promise.all([
  db.from("beer_consumptions").select("id,player_id,quantity,unit_price_cents,total_cents,donation_cents,payment_method,created_at").eq("club_id",clubId).eq("payment_status","pending").is("cancelled_at",null).order("created_at",{ascending:false}),
  db.from("players").select("id,name,first_name,last_name,nickname").eq("club_id",clubId),
  db.from("club_settings").select("beerkasse_paypal_url").eq("club_id",clubId).maybeSingle()
 ]);
 const rows=(entries??[]) as Row[];
 const names=new Map(((players??[]) as Player[]).map(p=>[p.id,p.nickname||[p.first_name,p.last_name].filter(Boolean).join(" ")||p.name||"Spieler"]));
 const groups=[{title:"Barzahlung",subtitle:"Bargeld erhalten und erst dann bestätigen",items:rows.filter(x=>x.payment_method==="cash")},{title:"PayPal & SumUp",subtitle:"Zahlungseingang vor der Bestätigung prüfen",items:rows.filter(x=>x.payment_method!=="cash")}];
 return <main className="min-h-screen bg-slate-50 px-4 pb-24 pt-5"><div className="mx-auto max-w-2xl space-y-5">
  <div className="flex items-center justify-between"><Link href="/home" className="text-sm font-semibold text-slate-600">← Home</Link><Link href="/mannschaftskasse/bier" className="text-xs font-bold text-teal-700">Alle Buchungen</Link></div>
  <header className="rounded-3xl bg-gradient-to-br from-slate-950 to-teal-950 px-5 py-6 text-white"><div className="text-[11px] font-bold uppercase tracking-widest text-teal-300">Bierkasse · Kassenwart</div><h1 className="mt-2 text-2xl font-black">Zahlungen prüfen</h1><p className="mt-1 text-sm text-slate-300">{rows.length===0?"Alles erledigt. Keine offenen Zahlungen.":rows.length+" offene "+(rows.length===1?"Zahlung":"Zahlungen")+" · "+money(rows.reduce((a,x)=>a+x.total_cents,0))}</p></header>
  {q?.saved?<p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">✓ Änderung gespeichert.</p>:null}
  {q?.error?<p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">{q.error}</p>:null}
  {groups.map(g=><section key={g.title} className="space-y-3"><div className="flex items-center justify-between"><div><h2 className="text-base font-black text-slate-950">{g.title}</h2><p className="text-xs text-slate-500">{g.subtitle}</p></div><span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-black text-slate-700">{g.items.length}</span></div>
  {g.items.length===0?<div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-400">Keine offenen Zahlungen</div>:g.items.map(x=><article key={x.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-950">{names.get(x.player_id)}</h3><p className="mt-1 text-xs text-slate-500">{x.quantity} 🍺 · {x.payment_method==="cash"?"Bar":x.payment_method==="sumup"?"SumUp":"PayPal"} · {new Date(x.created_at).toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short"})}</p>{x.donation_cents>0?<p className="mt-1 text-xs font-semibold text-teal-700">+ {money(x.donation_cents)} Spende enthalten</p>:null}</div><strong className="whitespace-nowrap text-xl text-slate-950">{money(x.total_cents)}</strong></div>
   <form action={markBeerCashPaidAction} className="mt-4"><input type="hidden" name="consumption_id" value={x.id}/><details className="mb-3 rounded-xl bg-slate-50 px-3 py-2"><summary className="cursor-pointer text-xs font-semibold text-slate-600">Anderen Zahlungseingang erfassen</summary><label className="mt-3 block text-xs text-slate-600">Tatsächlicher Betrag (€)<input type="number" name="actual_amount_euros" min={x.quantity*x.unit_price_cents/100} max="1000" step="0.01" inputMode="decimal" placeholder={(x.total_cents/100).toFixed(2)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-900"/></label></details><button className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-black text-white active:scale-[.99]">✓ Zahlung erhalten · Bestätigen</button></form>
   <form action={cancelBeerConsumptionAction} className="mt-3 flex justify-end border-t border-slate-100 pt-3">
     <input type="hidden" name="consumption_id" value={x.id}/>
     <button type="submit" className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">Buchung stornieren</button>
   </form>
  </article>)}</section>)}
  {settings?.beerkasse_paypal_url?<a href={settings.beerkasse_paypal_url} target="_blank" rel="noopener noreferrer" className="block text-center text-xs font-bold text-teal-700">PayPal-Zahlungen öffnen ↗</a>:null}
 </div></main>;
}
