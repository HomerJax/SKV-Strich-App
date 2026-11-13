"use client";

import { useState, useTransition } from "react";
import { createQaInvite } from "./qa-actions";

export default function FirstRunQA() {
  const [pending, startTransition] = useTransition();
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  function start() {
    startTransition(async () => {
      setError("");
      setPath("");
      const result = await createQaInvite();
      setError(result.error);
      setPath(result.joinPath);
    });
  }
  return (
    <div className="space-y-5">
      <header className="rounded-2xl bg-[#071522] px-5 py-6 text-white">
        <div className="text-xs font-bold uppercase tracking-widest text-cyan-300">Power User · Echter Produkttest</div>
        <h1 className="mt-2 text-2xl font-black">Spieler-Onboarding testen</h1>
        <p className="mt-2 text-sm text-white/70">1. FC Strikr 2026 · echte Registrierung, echtes Onboarding und echter Vereinsbeitritt.</p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold">Neuen Testdurchlauf vorbereiten</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Erstellt eine neue, eine Stunde gültige Einladung für den Testverein. Die anschließenden Seiten sind die originalen strikr-Seiten, keine Vorschau.
        </p>
        <button type="button" disabled={pending} onClick={start}
          className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Einladung wird erstellt …" : "Testeinladung erstellen"}
        </button>
        {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
        {path && (
          <div className="mt-5 space-y-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
            <p className="text-sm font-bold text-slate-900">Einladung bereit</p>
            <p className="text-xs leading-5 text-slate-700">Öffne den Link in einem privaten Browserfenster, damit deine Power-User-Sitzung bestehen bleibt. Für eine echte Neuregistrierung wird eine eigene Test-E-Mail-Adresse benötigt.</p>
            <a href={path} target="_blank" rel="noopener noreferrer" className="inline-block rounded-xl bg-cyan-700 px-4 py-3 text-sm font-bold text-white">Originalen Einladungsablauf öffnen</a>
            <p className="break-all text-xs text-slate-600">{path}</p>
          </div>
        )}
      </section>
      <p className="text-xs leading-5 text-amber-800">Hinweis: Ein automatischer Account-Reset ist noch nicht aktiv. Bereits angelegte Testkonten werden nicht verändert oder gelöscht.</p>
    </div>
  );
}
