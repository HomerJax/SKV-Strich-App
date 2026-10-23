"use client";
import { useCallback, useEffect, useState } from "react";
type Review = {id:number;kind:"late_cancel"|"no_show";status:"pending"|"penalized"|"excused";note:string;penalty_id:number|null};
type Entry={id:number;name:string;firstInAt:string|null;rsvp:string;review:Review|null};
export default function AttendanceReviewClient({sessionId}:{sessionId:number}) {
  const [rows,setRows]=useState<Entry[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState<number|null>(null);
  const [error,setError]=useState(""),[notice,setNotice]=useState("");
  const [kind,setKind]=useState<Record<number,"late_cancel"|"no_show">>({});
  const [notes,setNotes]=useState<Record<number,string>>({});
  const [date,setDate]=useState(""),[deadline,setDeadline]=useState<string|null>(null);
  const load=useCallback(async()=>{
    const res=await fetch(`/api/sessions/${sessionId}/attendance-review`,{cache:"no-store"});
    const data=await res.json() as {rows?:Entry[];date?:string;deadlineAt?:string|null;error?:string};
    if(!res.ok)throw Error(data.error||"Konnte Teilnehmer nicht laden.");
    setRows(data.rows??[]);setDate(data.date??"");setDeadline(data.deadlineAt??null);
  },[sessionId]);
  useEffect(()=>{void load().catch(e=>setError(String(e))).finally(()=>setLoading(false));},[load]);
  async function submit(playerId:number,action:"report"|"decide",decision?:"excuse"|"penalize") {
    if(busy!==null)return;
    setBusy(playerId);setError("");setNotice("");
    try{
      const res=await fetch(`/api/sessions/${sessionId}/attendance-review`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action,playerId,decision,kind:kind[playerId]??"late_cancel",note:notes[playerId]??""})
      });
      const json=await res.json() as {error?:string};
      if(!res.ok)throw Error(json.error||"Aktion fehlgeschlagen.");
      await load();setNotice(decision==="penalize"?"Strafe bestätigt.":decision==="excuse"?"Ohne Strafe entschuldigt.":"Fall zur Prüfung erfasst.");
    }catch(e){setError(e instanceof Error?e.message:"Fehler.");}finally{setBusy(null);}
  }
  return <div className="mt-5 space-y-3">
    <div className="rounded-xl bg-white p-3 text-xs text-slate-500">Training: {date||"–"} · Deadline: {deadline?new Date(deadline).toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short"}):"nicht festgelegt"} · Ursprüngliche Zusagen bleiben dokumentiert.</div>
    {error?<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
    {notice?<p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>:null}
    {loading?<p className="text-sm text-slate-500">Lade …</p>:null}
    {rows.map(row=><div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div><div className="font-bold text-slate-900">{row.name}</div><div className="text-xs text-slate-500">{row.rsvp==="in"?"Zugesagt":row.rsvp==="out"?"Abgesagt":"Offen"} · {row.firstInAt?"Zusage dokumentiert":"Keine erste Zusage"}</div></div>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.review?.status==="penalized"?"bg-rose-50 text-rose-700":row.review?.status==="excused"?"bg-emerald-50 text-emerald-700":row.review?"bg-amber-50 text-amber-800":"bg-slate-100 text-slate-600"}`}>{row.review?.status==="pending"?"Zu prüfen":row.review?.status==="penalized"?"Strafe erfasst":row.review?.status==="excused"?"Entschuldigt":"Ohne Prüfung"}</span>
      </div>
      {row.review?<div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
        {row.review.kind==="no_show"?"Nicht erschienen":"Nach Deadline abgesagt"}{row.review.note?` · ${row.review.note}`:""}
      </div>:null}
      {row.review?.status==="pending"?<div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy!==null} onClick={()=>void submit(row.id,"decide","penalize")} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Strafe bestätigen</button>
        <button disabled={busy!==null} onClick={()=>void submit(row.id,"decide","excuse")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40">Entschuldigen / Ausnahme</button>
      </div>:null}
      {!row.review&&row.firstInAt?<div className="mt-3 space-y-2">
        <select aria-label={`Grund für ${row.name}`} value={kind[row.id]??"late_cancel"} onChange={e=>setKind(p=>({...p,[row.id]:e.target.value as "late_cancel"|"no_show"}))} className="w-full rounded-lg border border-slate-200 p-2 text-sm">
          <option value="late_cancel">Nach Deadline abgesagt (auch über Freund)</option>
          <option value="no_show">Zugesagt, nicht erschienen</option>
        </select>
        <input aria-label="Notiz" value={notes[row.id]??""} maxLength={500} onChange={e=>setNotes(p=>({...p,[row.id]:e.target.value}))} placeholder="z. B. Rolf meldete sich per WhatsApp um 18:45 Uhr" className="w-full rounded-lg border border-slate-200 p-2 text-sm"/>
        <button disabled={busy!==null} onClick={()=>void submit(row.id,"report")} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Zur Prüfung erfassen</button>
      </div>:null}
    </div>)}
    {!loading&&rows.length===0?<p className="text-sm text-slate-500">Noch keine Zusagen vorhanden.</p>:null}
  </div>;
}
