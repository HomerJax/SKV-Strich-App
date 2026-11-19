"use client";

import { useState } from "react";
import PenaltyFunWheel from "@/components/cashbox/PenaltyFunWheel";
import PenaltyFulfillmentForm, { type PenaltyPaymentMethod } from "./PenaltyFulfillmentForm";

type Props = {
  penaltyId: number;
  methods: PenaltyPaymentMethod[];
  isMoney: boolean;
  amountLabel: string | null;
  requiresSpin: boolean;
  hasSpin: boolean;
  wheelResult?: string | null;
};

export default function PenaltyChoice({penaltyId,methods,isMoney,amountLabel,requiresSpin,hasSpin,wheelResult}:Props){
  const [choice,setChoice]=useState<"wheel"|"pay"|null>(hasSpin?"pay":null);
  return <div className="space-y-3">
    {hasSpin && wheelResult ? <p className="rounded-xl bg-violet-50 p-3 text-center text-sm font-semibold text-violet-900">🎡 Dein Ergebnis: {wheelResult}</p> : null}
    {!hasSpin ? <>
      <p className="text-center text-sm font-semibold text-slate-700">Wie möchtest du weitermachen?</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={()=>setChoice("wheel")} aria-pressed={choice==="wheel"}
          className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${choice==="wheel"?"border-violet-500 bg-violet-50 text-violet-900":"border-slate-200 bg-white text-slate-800"}`}>
          🎡 Glücksrad drehen
        </button>
        <button type="button" disabled={requiresSpin} onClick={()=>setChoice("pay")} aria-pressed={choice==="pay"}
          className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${choice==="pay"?"border-violet-500 bg-violet-50 text-violet-900":"border-slate-200 bg-white text-slate-800"} disabled:cursor-not-allowed disabled:opacity-40`}>
          {isMoney?"Strafe begleichen":"Posten erledigen"}
        </button>
      </div>
      {requiresSpin?<p className="text-center text-xs text-slate-500">Für diesen Posten ist das Glücksrad vorgeschrieben.</p>:null}
    </>:null}
    {choice==="wheel"&&!hasSpin?<div className="rounded-2xl bg-slate-950 p-3 text-white"><PenaltyFunWheel penaltyId={penaltyId}/></div>:null}
    {choice==="pay"&&(!requiresSpin||hasSpin)?<div className="space-y-2">
      <p className="text-center text-sm font-bold text-slate-800">{isMoney?"Zahlung via hinterlegtem Zahlungsweg":"Erfüllung melden"}</p>
      <PenaltyFulfillmentForm penaltyId={penaltyId} methods={methods} isMoney={isMoney} amountLabel={amountLabel}/>
    </div>:null}
  </div>;
}
