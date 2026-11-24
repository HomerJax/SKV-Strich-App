"use client";
import { useState } from "react";
import Link from "next/link";
import ProTrialTransitionNotice, { type ProTrialNoticePhase, type ProTrialNoticeRole } from "@/components/home/ProTrialTransitionNotice";

type Scenario = { id: string; role: ProTrialNoticeRole; phase: ProTrialNoticePhase; label: string; info: string };
const scenarios: Scenario[] = [
  { id: "player3", role: "player", phase: "three_days", label: "Spieler · 3 Tage", info: "Einmalig ab 72 Stunden vor Ablauf" },
  { id: "admin3", role: "admin", phase: "three_days", label: "Admin · 3 Tage", info: "Erinnerung mit Upgrade-Möglichkeit" },
  { id: "player1", role: "player", phase: "three_days", label: "Spieler · 1 Tag", info: "Keine neue Meldung – dieselbe einmalige 3-Tage-Info" },
  { id: "admin1", role: "admin", phase: "one_day", label: "Admin · 1 Tag", info: "Letzte, separat schließbare Erinnerung" },
  { id: "playerFree", role: "player", phase: "free", label: "Spieler · Free", info: "Einmalig nach dem Wechsel" },
  { id: "adminFree", role: "admin", phase: "free", label: "Admin · Free", info: "Einmalig nach dem Wechsel" },
];
export default function ProTrialPreview() {
  const [selected, setSelected] = useState("player3");
  const scenario = scenarios.find(row => row.id === selected) ?? scenarios[0];
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl">
        <Link href="/home" className="text-sm font-bold text-slate-600 underline">← Home</Link>
        <h1 className="mt-5 text-3xl font-black text-slate-950">PRO-Meldungen testen</h1>
        <p className="mt-2 text-sm text-slate-600">Wähle oben eine Situation. Du siehst exakt die neue Fullscreen-Meldung.</p>
      </div>
      <div className="fixed inset-x-0 top-0 z-[200] border-b border-slate-200 bg-white/95 px-3 py-3 shadow-lg backdrop-blur-sm">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-slate-700">
            <span>POWER USER · VORSCHAU</span>
            <Link href="/home" className="underline">Zurück zu Home</Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {scenarios.map(row => (
              <button key={row.id} type="button" onClick={() => setSelected(row.id)}
                className={"shrink-0 rounded-xl px-3 py-2 text-xs font-bold " +
                  (row.id === selected ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700")}>
                {row.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">{scenario.info}. Vorschau verändert keine Vereinsdaten.</p>
        </div>
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
    </main>
  );
}
