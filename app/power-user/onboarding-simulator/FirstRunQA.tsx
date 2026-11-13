"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, ShieldAlert } from "lucide-react";

type Scenario = "invited" | "admin" | "waiting" | "second-club";
const scenarios: { id: Scenario; title: string; description: string }[] = [
  { id: "invited", title: "Eingeladener Spieler", description: "Einladung → Registrierung → Profil → Vereinsbeitritt → Spieler-Home" },
  { id: "admin", title: "Neuer Vereinsgründer", description: "Registrierung → Profil → echte Vereinseinrichtung" },
  { id: "waiting", title: "Spieler ohne Einladung", description: "Registrierung → Profil → auf Einladung warten" },
  { id: "second-club", title: "Bestehender Spieler – zweiter Verein", description: "Einladung → Beitritt → Vereinswechsel" },
];

export default function FirstRunQA() {
  const [scenario, setScenario] = useState<Scenario>("invited");
  const [inviteUrl, setInviteUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const needsInvite = scenario === "invited" || scenario === "second-club";
  const token = (() => {
    try {
      const parsed = new URL(inviteUrl, "https://strikr.team");
      return parsed.pathname === "/join" ? parsed.searchParams.get("token")?.trim() ?? "" : "";
    } catch { return ""; }
  })();
  const target = needsInvite ? (token ? `/join?token=${encodeURIComponent(token)}` : "")
    : scenario === "admin" ? "/signup?next=%2Fclub-setup" : "/signup";
  const canStart = confirmed && !!target;

  return (
    <div className="space-y-5">
      <header className="rounded-2xl bg-[#071522] p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Power User · Onboarding QA</p>
        <h1 className="mt-2 text-2xl font-black">Echtes Onboarding testen</h1>
        <p className="mt-2 text-sm text-white/75">Keine Vorschauen oder nachgebauten Folgeseiten: Der Test startet direkt auf den originalen strikr-Routen.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {scenarios.map((item) => (
          <button key={item.id} type="button" aria-pressed={scenario === item.id}
            onClick={() => { setScenario(item.id); setConfirmed(false); }}
            className={`rounded-2xl border p-4 text-left ${scenario === item.id ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500" : "border-slate-200 bg-white"}`}>
            <div className="font-bold text-slate-950">{item.title}</div>
            <p className="mt-1 text-sm text-slate-600">{item.description}</p>
          </button>
        ))}
      </div>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        {needsInvite ? (
          <label className="block text-sm font-semibold text-slate-800">
            Gültigen Einladungslink des Testvereins einfügen
            <input value={inviteUrl} onChange={(e) => { setInviteUrl(e.target.value); setConfirmed(false); }}
              placeholder="https://strikr.team/join?token=..."
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
            {inviteUrl && !token ? <span className="mt-2 block text-xs text-red-700">Bitte einen gültig aufgebauten /join?token=...-Link eingeben.</span> : null}
          </label>
        ) : null}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p><strong>Echter Ablauf, kein Sandbox-Modus.</strong> Registrierung, Beitritt und Einrichtung können echte Daten schreiben. Verwende ausschließlich eigens angelegte Testkonten und einen Testverein. Zum Testen einer neuen Registrierung vorher aus deinem bestehenden Konto abmelden oder ein privates Browserfenster nutzen.</p>
        </div>
        <label className="flex items-start gap-3 text-sm text-slate-800">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-4 w-4" />
          Ich verwende Testkonten und verstehe, dass echte Änderungen entstehen können.
        </label>
        {canStart ? (
          <Link href={target} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">
            Originalen Ablauf starten <ExternalLink className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-5 py-3 font-bold text-slate-500">
            Originalen Ablauf starten <ArrowRight className="h-4 w-4" />
          </span>
        )}
        <p className="text-xs text-slate-500">Für eine vollständig schreibgeschützte Ende-zu-Ende-Simulation ist eine getrennte Staging-Umgebung mit Testbenutzern und Testeinladungen erforderlich. Die bisherige Ablauf-Vorschau wird nicht mehr angezeigt.</p>
      </section>
      <Link href="/power-user" className="text-sm font-semibold text-slate-700">← Zurück zur Power-User-Verwaltung</Link>
    </div>
  );
}
