"use client";

import { useState } from "react";
import { Banknote, CreditCard, X } from "lucide-react";
import { pilotPenaltyAction } from "./actions";

export type PenaltyPaymentMethod = { key:string; label:string; url:string };

export default function PenaltyFulfillmentForm({penaltyId,methods,isMoney,amountLabel}:{
  penaltyId:number;methods:PenaltyPaymentMethod[];isMoney:boolean;amountLabel?:string|null;
}){
  const [open,setOpen]=useState(false);
  const [selected,setSelected]=useState<PenaltyPaymentMethod|null>(null);
  const [note,setNote]=useState("");
  const submitMethod=selected?.key??"";
  return <>
    <button type="button" onClick={()=>setOpen(true)} className="w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white">
      {isMoney?"Zahlungsart auswählen":"Erfüllung melden"} →
    </button>
    {open?<div role="presentation" className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/40 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={e=>{if(e.target===e.currentTarget){setOpen(false);setSelected(null)}}}>
      <div role="dialog" aria-modal="true" aria-labelledby="penalty-checkout-title" className="max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-[30px] bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:max-w-md sm:rounded-[30px] sm:p-6">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden"/>
        <div className="flex items-start justify-between gap-3"><div>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-700">⚖️ Offener Posten</p>
          <h2 id="penalty-checkout-title" className="mt-1 text-2xl font-black text-slate-950">{isMoney?"Wie möchtest du bezahlen?":"Erfüllung melden"}</h2>
          {amountLabel?<p className="mt-1 text-sm font-semibold text-slate-500">{amountLabel}</p>:null}
        </div><button type="button" aria-label="Schließen" onClick={()=>{setOpen(false);setSelected(null)}} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"><X size={20}/></button></div>
        {isMoney&&!selected?<div className="mt-6 space-y-2">
          {methods.map(m=><button key={m.key} type="button" onClick={()=>setSelected(m)} className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-sm font-black shadow-sm ${m.key.startsWith("paypal")?"bg-[#0070ba] text-white":"border border-slate-200 bg-white text-slate-900"}`}>
            <span className="flex items-center gap-3">{m.key==="cash"?<Banknote size={20}/>:<CreditCard size={20}/>} {m.key==="cash"?"Bar bezahlen":m.key.startsWith("paypal")?"Mit PayPal bezahlen":m.label}</span><span>→</span>
          </button>)}
          {methods.length===0?<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Der Verein hat noch keinen Zahlungsweg aktiviert.</p>:null}
        </div>:null}
        {(!isMoney||selected)?<form action={pilotPenaltyAction} className="mt-5 space-y-4">
          <input type="hidden" name="penalty_id" value={penaltyId}/>
          <input type="hidden" name="action" value="report"/>
          <input type="hidden" name="payment_method" value={submitMethod}/>
          {isMoney?<div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-900">{selected?.key==="cash"?"Barzahlung":"Digitale Zahlung"}</p>
            <p className="mt-1 text-sm text-slate-600">{selected?.key==="cash"?"Übergib den Betrag an den Kassenwart. Melde die Zahlung erst danach.":"Bezahle den Betrag über den hinterlegten Zahlungsweg und melde anschließend die Zahlung."}</p>
            {selected?.url?<a href={selected.url} target="_blank" rel="noopener noreferrer" className="mt-3 block rounded-xl bg-[#0070ba] px-4 py-3 text-center text-sm font-black text-white">Jetzt bezahlen ↗</a>:null}
          </div>:<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Melde die erledigte Aufgabe oder den Joker zur Prüfung.</p>}
          <label className="block text-xs font-semibold text-slate-600">Notiz (optional)
            <input name="note" value={note} onChange={e=>setNote(e.target.value)} maxLength={500} placeholder="Nachricht an den Kassenwart" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/>
          </label>
          <button className="w-full rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white">{isMoney?"Zahlung zur Bestätigung melden":"Erfüllung zur Bestätigung melden"}</button>
          <p className="text-center text-xs text-slate-500">Der Kassenwart muss deine Meldung bestätigen.</p>
          {isMoney?<button type="button" onClick={()=>setSelected(null)} className="w-full py-2 text-xs font-semibold text-slate-500">Andere Zahlungsart wählen</button>:null}
        </form>:null}
      </div>
    </div>:null}
  </>;
}
