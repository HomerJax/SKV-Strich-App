"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

type Comment = { userId:string;name:string;body:string;createdAt:string;updatedAt:string;mine:boolean };
export default function TeamFeedComments({feedId}:{feedId:string}) {
  const [comments,setComments] = useState<Comment[]>([]);
  const [open,setOpen] = useState(false);
  const [loaded,setLoaded] = useState(false);
  const [draft,setDraft] = useState("");
  const [editing,setEditing] = useState(false);
  const [canModerate,setCanModerate] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const mine = comments.find((comment)=>comment.mine);
  useEffect(()=>{ setComments([]);setLoaded(false);setEditing(false);setDraft(""); },[feedId]);
  async function load() {
    try {
      const res=await fetch(`/api/team-feed/comments?feedId=${encodeURIComponent(feedId)}`,{cache:"no-store"});
      if(!res.ok)throw Error("Kommentare nicht verfügbar.");
      const result=await res.json() as {comments?:Comment[];canModerate?:boolean};
      setComments(result.comments??[]);setCanModerate(result.canModerate===true);
      setLoaded(true);
    }catch {setError("Kommentare konnten nicht geladen werden.");}
  }
  async function toggle() {
    if(!open && !loaded) await load();
    setOpen(!open);
  }
  async function save(action:"save"|"delete",targetUserId?:string) {
    if(busy)return;
    setBusy(true);setError("");
    try {
      const res=await fetch("/api/team-feed/comments",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({feedId,action,text:draft,targetUserId})
      });
      const payload=await res.json().catch(()=>({})) as {error?:string};
      if(!res.ok)throw Error(payload.error??"Speichern fehlgeschlagen.");
      await load();setEditing(false);setDraft("");
    }catch(e){setError(e instanceof Error?e.message:"Speichern fehlgeschlagen.");}
    finally{setBusy(false);}
  }
  return <div className="mt-2 border-t border-slate-100 pt-2">
    <button type="button" onClick={()=>void toggle()} className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-700">
      <MessageCircle className="h-3.5 w-3.5"/> {open?"Kommentare schließen":"Kommentieren"}
    </button>
    {open ? <div className="mt-2 space-y-2">
      {comments.length===0?<p className="text-xs text-slate-500">Noch keine Kommentare.</p>:null}
      {comments.map(c=><div key={c.userId} className="rounded-lg bg-slate-50 p-2 text-xs">
        <span className="font-bold text-slate-700">{c.name}{c.mine?" · Du":""}</span>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-slate-700">{c.body}</p>
        {canModerate&&!c.mine?<button type="button" disabled={busy} className="mt-1 text-[10px] font-semibold text-rose-600" onClick={()=>void save("delete",c.userId)}>Als Admin entfernen</button>:null}
      </div>)}
      {mine && !editing ? <button type="button" onClick={()=>{setDraft(mine.body);setEditing(true);}} className="text-[11px] font-semibold text-cyan-700">Meinen Kommentar bearbeiten</button> : null}
      {(!mine || editing) ? <div className="space-y-2">
        <textarea aria-label="Dein Kommentar" value={draft} onChange={e=>setDraft(e.target.value)}
          maxLength={200} rows={2} placeholder="Einmal deinen Senf dazugeben …"
          className="w-full rounded-xl border border-slate-200 bg-white p-2 text-base text-slate-900 sm:text-sm"/>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-400">{draft.length}/200 · Ein Kommentar pro Meldung</span>
          <button type="button" disabled={busy||!draft.trim()} onClick={()=>void save("save")}
            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Speichern</button>
        </div>
        {mine?<button type="button" disabled={busy} className="text-[11px] text-rose-700" onClick={()=>void save("delete")}>Kommentar löschen</button>:null}
      </div>:null}
      {error?<p role="alert" className="text-xs text-rose-700">{error}</p>:null}
    </div>:null}
  </div>;
}
