"use client";
import { useCallback, useEffect, useState } from "react";
type Review = {id:number;kind:"late_cancel"|"no_show";status:"pending"|"penalized"|"excused";note:string;penalty_id:number|null};
type Entry={id:number;name:string;firstInAt:string|null;rsvp:string;review:Review|null};
export default function AttendanceReviewClient({sessionId,compact=false}:{sessionId:number;compact?:boolean}) {
  const [rows,setRows]=useState<Entry[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState<number|null>(null);
  const [error,setError]=useState(""),[notice,setNotice]=useState("");
  const [kind,setKind]=useState<Record<number,"late_cancel"|"no_show">>({});
  const [selectedPlayerId,setSelectedPlayerId]=useState("");
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
  if (compact) {
    const candidates = rows.filter(row => row.firstInAt && !row.review);
    const pending = rows.filter(row => row.review?.status === "pending");
    const handled = rows.filter(row => row.review && row.review.status !== "pending");
    const selectedId = candidates.find(row => row.id === Number(selectedPlayerId))?.id;
    return <div className="space-y-3">
      {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p> : null}
      {notice ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p> : null}
      {loading ? <p className="text-sm text-slate-600">Zusage-Verlauf wird geladen …</p> : null}
      {pending.map(row => <div key={row.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <div className="text-sm font-black text-slate-950">{row.name}</div>
        <p className="mt-1 text-xs text-slate-600">{row.review?.kind === "no_show" ? "Nicht erschienen" : "Spät abgesagt"}{row.review?.note ? ` · ${row.review.note}` : ""}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy !== null} onClick={() => void submit(row.id,"decide","excuse")}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 disabled:opacity-40">Entschuldigen</button>
          <button type="button" disabled={busy !== null} onClick={() => void submit(row.id,"decide","penalize")}
            className="min-h-11 rounded-xl bg-rose-700 px-3 text-xs font-bold text-white disabled:opacity-40">Strafe bestätigen</button>
        </div>
      </div>)}
      {!loading && candidates.length ? <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-sm font-extrabold text-slate-950">Fehlenden Spieler prüfen</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">Nur Spieler mit früherer Zusage können als Spätabsage/Nichterscheinen erfasst werden.</p>
        <label className="mt-3 block text-xs font-bold text-slate-700">Spieler
          <select value={selectedPlayerId} onChange={event => setSelectedPlayerId(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-base">
            <option value="">Bitte auswählen</option>
            {candidates.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </label>
        {selectedId ? <>
          <label className="mt-3 block text-xs font-bold text-slate-700">Vorfall
            <select value={kind[selectedId] ?? "late_cancel"}
              onChange={e=>setKind(p=>({...p,[selectedId]:e.target.value as "late_cancel"|"no_show"}))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-base">
              <option value="late_cancel">Nach Deadline abgesagt</option><option value="no_show">Trotz Zusage nicht erschienen</option>
            </select>
          </label>
          <label className="mt-3 block text-xs font-bold text-slate-700">Notiz (optional)
            <input value={notes[selectedId] ?? ""} maxLength={500}
              onChange={e=>setNotes(p=>({...p,[selectedId]:e.target.value}))}
              placeholder="z. B. per WhatsApp um 18:45"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-base"/>
          </label>
          <button type="button" disabled={busy !== null} onClick={() => void submit(selectedId,"report")}
            className="mt-3 min-h-12 w-full rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-40">
            Fall zur Prüfung erfassen
          </button>
        </> : null}
      </div> : null}
      {!loading && handled.length ? <p className="text-xs text-slate-500">{handled.length} Fälle bereits entschieden.</p> : null}
      {!loading && !candidates.length && !pending.length ?
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          Keine offenen Fälle vorhanden. Für neue Fälle muss bereits eine Zusage dokumentiert sein.
        </p> : null}
    </div>;
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
        <select aria-label={`Grund für ${row.name}`} value={kind[row.id]??"late_cancel"} onChange={e=>setKind(p=>({...p,[row.id]:e.target.value as "late_cancel"|"no_show"}))} className="w-full rounded-lg border border-slate-200 p-2 text-base sm:text-sm">
          <option value="late_cancel">Nach Deadline abgesagt (auch über Freund)</option>
          <option value="no_show">Zugesagt, nicht erschienen</option>
        </select>
        <input aria-label="Notiz" value={notes[row.id]??""} maxLength={500} onChange={e=>setNotes(p=>({...p,[row.id]:e.target.value}))} placeholder="z. B. Rolf meldete sich per WhatsApp um 18:45 Uhr" className="w-full rounded-lg border border-slate-200 p-2 text-base sm:text-sm"/>
        <button disabled={busy!==null} onClick={()=>void submit(row.id,"report")} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Zur Prüfung erfassen</button>
      </div>:null}
    </div>)}
    {!loading&&rows.length===0?<p className="text-sm text-slate-500">Noch keine Zusagen vorhanden.</p>:null}
  </div>;
}
