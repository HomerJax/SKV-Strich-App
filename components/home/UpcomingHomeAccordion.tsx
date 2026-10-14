"use client";
import Link from "next/link";
import {useState} from "react";
import {ChevronDown} from "lucide-react";
import NextSessionAttendanceCard from "@/components/home/NextSessionAttendanceCard";
type Person={id:number;name:string;photoUrl:string|null;photoPositionX:number|null;photoPositionY:number|null;photoZoom:number|null};
type Item={id:number;date:string;start_time:string|null;notes:string|null;rsvp_deadline_minutes_before:number|null;status:"in"|"out"|"open";comment:string|null;presentCount:number;absentCount:number;participants:(Person&{comment:string|null})[];absentPlayers:(Person&{reason:string|null})[]};
export default function UpcomingHomeAccordion({items,locale,clubDeadline,requireAbsenceReason,readOnly,supportViewLabel}:{items:Item[];locale:"de"|"en";clubDeadline:number;requireAbsenceReason:boolean;readOnly:boolean;supportViewLabel:string|null}){
 const [openId,setOpenId]=useState<number|null>(null);
 return <section className="space-y-2">
 <h2 className="px-1 text-base font-bold text-slate-950">{locale==="de"?"Weitere Termine":"Upcoming sessions"}</h2>
 {items.map(s=>{
 const open=openId===s.id;
 const date=new Date(s.date+"T12:00:00").toLocaleDateString(locale==="de"?"de-DE":"en-GB",{weekday:"short",day:"2-digit",month:"2-digit"});
 const status=s.status==="in"?(locale==="de"?"Zugesagt":"Going"):s.status==="out"?(locale==="de"?"Abgesagt":"Declined"):(locale==="de"?"Noch offen":"Not answered");
 return <div key={s.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
 <div role="button" tabIndex={0} aria-expanded={open} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setOpenId(open?null:s.id)}}} onClick={()=>setOpenId(open?null:s.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
 <div className="min-w-0 flex-1"><div className="text-sm font-bold text-slate-950"><Link href={`/sessions/${s.id}`} onClick={e=>e.stopPropagation()} className="hover:text-cyan-700 hover:underline">{date}</Link> · {s.start_time?.slice(0,5)??"–"} {locale==="de"?"Uhr":""}</div><div className="mt-1 text-xs text-slate-500">{s.presentCount} {locale==="de"?"dabei":"going"} · <span className={s.status==="in"?"font-semibold text-cyan-700":s.status==="out"?"font-semibold text-rose-700":"font-semibold text-slate-600"}>{status}</span></div></div>
 <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${open?"rotate-180":""}`}/>
 </div>
 {open&&<div className="border-t border-slate-100 p-2"><NextSessionAttendanceCard compact sessionId={s.id} title={date+" · "+(s.start_time?.slice(0,5)??"–")} text={s.notes?.trim()??""} href={`/sessions/${s.id}`} initialStatus={s.status} initialComment={s.comment} initialPresentCount={s.presentCount} initialAbsentCount={s.absentCount} sessionDate={s.date} startTime={s.start_time} rsvpDeadlineMinutesBefore={clubDeadline} sessionRsvpDeadlineMinutesBefore={s.rsvp_deadline_minutes_before} participants={s.participants} absentPlayers={s.absentPlayers} requireAbsenceReason={requireAbsenceReason} readOnly={readOnly} supportViewLabel={supportViewLabel}/></div>}
 </div>;
 })}
 </section>;
}
