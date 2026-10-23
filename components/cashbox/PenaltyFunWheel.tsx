"use client";
import { useEffect, useState } from "react";
const angles:Record<string,number>={lucky:342,usual:198,confession:45,challenge:9};
const wedges=[
  {key:"lucky",icon:"🍀",title:"Joker",chance:10,start:0,end:36,color:"#019CA9",detail:"Heute keine Kabinensprüche"},
  {key:"usual",icon:"😎",title:"Bleibt",chance:70,start:36,end:288,color:"#15364B",detail:"Keine Zusatzaufgabe"},
  {key:"confession",icon:"🎤",title:"Beichte",chance:15,start:288,end:342,color:"#C28C3D",detail:"Erzähl deine beste Ausrede"},
  {key:"challenge",icon:"🔥",title:"Challenge",chance:5,start:342,end:360,color:"#B14E6B",detail:"Du machst das Aufwärmen"}
];
function wheelPoint(degrees:number,radius:number) {
  const radians=(degrees-90)*Math.PI/180;
  return {x:160+radius*Math.cos(radians),y:160+radius*Math.sin(radians)};
}
function wedgePath(start:number,end:number) {
  const a=wheelPoint(start,142),b=wheelPoint(end,142);
  return `M160 160 L${a.x} ${a.y} A142 142 0 ${end-start>180?1:0} 1 ${b.x} ${b.y} Z`;
}

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
  return <details className="mt-3 overflow-hidden rounded-2xl border border-cyan-200 bg-cyan-50/70 p-3 shadow-sm">
    <summary className="cursor-pointer text-xs font-black text-cyan-800">🎡 Schicksalsrad · {outcome?"Ergebnis ansehen":"Einmal drehen!"}</summary>
    <div className="mt-3 space-y-3">
      <p className="text-[11px] text-slate-600">Vier Möglichkeiten, ein Dreh: Joker, alles bleibt, Beichte oder Challenge. Die echten Strafen ändern sich dabei nicht.</p>
      <div className="relative mx-auto mt-4 w-full max-w-[280px]">
        <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 drop-shadow-md">
          <svg width="32" height="37" viewBox="0 0 32 37" aria-label="Zeiger" role="img">
            <path d="M3 2 H29 L16 34 Z" fill="white" stroke="#0A2536" strokeWidth="3"/>
          </svg>
        </div>
        <div className="rounded-full bg-slate-950 p-2 shadow-[0_12px_30px_rgba(10,35,55,0.27)]">
          <svg viewBox="0 0 320 320" role="img"
            aria-label="Schicksalsrad mit Joker, Bleibt, Beichte und Challenge"
            className="block w-full rounded-full"
            style={{transform:`rotate(${angle}deg)`,transition:animate?"transform 2800ms cubic-bezier(.15,.85,.2,1)":"none"}}>
            {wedges.map(w=>{
              const point=wheelPoint((w.start+w.end)/2,96);
              return <g key={w.key}>
                <path d={wedgePath(w.start,w.end)} fill={w.color} stroke="white" strokeWidth="2"/>
                <text x={point.x} y={point.y} textAnchor="middle" dominantBaseline="central" fontSize="25">{w.icon}</text>
              </g>;
            })}
            <circle cx="160" cy="160" r="49" fill="#071E2E" stroke="white" strokeWidth="4"/>
            <text x="160" y="165" textAnchor="middle" fill="white" fontSize="25" fontWeight="900">strikr</text>
            <text x="160" y="180" textAnchor="middle" fill="#6EE7EA" fontSize="9" fontWeight="800" letterSpacing="1">SCHICKSAL</text>
          </svg>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {wedges.map(w=><div key={w.key} className="rounded-xl border border-slate-200 bg-white p-2.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-black text-slate-950">{w.icon} {w.title}</span>
            <span className="text-xs font-black text-cyan-700">{w.chance}%</span>
          </div>
          <p className="mt-1 text-[10px] leading-4 text-slate-600">{w.detail}</p>
        </div>)}
      </div>
      {outcome?(reveal?<div role="status" className="rounded-lg bg-white p-3 text-center text-sm font-bold text-slate-900">{message}</div>:<p className="text-center text-sm font-bold text-cyan-700">Das Schicksal entscheidet …</p>)
        :<button disabled={busy} type="button" onClick={()=>void spin()} className="w-full rounded-xl bg-cyan-600 p-3 text-sm font-black text-white disabled:opacity-50">{busy?"Schicksal entscheidet …":"Jetzt drehen!"}</button>}
      <p className="rounded-xl bg-slate-900 px-3 py-2 text-center text-[10px] font-semibold leading-4 text-white">Kein Geldeinsatz und keine Änderung der Strafe. Nur Kabinenspaß – egal, wo das Rad landet.</p>
      <p className="text-center text-[10px] text-slate-500">1 Versuch pro Strafe · Ergebnis wird serverseitig gespeichert</p>
      {error?<p role="alert" className="text-xs text-rose-700">{error}</p>:null}
    </div>
  </details>;
}
