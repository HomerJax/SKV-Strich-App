"use client";

import { useState, useTransition } from "react";
import { createQaIdentity } from "./qa-actions";

export default function FirstRunQA() {
  const [pending, startTransition] = useTransition();
  const [test, setTest] = useState<{ email: string; password: string; joinPath: string } | null>(null);
  const [error, setError] = useState("");
  function start() {
    startTransition(async () => {
      setError("");
      setTest(null);
      const result = await createQaIdentity();
      if (result.error) setError(result.error);
      else setTest(result);
    });
  }
  return (
    <div className="space-y-5">
      <header className="rounded-2xl bg-[#071522] px-5 py-6 text-white">
        <div className="text-xs font-bold uppercase tracking-widest text-cyan-300">Power User · Originaler Produktablauf</div>
        <h1 className="mt-2 text-2xl font-black">Spieler-Onboarding testen</h1>
        <p className="mt-2 text-sm text-white/70">1. FC Strikr 2026 · Original-Login, Profil-Onboarding und Vereinsbeitritt.</p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold">Separaten QA-Spieler vorbereiten</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Erstellt einen isolierten Testaccount mit eigener Einladung für den 1. FC Strikr. Kein bestehender Spieler wird verändert. Für den vollständigen Einstieg öffnest du den Einladungslink in einem privaten Fenster.</p>
        <button type="button" disabled={pending} onClick={start} className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Testkonto wird vorbereitet …" : "Neuen QA-Testspieler erstellen"}
        </button>
        {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
        {test && <div className="mt-5 space-y-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
          <p className="font-bold text-slate-900">Testkonto bereit</p>
          <p className="text-xs text-slate-700">Die Registrierung ist bereits technisch angelegt. Melde dich mit diesen Testdaten über die originale Login-Seite an und durchlaufe danach das echte Onboarding.</p>
          <div className="break-all text-sm"><strong>E-Mail:</strong> {test.email}</div>
          <div className="break-all text-sm"><strong>Passwort:</strong> {test.password}</div>
          <a href={test.joinPath} target="_blank" rel="noopener noreferrer" className="inline-block rounded-xl bg-cyan-700 px-4 py-3 text-sm font-bold text-white">Originalen Einladungsablauf öffnen</a>
        </div>}
      </section>
      <p className="text-xs leading-5 text-amber-800">Noch kein automatischer Reset: Jeder Durchlauf erzeugt einen neuen, klar markierten QA-Account. Die QA-Accounts werden derzeit nicht automatisch gelöscht.</p>
    </div>
  );
}
