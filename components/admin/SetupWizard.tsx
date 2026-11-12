"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Circle, LockKeyhole, Sparkles } from "lucide-react";
import Image from "next/image";

type Step = { id:string; title:string; description:string; href:string; required:boolean; done:boolean; pro?:boolean };
export default function SetupWizard({ clubId, clubName, steps, initial, allowTest=false, inlinePanels={}, preview=false }: { clubId:string; clubName:string; steps:Step[]; initial?:{current_step:string;skipped:string[];test_mode:boolean;test_completed:string[];reviewed:string[]}|null; allowTest?:boolean; preview?:boolean; inlinePanels?:Record<string,ReactNode> }) {
  
  const [ready,setReady]=useState(false);
  const [testMode,setTestMode]=useState(preview || (initial?.test_mode??false));
  const [testCompleted,setTestCompleted]=useState<string[]>(initial?.test_completed??[]);
  const [index,setIndex]=useState(0);
  const [reviewed,setReviewed]=useState<string[]>(initial?.reviewed??[]);
  const [skipped,setSkipped]=useState<string[]>([]);
  const [saveError,setSaveError]=useState(false);
  const [formResult,setFormResult]=useState<{saved:boolean;error:string}>({saved:false,error:""});
  useEffect(()=>{
    const saved=initial?.skipped||[];
    setSkipped(saved);
    const query=new URLSearchParams(window.location.search);
    setFormResult({saved:query.get("saved")==="1",error:query.get("error")||""});
    const queryStep=query.get("step");
    const idx=steps.findIndex(s=>s.id===(queryStep||initial?.current_step));
    const next=steps.findIndex(s=>!s.done&&!saved.includes(s.id));
    setIndex(idx>=0?idx:next>=0?next:0);
    setReady(true);
  },[clubId]);
  const save=async(step:string,nextSkipped:string[],mode=testMode,completed=testCompleted,nextReviewed=reviewed)=>{
    if(preview)return;
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
    <div className="relative overflow-hidden rounded-[30px] bg-[#071522] px-5 py-5 text-white shadow-[0_24px_70px_rgba(2,6,23,.20)] sm:px-7 sm:py-7">
      <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-violet-500/25 blur-3xl"/>
      <div className="pointer-events-none absolute -bottom-28 left-12 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl"/>
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3"><Image src="/icon-light.png" alt="strikr" width={48} height={48} className="h-12 w-12 shrink-0 rounded-2xl"/><div className="min-w-0"><div className="truncate text-sm font-black tracking-tight">{clubName}</div><div className="mt-0.5 text-[10px] font-black uppercase tracking-[.17em] text-cyan-300">strikr · Vereinsstart</div></div></div>
          <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black tabular-nums">{index+1} / {steps.length}</span>
        </div>
        <div className="mt-7 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-300"><Sparkles className="h-4 w-4"/> In acht Schritten startklar</div>
        <h1 className="mt-2 max-w-2xl text-2xl font-black tracking-tight sm:text-3xl">{current.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">{current.description}</p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-all duration-300" style={{width:`${100*(index+1)/steps.length}%`}}/></div>
        <div className="mt-3 flex gap-1.5">{actualSteps.map((s,i)=><button key={s.id} type="button" onClick={()=>persist(i,skipped)} aria-label={s.title} aria-current={i===index?"step":undefined} title={s.title} className={"h-2.5 min-w-0 flex-1 rounded-full transition "+(i===index?"bg-white":s.done?"bg-cyan-400":"bg-white/20 hover:bg-white/40")}/>)}</div>
      </div>
    </div>
    <div className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,.07)] sm:p-7">
      {!preview?<div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase tracking-[.17em] text-cyan-700">Schritt {index+1} von {steps.length}</span><span className={"rounded-full px-3 py-1 text-xs font-black "+(current.required?"bg-cyan-50 text-cyan-800":"bg-slate-100 text-slate-600")}>{current.required?"Pflicht":"Optional"}</span></div>:null}
      {!preview?<div className="mt-3 flex items-center gap-3">{current.done?<Check className="h-6 w-6 text-emerald-600"/>:<Circle className="h-6 w-6 text-cyan-600"/>}<h2 className="text-xl font-black tracking-tight text-slate-950">{current.title}</h2></div>:null}
      {!preview?<p className="mt-2 text-sm leading-6 text-slate-600">{current.description}</p>:null}
      {!preview&&current.pro?<p className="mt-3 flex items-center gap-2 text-xs font-semibold text-violet-700"><LockKeyhole className="h-4 w-4"/> Erweiterte Einstellungen mit PRO</p>:null}
      {formResult.error?<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Speichern nicht möglich ({formResult.error}). Bitte Eingaben und Berechtigungen prüfen.</p>:null}
      {formResult.saved?<p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Änderungen gespeichert.</p>:null}
      {preview?<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><strong>Echte Formularansicht · Testbetrieb.</strong> Die Schaltflächen und Eingabefelder stammen aus derselben Einrichtung wie beim echten Verein. Ein Speichern wird vor dem Serveraufruf abgefangen und führt nur zum nächsten Simulationsschritt.</div>:null}
      {inlinePanels[current.id]?<div className="mt-5 border-t border-slate-100 pt-5" onSubmitCapture={preview?(event)=>{event.preventDefault();event.stopPropagation();const form=event.target;if(form instanceof HTMLFormElement&&!form.reportValidity())return;setTestCompleted(v=>[...new Set([...v,current.id])]);if(index<steps.length-1)setIndex(index+1);}:undefined} onClickCapture={preview?(event)=>{const target=event.target;if(!(target instanceof Element))return;const link=target.closest("a[href]");if(link){event.preventDefault();event.stopPropagation();}}:undefined}>{inlinePanels[current.id]}</div>:preview?<div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-sm leading-6 text-slate-700">Dieser Schritt hat im echten Wizard derzeit noch kein eigenes Eingabeformular. Eine künstliche Maske wird bewusst nicht angezeigt.</p><button type="button" className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white" onClick={()=>{setTestCompleted(v=>[...new Set([...v,current.id])]);if(index<steps.length-1)setIndex(index+1);}}>{index===steps.length-1?"Simulation abschließen":"Weiter zum nächsten Schritt"}</button></div>:null}
      {current.id==="season" ? <button type="button" onClick={()=>{if(preview){setTestCompleted(v=>[...new Set([...v,current.id])]);}persist(Math.min(index+1,steps.length-1),skipped);}} className="mt-5 flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-950 px-5 py-4 text-left text-white shadow-[0_12px_28px_rgba(15,23,42,.14)] transition hover:bg-slate-800"><span><span className="block text-[10px] font-black uppercase tracking-widest text-cyan-300">Standardeinstellung verwenden</span><span className="mt-1 block text-base font-black">Standardsaison übernehmen und weiter</span></span><ArrowRight className="h-5 w-5 shrink-0"/></button> : null}
      {current.id==="categories" ? <button type="button" onClick={()=>{const nextReviewed=[...new Set([...reviewed,current.id])];setReviewed(nextReviewed);if(preview)setTestCompleted(v=>[...new Set([...v,current.id])]);setIndex(Math.min(index+1,steps.length-1));void save(steps[index+1]?.id||"games",skipped,testMode,testCompleted,nextReviewed);}} className="mt-5 flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-950 px-5 py-4 text-left text-white shadow-[0_12px_28px_rgba(15,23,42,.14)] transition hover:bg-slate-800"><span><span className="block text-[10px] font-black uppercase tracking-widest text-cyan-300">Optionaler Schritt</span><span className="mt-1 block text-base font-black">Weiter zum Spielmodus</span></span><ArrowRight className="h-5 w-5 shrink-0"/></button> : null}
      <div className="mt-6 flex flex-wrap gap-2">
        {!testMode?<Link href={current.href} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"> {inlinePanels[current.id]?"Erweiterte Einstellungen öffnen":current.done?"Einstellungen öffnen":"Jetzt einrichten"} <ArrowRight className="h-4 w-4"/></Link>:null}
        <button type="button" disabled={index===0} onClick={()=>persist(index-1,skipped)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold disabled:opacity-30"><ArrowLeft className="h-4 w-4"/> Zurück</button>
        {index<steps.length-1 && current.id!=="categories" && (current.done || !current.required)?<button type="button" onClick={()=>persist(index+1,current.required?skipped:[...new Set([...skipped,current.id])])} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold">{current.done?"Weiter":"Überspringen"}</button>:null}
      </div>
    </div>
    {!testMode&&!current.required&&!current.done?<button type="button" className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900" onClick={()=>{const next=[...new Set([...reviewed,current.id])];setReviewed(next);void save(current.id,skipped,testMode,testCompleted,next)}}>Diesen optionalen Bereich als angesehen markieren</button>:null}
    {requiredDone&&!preview?<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><strong>{preview ? "Vorschau abgeschlossen!" : "Dein Verein ist startklar!"}</strong> {preview ? "Alle Pflichtbereiche wurden in der Simulation durchgespielt. Es wurden keine Vereinsdaten gespeichert." : "Du kannst jetzt loslegen oder die optionalen Bereiche später einrichten."}</div>:null}
    {testCompleted.includes("pro")&&preview?<div role="status" className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950"><strong>Simulation erfolgreich abgeschlossen.</strong> Alle acht Onboarding-Schritte sind durchlaufen. In der echten App folgt jetzt die Einladung der Mitspieler. Es wurden keine Daten gespeichert.</div>:null}
    {!preview&&current.id==="pro"?<div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950"><p className="font-bold">Danach geht es weiter:</p><p className="mt-1">Mitspieler einladen, erstes Training starten. Trainingsleiter, Statistiken, Mannschaftskasse und Kommunikation kannst du später in Ruhe ergänzen.</p><div className="mt-3 flex flex-wrap gap-2"><Link href="/admin/members" className="rounded-xl bg-slate-950 px-4 py-2 font-bold text-white">Mitspieler einladen</Link><Link href="/admin" className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold">Zum Admin-Bereich</Link></div></div>:null}
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={preview ? "/power-user/onboarding-simulator" : "/admin"} className="text-sm font-bold text-slate-700">{preview ? "Simulation verlassen · Zurück zur Übersicht" : "Einrichtung beenden · Zum Admin-Bereich"}</Link><button type="button" onClick={()=>{persist(0,[])}} className="text-xs text-slate-500 underline">Wizard von vorne ansehen</button></div>
    {allowTest&&!preview?<div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm"><strong>Testmodus 1. FC Strikr</strong><p className="mt-1 text-xs">Simuliert einen neuen Verein, ohne echte Vereinsdaten zu verändern.</p><button type="button" className="mt-2 rounded-lg bg-amber-900 px-3 py-2 font-bold text-white" onClick={()=>{setTestMode(preview?true:!testMode);setTestCompleted([]);setIndex(0);void save("club",[],preview?true:!testMode,[])}}>{preview?"Simulation zurücksetzen":testMode?"Testmodus beenden":"Testmodus mit 0 erledigten Schritten starten"}</button>{testMode?<button type="button" className="ml-2 rounded-lg border border-amber-500 px-3 py-2" onClick={()=>{const next=[...new Set([...testCompleted,current.id])];setTestCompleted(next);void save(current.id,skipped,true,next)}}>Testschritt als erledigt markieren</button>:null}</div>:null}
    <div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-bold">Alle Bereiche</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{actualSteps.map((s,i)=><button key={s.id} onClick={()=>persist(i,skipped)} className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 text-left text-xs"><span className={s.done?"text-emerald-600":"text-slate-400"}>{s.done?"✓":"○"}</span><span className="flex-1">{s.title}</span><span className="text-slate-400">{s.required?"Pflicht":"Optional"}</span></button>)}</div></div>
    <p className="text-xs text-slate-500">{preview ? "Vorschau: Es werden keine Daten gespeichert." : "Dein Wizard-Fortschritt wird in deinem Benutzerkonto gespeichert."} Pflichtschritte werden anhand der Vereinsdaten geprüft. Optionale Bereiche können zusätzlich ausdrücklich als angesehen markiert werden.</p>
  </div>;
}
