"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Copy, Users, UserPlus } from "lucide-react";

export default function AdminFirstHomePreview({ name, firstName, onRestart }: { name: string; firstName: string; onRestart: () => void }) {
  const [inviteShown, setInviteShown] = useState(false);
  const [trainingShown, setTrainingShown] = useState(false);
  const [title, setTitle] = useState("Donnerstagstraining");
  const [date, setDate] = useState("");

  return (
    <div className="space-y-5 bg-[#f5f7fb] p-3 sm:p-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-950">
        QA-Ablaufmodell – noch keine echte Home-Ansicht. Das tatsächliche Admin-Home mit Rollen und Berechtigungen muss später in Staging getestet werden. Keine Aktionen hier speichern Daten.
      </div>
      <div className="overflow-hidden rounded-[28px] bg-[#081321] p-5 text-white sm:p-7">
        <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Neuer Verein · erster Einstieg</div>
        <h2 className="mt-3 text-2xl font-black">Hallo {firstName || "Vereinsleiter"}!</h2>
        <p className="mt-2 text-sm font-semibold text-white/70">{name || "Dein Verein"}</p>
        <p className="mt-4 text-sm leading-6 text-white/60">Deine Mannschaft ist noch leer. Lade die anderen ein oder plane das erste Training.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[["1", "Mitglied"],["0", "Termine"],["0", "Zusagen"]].map(([value,label])=>(
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
            <div className="text-2xl font-black text-slate-950">{value}</div><div className="mt-1 text-[11px] font-bold text-slate-500">{label}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2"><Users className="h-5 w-5 text-cyan-700"/><h3 className="text-lg font-black">Mannschaft einladen</h3></div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Erst mit Mitspielern wird der Verein lebendig.</p>
          <button type="button" onClick={() => setInviteShown(!inviteShown)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"><UserPlus className="h-4 w-4"/> Einladung ansehen</button>
          {inviteShown ? <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs leading-5 text-cyan-900">
            <div className="flex items-center gap-2 font-black"><Copy className="h-4 w-4"/> Beispieldarstellung – kein Einladungslink</div>
            In der echten App wird hier ein vereinsgebundener Link generiert und über WhatsApp oder andere Kanäle geteilt. In diesem QA-Modus wird kein Token erzeugt oder verschickt.
          </div> : null}
        </section>
        <section className="rounded-[24px] border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-cyan-700"/><h3 className="text-lg font-black">Erstes Training</h3></div>
          <p className="mt-2 text-sm leading-6 text-slate-600">Training planen, damit die Gruppe zu- und absagen kann.</p>
          <button type="button" onClick={() => setTrainingShown(!trainingShown)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"><CalendarDays className="h-4 w-4"/> Vorschau öffnen</button>
          {trainingShown ? <div className="mt-3 space-y-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3">
            <label className="block text-xs font-bold text-slate-700">Titel<input value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium"/></label>
            <label className="block text-xs font-bold text-slate-700">Datum<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium"/></label>
            <p className="flex items-center gap-2 text-xs text-cyan-900"><CheckCircle2 className="h-4 w-4"/> Eingaben bleiben ausschließlich in dieser Vorschau.</p>
          </div> : null}
        </section>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-black text-slate-950">Was du bei einem echten Erststart zusätzlich prüfen solltest</h3>
        <p className="mt-2 text-xs leading-5 text-slate-600">Sind Trainingserstellung, Rollenverteilung, Free/PRO-Hinweise und Einladungslink auch ohne Vorkenntnisse verständlich? Nur ein echter isolierter Testaccount zeigt die tatsächlichen Berechtigungen.</p>
      </div>
      <button type="button" onClick={onRestart} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-900">
        Simulation neu starten <ArrowRight className="h-4 w-4"/>
      </button>
    </div>
  );
}
