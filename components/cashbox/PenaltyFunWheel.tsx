"use client";
import { useEffect, useState } from "react";
const labels=["🍀 Joker","😎 Bleibt","🎤 Beichte","🔥 Challenge","😎 Bleibt","😎 Bleibt","🎤 Beichte","😎 Bleibt"];
export default function PenaltyFunWheel({penaltyId}:{penaltyId:number}) {
  const [outcome,setOutcome]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [turn,setTurn]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    void fetch(`/api/penalties/wheel?penaltyId=${penaltyId}`,{cache:"no-store"})
      .then(r=>r.ok?r.json():null)
      .then(data=>{if(active&&data?.outcome){setOutcome(data.outcome);setMessage(data.label||"");}})
      .catch(()=>{});
    return()=>{active=false;};
  },[penaltyId]);
  async function spin(){
    if(busy||outcome)return;
    setBusy(true);setError("");
    try{
      const res=await fetch("/api/penalties/wheel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({penaltyId})});
      const data=await res.json() as {outcome?:string;label?:string;error?:string};
      if(!res.ok)throw Error(data.error||"Dreh fehlgeschlagen.");
      setTurn(true);
      setOutcome(data.outcome??"usual");setMessage(data.label??"");
    }catch(e){setError(e instanceof Error?e.message:"Fehler");}
    finally{setBusy(false);}
  }
  return <details className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50/50 p-3">
    <summary className="cursor-pointer text-xs font-black text-cyan-800">🎡 Schicksalsrad · {outcome?"Ergebnis ansehen":"Einmal drehen!"}</summary>
    <div className="mt-3 space-y-3">
      <p className="text-[11px] text-slate-600">Reiner Kabinenspaß. Die Geld- oder Bierstrafe bleibt unverändert.</p>
      <div className="relative mx-auto h-52 w-52">
        <div className={`relative h-52 w-52 rounded-full border-[6px] border-white shadow-xl ${turn?"motion-safe:animate-[spin_1.6s_ease-out]":""}`}
          style={{background:"conic-gradient(#00adcf 0deg 45deg,#142b43 45deg 90deg,#bf6c3e 90deg 135deg,#096273 135deg 180deg,#11b6be 180deg 225deg,#223650 225deg 270deg,#e5a845 270deg 315deg,#096c80 315deg 360deg)"}}>
          {labels.map((text,i)=><span key={i} className="absolute left-1/2 top-1/2 origin-left text-[9px] font-black text-white" style={{transform:`rotate(${i*45-67.5}deg) translate(28px,-6px)`,whiteSpace:"nowrap"}}>{text}</span>)}
          <div className="absolute inset-[36%] flex items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">strikr</div>
        </div>
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl text-slate-950">▼</div>
      </div>
      {outcome?<div className="rounded-lg bg-white p-3 text-center text-sm font-bold text-slate-900">{message}</div>
        :<button disabled={busy} type="button" onClick={()=>void spin()} className="w-full rounded-xl bg-cyan-600 p-3 text-sm font-black text-white disabled:opacity-50">{busy?"Schicksal entscheidet …":"Jetzt drehen!"}</button>}
      <p className="text-center text-[10px] text-slate-500">1 Versuch pro Strafe · Ergebnis wird gespeichert</p>
      {error?<p role="alert" className="text-xs text-rose-700">{error}</p>:null}
    </div>
  </details>;
}
