"use client";
import { useEffect, useState } from "react";
const angles:Record<string,number>={lucky:342,usual:198,confession:45,challenge:9};
export default function PenaltyFunWheel({penaltyId}:{penaltyId:number}) {
  const [outcome,setOutcome]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [angle,setAngle]=useState(0);
  const [animate,setAnimate]=useState(false);
  const [reveal,setReveal]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    void fetch(`/api/penalties/wheel?penaltyId=${penaltyId}`,{cache:"no-store"})
      .then(r=>r.ok?r.json():null)
      .then(data=>{if(active&&data?.outcome){
        setOutcome(data.outcome);
        setMessage(data.label||"");
        setAngle(angles[data.outcome]??0);
        setAnimate(false);
        setReveal(true);
      }})
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
      const selected=data.outcome??"usual";
      setReveal(false);
      setAnimate(true);
      setAngle(1800+(angles[selected]??198));
      setOutcome(selected);
      setMessage(data.label??"");
      window.setTimeout(()=>setReveal(true),2800);
    }catch(e){setError(e instanceof Error?e.message:"Fehler");}
    finally{setBusy(false);}
  }
  return <details className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50/50 p-3">
    <summary className="cursor-pointer text-xs font-black text-cyan-800">🎡 Schicksalsrad · {outcome?"Ergebnis ansehen":"Einmal drehen!"}</summary>
    <div className="mt-3 space-y-3">
      <p className="text-[11px] text-slate-600">Reiner Kabinenspaß. Die Geld- oder Bierstrafe bleibt unverändert.</p>
      <div className="relative mx-auto h-52 w-52">
        <div className="relative h-52 w-52 rounded-full border-[6px] border-white shadow-xl"
          style={{
            background:"conic-gradient(#00adcf 0deg 36deg,#142b43 36deg 288deg,#db9b3d 288deg 342deg,#9b4160 342deg 360deg)",
            transform:`rotate(${angle}deg)`,
            transition:animate?"transform 2800ms cubic-bezier(0.15,0.85,0.2,1)":"none"
          }}>
          <div className="absolute inset-[36%] flex items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">strikr</div>
        </div>
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl text-slate-950">▼</div>
      </div>
      <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600">
        <span>🍀 Joker: 10 %</span><span>😎 Bleibt: 70 %</span>
        <span>🎤 Beichte: 15 %</span><span>🔥 Challenge: 5 %</span>
      </div>
      {outcome?(reveal?<div role="status" className="rounded-lg bg-white p-3 text-center text-sm font-bold text-slate-900">{message}</div>:<p className="text-center text-sm font-bold text-cyan-700">Das Schicksal entscheidet …</p>)
        :<button disabled={busy} type="button" onClick={()=>void spin()} className="w-full rounded-xl bg-cyan-600 p-3 text-sm font-black text-white disabled:opacity-50">{busy?"Schicksal entscheidet …":"Jetzt drehen!"}</button>}
      <p className="text-center text-[10px] text-slate-500">1 Versuch pro Strafe · Ergebnis wird serverseitig gespeichert</p>
      {error?<p role="alert" className="text-xs text-rose-700">{error}</p>:null}
    </div>
  </details>;
}
