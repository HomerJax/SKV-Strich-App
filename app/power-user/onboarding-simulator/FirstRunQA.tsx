"use client";

import { useState, useTransition } from "react";
import { createQaIdentity, resetQaIdentity } from "./qa-actions";

type QaTest = { userId: string; email: string; password: string; joinPath: string };
export default function FirstRunQA() {
  const [pending, startTransition] = useTransition();
  const [test, setTest] = useState<QaTest | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function start() {
    startTransition(async () => {
      setError(""); setMessage("");
      const result = await createQaIdentity();
      if (result.error) setError(result.error);
      else setTest(result);
    });
  }
  function reset() {
    if (!test || !window.confirm("Nur dieses QA-Konto zurücksetzen? Bereits genutzte Trainings oder Beiträge verhindern den Reset.")) return;
    startTransition(async () => {
      setError(""); setMessage("");
      const result = await resetQaIdentity(test.userId);
      if (result.error) setError(result.error);
      else { setTest(null); setMessage("QA-Konto zurückgesetzt. Du kannst einen neuen Durchlauf starten."); }
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
        <h2 className="text-lg font-bold">QA-Spieler vorbereiten</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Erstellt einen separaten, markierten Testaccount für den 1. FC Strikr. Kein bestehender Spieler wird verändert. Öffne die Einladung in einem privaten Browserfenster, damit deine Power-User-Sitzung erhalten bleibt.</p>
        <button type="button" disabled={pending || !!test} onClick={start} className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Bitte warten …" : "QA-Testspieler erstellen"}
        </button>
        {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
        {message && <p role="status" className="mt-4 text-sm font-semibold text-emerald-700">{message}</p>}
        {test && <div className="mt-5 space-y-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
          <p className="font-bold text-slate-900">Testkonto bereit</p>
          <p className="text-xs text-slate-700">Melde dich mit diesen Daten über die originale Login-Seite an und durchlaufe danach das echte Onboarding. Die Registrierung ist bereits technisch angelegt.</p>
          <div className="break-all text-sm"><strong>E-Mail:</strong> {test.email}</div>
          <div className="break-all text-sm"><strong>Passwort:</strong> {test.password}</div>
          <a href={test.joinPath} target="_blank" rel="noopener noreferrer" className="inline-block rounded-xl bg-cyan-700 px-4 py-3 text-sm font-bold text-white">Originalen Einladungsablauf öffnen</a>
          <div><button type="button" disabled={pending} onClick={reset} className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-50">QA-Konto sicher zurücksetzen</button></div>
        </div>}
      </section>
      <p className="text-xs leading-5 text-amber-800">Der Reset löscht nur das eigene markierte QA-Konto und wird verweigert, sobald Trainings-, Kassen- oder andere Spieleraktivitäten vorhanden sind. Anschließend kann ein neues QA-Konto angelegt werden. Nach Neuladen dieser Seite sind die einmalig angezeigten Testdaten nicht mehr verfügbar.</p>
    </div>
  );
}
