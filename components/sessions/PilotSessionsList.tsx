"use client";
import Link from "next/link";
import {useState} from "react";
import {ChevronRight,CalendarDays,CheckCircle2,XCircle,Clock3} from "lucide-react";
type Session={id:number;date:string;start_time:string|null;notes:string|null;type:"training"|"event"|null;status:"in"|"out"|"open"};
export default function PilotSessionsList({sessions,locale,isAdmin}:{sessions:Session[];locale:"de"|"en";isAdmin:boolean}){
 const [tab,setTab]=useState<"future"|"past">("future");
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const filtered=sessions.filter(s=>tab==="future"?s.date>=today:s.date<today).sort((a,b)=>tab==="future"?(a.date+a.start_time).localeCompare(b.date+b.start_time):(b.date+b.start_time).localeCompare(a.date+a.start_time));
 return <section className="space-y-4">
 <div className="flex gap-2 rounded-2xl bg-slate-200/70 p-1"><button onClick={()=>setTab("future")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold ${tab==="future"?"bg-white text-slate-950 shadow-sm":"text-slate-600"}`}>{locale==="de"?"Anstehend":"Upcoming"}</button><button onClick={()=>setTab("past")} className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold ${tab==="past"?"bg-white text-slate-950 shadow-sm":"text-slate-600"}`}>{locale==="de"?"Vergangen":"Past"}</button></div>
 <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
 {filtered.length===0?<p className="px-4 py-8 text-center text-sm text-slate-500">{locale==="de"?"Keine Termine vorhanden.":"No sessions found."}</p>:filtered.map((s,i)=>{
 const date=new Date(s.date+"T12:00:00");
 const weekday=date.toLocaleDateString(locale==="de"?"de-DE":"en-GB",{weekday:"short"});
 const day=date.toLocaleDateString(locale==="de"?"de-DE":"en-GB",{day:"2-digit",month:"short"});
 return <Link key={s.id} href={`/sessions/${s.id}`} className={`flex items-center gap-3 px-4 py-4 transition hover:bg-slate-50 ${i?"border-t border-slate-100":""}`}>
 <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-slate-100 px-1 py-2"><span className="text-[10px] font-bold uppercase text-slate-500">{weekday}</span><span className="text-sm font-black text-slate-900">{day}</span></div>
 <div className="min-w-0 flex-1"><div className="text-sm font-bold text-slate-950">{s.type==="event"?(locale==="de"?"Event / Spiel":"Event / Match"):(locale==="de"?"Training":"Training")} · {s.start_time?.slice(0,5)??"–"}</div>{s.notes?.trim()?<p className="mt-0.5 truncate text-xs text-slate-500">{s.notes.trim()}</p>:null}
 {tab==="future"?<div className="mt-1 flex items-center gap-1 text-xs font-semibold">{s.status==="in"?<><CheckCircle2 className="h-3.5 w-3.5 text-cyan-600"/><span className="text-cyan-700">{locale==="de"?"Zugesagt":"Going"}</span></>:s.status==="out"?<><XCircle className="h-3.5 w-3.5 text-rose-600"/><span className="text-rose-700">{locale==="de"?"Abgesagt":"Declined"}</span></>:<><Clock3 className="h-3.5 w-3.5 text-slate-400"/><span className="text-slate-500">{locale==="de"?"Noch offen":"Not answered"}</span></>}</div>:null}</div><ChevronRight className="h-5 w-5 shrink-0 text-slate-400"/></Link>;
 })}
 </div>
 {isAdmin?<details className="rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-bold text-slate-700">{locale==="de"?"Admin-Funktionen":"Admin tools"}</summary><div className="mt-3 flex flex-wrap gap-2"><Link href="/admin" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">{locale==="de"?"Adminbereich":"Admin"}</Link><Link href="/sessions/new" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">{locale==="de"?"Termin anlegen":"New session"}</Link><Link href="/sessions/archive" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">{locale==="de"?"Archiv":"Archive"}</Link></div></details>:null}
 </section>;
}
