"use client";
import { useState } from "react";
import Link from "next/link";
import SeasonEndAdminModal from "@/components/home/SeasonEndAdminModal";

export default function Preview() {
  const [open,setOpen] = useState(true);
  const [planned,setPlanned] = useState(false);
  const [rev,setRev] = useState(0);
  function reopen() { setRev(r=>r+1);setOpen(true); }
  return <main className="min-h-dvh bg-slate-50 px-4 py-8 text-slate-950">
    <div className="mx-auto max-w-lg">
      <Link href="/home" className="text-sm font-bold text-slate-700 underline">← Home</Link>
      <h1 className="mt-5 text-2xl font-black">Saison-Ende · Vorschau</h1>
      <p className="mt-2 text-sm text-slate-600">Nur Power User. Keine Änderung an echten Saisons oder Benachrichtigungen.</p>
      <button onClick={reopen} className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Fullscreen-Meldung erneut öffnen</button>
      <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={planned} onChange={e=>setPlanned(e.target.checked)}/> Nächste Saison ist schon geplant</label>
    </div>
    {open && <SeasonEndAdminModal key={rev+":"+planned} preview onPreviewClose={()=>setOpen(false)}
      clubId="season-preview" userId="preview-user" seasonId={-1}
      seasonName="Saison 2026" endDate="2026-12-31" hasNextSeason={planned}/>}
  </main>;
}
