"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";
import { getSessionDeadlineEpochMs } from "@/lib/session-rsvp-deadline";

type Item={id:number;date:string;startTime:string|null;notes:string|null;status:"in"|"out"|"open";presentCount:number;deadlineMinutes:number|null};
export default function UpcomingHomeSessions({items,playerId,readOnly,requireAbsenceReason,clubDeadline}:{items:Item[];playerId:number|null;readOnly:boolean;requireAbsenceReason:boolean;clubDeadline:number}){
 const router=useRouter();const {locale}=useI18n();
 const [rows,setRows]=useState(items);const [visible,setVisible]=useState(2);const [busy,setBusy]=useState<number|null>(null);const [error,setError]=useState<string|null>(null);const [reasonFor,setReasonFor]=useState<number|null>(null);const [reason,setReason]=useState("");
 async function update(item:Item,next:"in"|"out"|"open",absenceReason=""){
  if(busy!==null||readOnly||!playerId)return;
  setBusy(item.id);setError(null);
  try{
   const data=new FormData();data.set("intent","set_self_presence");data.set("status",next);if(next==="out")data.set("reason",absenceReason.slice(0,80));
   const response=await fetch(`/api/sessions/${item.id}`,{method:"POST",body:data,credentials:"same-origin"});
   const payload=await response.json().catch(()=>null);if(!response.ok)throw new Error(payload?.error||"Speichern fehlgeschlagen");
   setRows(current=>current.map(r=>r.id===item.id?{...r,status:next,presentCount:Math.max(0,r.presentCount+(r.status==="in"?-1:0)+(next==="in"?1:0))}:r));
   setReasonFor(null);setReason("");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Speichern fehlgeschlagen");}finally{setBusy(null);}
 }
 return <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
  <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold text-slate-950">{locale==="de"?"Weitere Termine":"Upcoming sessions"}</h2><Link href="/sessions" className="text-xs font-semibold text-cyan-700">{locale==="de"?"Alle Termine →":"All sessions →"}</Link></div>
  <div className="mt-3 divide-y divide-slate-100">{rows.slice(0,visible).map(item=>{
   const deadline=getSessionDeadlineEpochMs({date:item.date,startTime:item.startTime,sessionOverrideMinutes:item.deadlineMinutes,clubDefaultMinutes:clubDeadline});
   const locked=deadline!==null&&Date.now()>deadline&&item.status==="in";
   const date=new Date(item.date+"T12:00:00");
   return <div key={item.id} className="py-3 first:pt-0 last:pb-0">
    <div className="flex items-start gap-3"><div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-slate-100 px-1 py-2"><span className="text-xl font-black">{date.getDate()}</span><span className="text-[10px] uppercase">{date.toLocaleDateString(locale==="de"?"de-DE":"en-GB",{month:"short"})}</span></div><div className="min-w-0 flex-1"><Link href={`/sessions/${item.id}`} className="block text-sm font-bold text-slate-900">{date.toLocaleDateString(locale==="de"?"de-DE":"en-GB",{weekday:"long"})} · {item.startTime?.slice(0,5)??"–"} {locale==="de"?"Uhr":""} →</Link><div className="mt-1 text-xs text-slate-500">{item.presentCount} {locale==="de"?"dabei":"going"}{item.notes?" · "+item.notes.slice(0,65):""}</div></div></div>
    <div className="mt-2 grid grid-cols-2 gap-2 pl-[60px]"><button type="button" disabled={!playerId||readOnly||busy!==null||locked} onClick={()=>void update(item,item.status==="in"?"open":"in")} className={`min-h-10 rounded-xl border px-2 py-2 text-xs font-bold disabled:opacity-50 ${item.status==="in"?"border-cyan-500 bg-cyan-500 text-white":"border-slate-200 bg-slate-50 text-slate-800"}`}>✓ {locale==="de"?"Dabei":"Going"}</button><button type="button" disabled={!playerId||readOnly||busy!==null||locked} onClick={()=>{if(item.status==="out")void update(item,"open");else{setReasonFor(item.id);setReason("");}}} className={`min-h-10 rounded-xl border px-2 py-2 text-xs font-bold disabled:opacity-50 ${item.status==="out"?"border-rose-500 bg-rose-500 text-white":"border-slate-200 bg-slate-50 text-slate-800"}`}>✕ {locale==="de"?"Absagen":"Decline"}</button></div>
    {reasonFor===item.id&&<div className="ml-[60px] mt-2 rounded-xl border border-rose-200 p-3"><label className="text-xs font-semibold">{locale==="de"?"Grund für Absage":"Reason for absence"} {requireAbsenceReason?"*":"("+ (locale==="de"?"optional":"optional")+")"}</label><input value={reason} maxLength={80} onChange={e=>setReason(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 p-2 text-sm" placeholder={locale==="de"?"Grund eingeben":"Enter reason"}/><div className="mt-2 flex justify-end gap-2"><button className="px-3 py-2 text-xs" onClick={()=>setReasonFor(null)}>{locale==="de"?"Abbrechen":"Cancel"}</button><button disabled={busy!==null||(requireAbsenceReason&&reason.trim().length<3)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50" onClick={()=>void update(item,"out",reason.trim())}>{locale==="de"?"Absage speichern":"Save"}</button></div></div>}
   </div>;
  })}</div>
  {error&&<p role="alert" className="mt-3 text-xs font-semibold text-rose-700">{error}</p>}
  {rows.length>visible&&<button type="button" onClick={()=>setVisible(v=>v+3)} className="mt-3 w-full rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700">{locale==="de"?"Weitere Termine laden ↓":"Load more ↓"}</button>}
 </section>;
}
