"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Circle, LockKeyhole } from "lucide-react";

type Step = { id:string; title:string; description:string; href:string; required:boolean; done:boolean; pro?:boolean };
export default function SetupWizard({ clubId, clubName, steps, initial, allowTest=false }: { clubId:string; clubName:string; steps:Step[]; initial?:{current_step:string;skipped:string[];test_mode:boolean;test_completed:string[];reviewed:string[]}|null; allowTest?:boolean }) {
  
  const [ready,setReady]=useState(false);
  const [testMode,setTestMode]=useState(initial?.test_mode??false);
  const [testCompleted,setTestCompleted]=useState<string[]>(initial?.test_completed??[]);
  const [index,setIndex]=useState(0);
  const [reviewed,setReviewed]=useState<string[]>(initial?.reviewed??[]);
  const [skipped,setSkipped]=useState<string[]>([]);
  const [saveError,setSaveError]=useState(false);
  useEffect(()=>{
    const saved=initial?.skipped||[];
    setSkipped(saved);
    const idx=steps.findIndex(s=>s.id===initial?.current_step);
    const next=steps.findIndex(s=>!s.done&&!saved.includes(s.id));
    setIndex(idx>=0?idx:next>=0?next:0);
    setReady(true);
  },[clubId]);
  const save=async(step:string,nextSkipped:string[],mode=testMode,completed=testCompleted,nextReviewed=reviewed)=>{
    try{const response=await fetch("/api/admin/setup-progress",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({current_step:step,skipped:nextSkipped,test_mode:mode,test_completed:completed,reviewed:nextReviewed})});setSaveError(!response.ok);}catch{setSaveError(true)}
  };
  const persist=(nextIndex:number,nextSkipped:string[])=>{
    setIndex(nextIndex);setSkipped(nextSkipped);
    void save(steps[nextIndex]?.id||"club",nextSkipped);
  };
  const actualSteps=steps.map(s=>({...s,done:testMode?testCompleted.includes(s.id):s.done||(!s.required&&reviewed.includes(s.id))}));
  const required=actualSteps.filter(s=>s.required);
  const requiredDone=required.every(s=>s.done);
  const done=actualSteps.filter(s=>s.done).length;
  const current=actualSteps[index]||actualSteps[0];
  if(!ready)return <div className="rounded-3xl bg-white p-6 text-slate-600">Einrichtung wird geladen …</div>;
  return <div className="space-y-4">
    {saveError?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">Fortschritt konnte nicht gespeichert werden. Bitte die Seite erneut öffnen und prüfen.</p>:null}
    <div className="rounded-[26px] bg-[#070b12] p-5 text-white shadow-lg sm:p-7">
      <div className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">strikr · Admin-Wizard</div>
      <h1 className="mt-2 text-2xl font-black tracking-tight">{clubName} einrichten</h1>
      <p className="mt-2 text-sm text-white/60">{done} von {steps.length} Bereichen eingerichtet · {requiredDone?"Pflicht abgeschlossen":"Pflicht noch offen"}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400" style={{width:`${100*done/steps.length}%`}}/></div>
      <div className="mt-4 flex flex-wrap gap-2">{actualSteps.map((s,i)=><button key={s.id} type="button" onClick={()=>persist(i,skipped)} aria-label={s.title} className={`h-2.5 flex-1 rounded-full ${i===index?"bg-white":s.done?"bg-cyan-400":"bg-white/20"}`}/>)}</div>
    </div>
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-center justify-between gap-2"><span className="text-xs font-black uppercase tracking-widest text-slate-400">Schritt {index+1} / {steps.length}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${current.required?"bg-cyan-50 text-cyan-800":"bg-slate-100 text-slate-600"}`}>{current.required?"Pflicht":"Optional"}</span></div>
      <div className="mt-5 flex items-center gap-3">{current.done?<Check className="h-7 w-7 text-emerald-600"/>:<Circle className="h-7 w-7 text-slate-300"/>}<h2 className="text-xl font-black text-slate-950">{current.title}</h2></div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{current.description}</p>
      {current.pro?<p className="mt-3 flex items-center gap-2 text-xs font-semibold text-violet-700"><LockKeyhole className="h-4 w-4"/> Erweiterte Einstellungen mit PRO</p>:null}
      <p className="mt-3 text-xs text-slate-500">{current.done?"Bereits eingerichtet. Du kannst die Einstellungen jederzeit ändern.":"Noch offen. Für einige optionale Bereiche ist die automatische Prüfung noch nicht verfügbar."}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={current.href} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"> {current.done?"Einstellungen öffnen":"Jetzt einrichten"} <ArrowRight className="h-4 w-4"/></Link>
        <button type="button" disabled={index===0} onClick={()=>persist(index-1,skipped)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold disabled:opacity-30"><ArrowLeft className="h-4 w-4"/> Zurück</button>
        {index<steps.length-1 && (current.done || !current.required)?<button type="button" onClick={()=>persist(index+1,current.required?skipped:[...new Set([...skipped,current.id])])} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold">{current.done?"Weiter":"Überspringen"}</button>:null}
      </div>
    </div>
    {!current.required&&!current.done?<button type="button" className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900" onClick={()=>{const next=[...new Set([...reviewed,current.id])];setReviewed(next);void save(current.id,skipped,testMode,testCompleted,next)}}>Diesen optionalen Bereich als angesehen markieren</button>:null}
    {requiredDone?<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><strong>Dein Verein ist startklar!</strong> Du kannst jetzt loslegen oder die optionalen Bereiche später einrichten.</div>:null}
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/admin" className="text-sm font-bold text-slate-700">Einrichtung beenden · Zum Admin-Bereich</Link><button type="button" onClick={()=>{persist(0,[])}} className="text-xs text-slate-500 underline">Wizard von vorne ansehen</button></div>
    {allowTest?<div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm"><strong>Testmodus 1. FC Strikr</strong><p className="mt-1 text-xs">Simuliert einen neuen Verein, ohne echte Vereinsdaten zu verändern.</p><button type="button" className="mt-2 rounded-lg bg-amber-900 px-3 py-2 font-bold text-white" onClick={()=>{setTestMode(!testMode);setTestCompleted([]);setIndex(0);void save("club",[],!testMode,[])}}>{testMode?"Testmodus beenden":"Testmodus mit 0 erledigten Schritten starten"}</button>{testMode?<button type="button" className="ml-2 rounded-lg border border-amber-500 px-3 py-2" onClick={()=>{const next=[...new Set([...testCompleted,current.id])];setTestCompleted(next);void save(current.id,skipped,true,next)}}>Testschritt als erledigt markieren</button>:null}</div>:null}
    <div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-bold">Alle Bereiche</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{actualSteps.map((s,i)=><button key={s.id} onClick={()=>persist(i,skipped)} className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 text-left text-xs"><span className={s.done?"text-emerald-600":"text-slate-400"}>{s.done?"✓":"○"}</span><span className="flex-1">{s.title}</span><span className="text-slate-400">{s.required?"Pflicht":"Optional"}</span></button>)}</div></div>
    <p className="text-xs text-slate-500">Dein Wizard-Fortschritt wird in deinem Benutzerkonto gespeichert. Pflichtschritte werden anhand der Vereinsdaten geprüft. Optionale Bereiche können zusätzlich ausdrücklich als angesehen markiert werden.</p>
  </div>;
}
