"use client";
import { useState } from "react";
import Link from "next/link";
import ProTrialTransitionNotice, { type ProTrialNoticePhase, type ProTrialNoticeRole } from "@/components/home/ProTrialTransitionNotice";

type Scenario = { id: string; role: ProTrialNoticeRole; phase: ProTrialNoticePhase; label: string; info: string };
const scenarios: Scenario[] = [
  { id: "player3", role: "player", phase: "three_days", label: "Spieler · 3 Tage", info: "Einmalig ab 72 Stunden vor Ablauf" },
  { id: "admin3", role: "admin", phase: "three_days", label: "Admin · 3 Tage", info: "Hinweis mit Upgrade-Möglichkeit" },
  { id: "player1", role: "player", phase: "three_days", label: "Spieler · 1 Tag", info: "Kein zweiter Hinweis: die bereits bekannte 3-Tage-Meldung" },
  { id: "admin1", role: "admin", phase: "one_day", label: "Admin · 1 Tag", info: "Separat schließbare Erinnerung am letzten Tag" },
  { id: "playerFree", role: "player", phase: "free", label: "Spieler · Free", info: "Einmalig nach dem Wechsel" },
  { id: "adminFree", role: "admin", phase: "free", label: "Admin · Free", info: "Einmalig nach dem Wechsel" },
];
export default function ProTrialPreview() {
  const [selected, setSelected] = useState("player3");
  const [open, setOpen] = useState(true);
  const [revision, setRevision] = useState(0);
  const scenario = scenarios.find(row => row.id === selected) ?? scenarios[0];
  function show(id: string) {
    setSelected(id);
    setRevision(n => n + 1);
    setOpen(true);
  }
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-8 pb-40 text-slate-950">
      <div className="mx-auto max-w-xl">
        <Link href="/home" className="text-sm font-bold text-slate-600 underline">← Zurück zu Home</Link>
        <h1 className="mt-5 text-3xl font-black tracking-tight">PRO-Meldungen testen</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Wähle eine Meldung. Mit X schließt du die Vorschau; anschließend kannst du sie jederzeit wieder öffnen.
        </p>
        <button type="button" onClick={() => show(selected)}
          className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white">
          {scenario.label} erneut öffnen
        </button>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {scenarios.map(row => (
            <button key={row.id} type="button" onClick={() => show(row.id)}
              className={"rounded-xl border px-3 py-3 text-left text-xs font-bold " +
                (row.id === selected ? "border-violet-400 bg-violet-100 text-violet-900" : "border-slate-200 bg-white text-slate-700")}>
              {row.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">Nur Vorschau · keine Änderungen an Vereinsdaten oder Benachrichtigungen.</p>
      </div>
      {open ? (
        <ProTrialTransitionNotice
          key={scenario.id + ":" + revision}
          clubId="preview-club"
          userId="preview-user"
          trialEnd="2026-12-01T14:05:29.356Z"
          role={scenario.role}
          phase={scenario.phase}
          preview
          onPreviewClose={() => setOpen(false)}
        />
      ) : null}
      <div className="fixed inset-x-0 bottom-0 z-[200] border-t border-slate-200 bg-white/95 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(15,23,42,.12)] backdrop-blur-sm">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-slate-700">
            <span>POWER USER · VORSCHAU</span>
            <button type="button" onClick={() => setOpen(false)} className="underline">Vorschau schließen</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {scenarios.map(row => (
              <button key={row.id} type="button" onClick={() => show(row.id)}
                className={"shrink-0 rounded-xl px-3 py-2 text-xs font-bold " +
                  (row.id === selected ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700")}>
                {row.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">{scenario.info}. Vorschau verändert keine Vereinsdaten.</p>
        </div>
      </div>
    </main>
  );
}
