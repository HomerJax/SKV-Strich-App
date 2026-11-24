"use client";

import { useState } from "react";
import Link from "next/link";
import ProTrialTransitionNotice, { type ProTrialNoticePhase, type ProTrialNoticeRole } from "@/components/home/ProTrialTransitionNotice";

type Scenario = { id: string; role: ProTrialNoticeRole; phase: ProTrialNoticePhase; label: string; info: string };
const scenarios: Scenario[] = [
  { id: "player3", role: "player", phase: "three_days", label: "Spieler · 3 Tage vorher", info: "Einmalig ab 72 Stunden vor Ablauf. Schließbar, danach kein erneutes Aufpoppen." },
  { id: "admin3", role: "admin", phase: "three_days", label: "Admin · 3 Tage vorher", info: "Mit PRO-Vorteilen, Preisen und direktem Upgrade-Link." },
  { id: "player1", role: "player", phase: "three_days", label: "Spieler · 1 Tag vorher", info: "Kein zweiter Hinweis: Wer den 3-Tage-Hinweis bereits geschlossen hat, sieht hier nichts mehr." },
  { id: "admin1", role: "admin", phase: "one_day", label: "Admin · 1 Tag vorher", info: "Ein zweiter, eigenständig schließbarer Hinweis nur für Admins." },
  { id: "playerFree", role: "player", phase: "free", label: "Spieler · Free aktiv", info: "Einmalig nach Ablauf, maximal sieben Tage lang." },
  { id: "adminFree", role: "admin", phase: "free", label: "Admin · Free aktiv", info: "Einmalig nach Ablauf, mit Upgrade-Option." },
];

export default function ProTrialPreview() {
  const [selected, setSelected] = useState("player3");
  const scenario = scenarios.find(row => row.id === selected) ?? scenarios[0];
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-7 text-slate-950 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/home" className="text-sm font-bold text-slate-600 underline">← Zurück zu strikr</Link>
        <h1 className="mt-5 text-3xl font-black tracking-tight">PRO-Testphase: alle 6 Meldungen</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Geschützte Vorschau für Power User. Alle sechs Situationen können hier simuliert werden,
          ohne ein Abo, einen Verein oder den echten Zeitpunkt zu verändern.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {scenarios.map(row => (
            <button key={row.id} type="button" onClick={() => setSelected(row.id)}
              className={"rounded-xl border px-3 py-3 text-left text-xs font-bold transition " +
              (selected === row.id ? "border-violet-500 bg-violet-100 text-violet-900" :
                "border-slate-200 bg-white text-slate-700 hover:bg-slate-100")}>
              {row.label}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
          <strong>{scenario.label}:</strong> {scenario.info}
        </div>
        <div className="mx-auto mt-5 max-w-[430px] rounded-[30px] border border-slate-200 bg-white p-3 shadow-md">
          <div className="mb-3 rounded-2xl bg-slate-950 px-4 py-3 text-white">
            <div className="text-sm font-black">strikr · Home</div>
            <div className="mt-0.5 text-xs text-white/60">Beispielverein · Trainingsübersicht</div>
          </div>
          <ProTrialTransitionNotice
            key={scenario.id}
            clubId="preview-club"
            userId="preview-user"
            trialEnd="2026-12-01T14:05:29.356Z"
            role={scenario.role}
            phase={scenario.phase}
            preview
          />
          <div className="mt-3 rounded-xl bg-slate-50 px-4 py-5 text-xs font-medium text-slate-400">
            Nächstes Training · Donnerstag 19:00 Uhr
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Die Vorschau speichert keinen Schließstatus. Die echten Meldungen sind pro Nutzer, Verein, Testphase und Nachricht schließbar.
        </p>
      </div>
    </main>
  );
}
