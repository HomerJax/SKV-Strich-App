"use client";

import { useState } from "react";
import TrainingAnnouncementCard from "@/app/sessions/[id]/TrainingAnnouncementCard";

type Item = { id: number; date: string; startTime: string | null; title: string; kind: "training" | "match" | "event" };

export default function SessionAnnouncementPicker({ sessions, clubName }: { sessions: Item[]; clubName: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const active = sessions.find((session) => session.id === selected);
  return (
    <>
      <button type="button" onClick={() => { setSelected(null); setOpen(true); }}
        className="w-full rounded-2xl border border-teal-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-900 shadow-sm">
        <span className="block">Training oder Spiel ankündigen ↗</span>
        <span className="mt-1 block text-xs font-normal text-slate-500">Kommenden Termin auswählen und teilen</span>
      </button>
      {open ? (
        <div role="dialog" aria-modal="true" aria-label="Termin ankündigen"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-3"
          onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-slate-50 p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-950">Termin ankündigen</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold">Schließen ×</button>
            </div>
            {active ? (
              <>
                <button type="button" onClick={() => setSelected(null)} className="mb-3 text-sm font-bold text-teal-800">← Anderen Termin wählen</button>
                <p className="mb-3 text-sm font-semibold text-slate-700">{active.title} · {active.date}</p>
                <TrainingAnnouncementCard key={active.id} sessionId={active.id} clubName={clubName} date={active.date} startTime={active.startTime} />
              </>
            ) : sessions.length ? (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button key={session.id} type="button" onClick={() => setSelected(session.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-teal-400">
                    <span className="min-w-0"><span className="block font-bold text-slate-900">{session.title}</span>
                      <span className="block text-xs text-slate-500">{session.date} · {session.startTime?.slice(0,5) ?? "Uhrzeit offen"}</span></span>
                    <span className="shrink-0 text-xs font-bold text-teal-800">Auswählen →</span>
                  </button>
                ))}
              </div>
            ) : <p className="text-sm text-slate-600">Keine kommenden Trainings oder Spiele vorhanden.</p>}
          </section>
        </div>
      ) : null}
    </>
  );
}
