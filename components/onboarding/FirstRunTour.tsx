"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Role = "player" | "admin";
type Step = { title: string; detail: string; path: string; action: string };
const PLAYER: Step[] = [
  { title: "Willkommen bei strikr!", detail: "Hier läuft alles rund um deine Trainingsgruppe. Wir zeigen dir kurz, was du als Spieler machen kannst.", path: "/home", action: "Los geht's" },
  { title: "Beim Training zu- oder absagen", detail: "Das ist deine wichtigste Aufgabe: Gib rechtzeitig Bescheid, ob du dabei bist. So kann eure Gruppe planen.", path: "/sessions", action: "Trainings ansehen" },
  { title: "Deine Mannschaft", detail: "Nach der Einteilung siehst du, mit wem du spielst. Die Aufstellung wird vom Trainingsleiter erstellt.", path: "/sessions", action: "Weiter" },
  { title: "Ergebnisse und Tabelle", detail: "Nach dem Training kannst du Ergebnisse und eure Entwicklung verfolgen.", path: "/standings", action: "Tabelle ansehen" },
  { title: "Badges sammeln", detail: "Mit Einsätzen und Erfolgen kannst du Auszeichnungen freischalten.", path: "/badges", action: "Badges ansehen" },
  { title: "Du bist startklar!", detail: "Am besten schaust du gleich nach dem nächsten Training und gibst deine Zusage ab.", path: "/home", action: "Zur Startseite" },
];
const ADMIN: Step[] = [
  { title: "Willkommen, Team-Admin!", detail: "Du organisierst eure Gruppe mit strikr. Wir zeigen dir die wichtigsten Schritte.", path: "/home", action: "Los geht's" },
  { title: "Mitglieder einladen", detail: "Lade deine Mitspieler per Link ein. Sie können anschließend selbst ihre Teilnahme verwalten.", path: "/admin/members", action: "Mitglieder öffnen" },
  { title: "Training organisieren", detail: "Lege Trainingstermine fest und prüfe, wer zugesagt hat.", path: "/sessions", action: "Trainings öffnen" },
  { title: "Faire Teams erstellen", detail: "Am Trainingstag kannst du aus den Anwesenden ausgeglichene Mannschaften erstellen.", path: "/sessions", action: "Weiter" },
  { title: "Ergebnisse abschließen", detail: "Nach dem Spiel trägst du das Ergebnis ein und schließt das Training ab.", path: "/sessions", action: "Weiter" },
  { title: "Bereit für euer erstes Training!", detail: "Du kannst diese Einführung jederzeit über die Hilfe erneut starten.", path: "/home", action: "Zur Startseite" },
];

export default function FirstRunTour({ userId, role }: { userId: string; role: Role }) {
  const router = useRouter();
  const pathname = usePathname();
  const key = `strikr-first-run-tour-v1:${userId}:${role}`;
  const steps = role === "admin" ? ADMIN : PLAYER;
  const [step, setStep] = useState<number | null>(null);
  useEffect(() => {
    const saved = window.localStorage.getItem(key);
    setStep(saved === "done" ? null : saved ? Math.min(Number(saved) || 0, steps.length - 1) : 0);
  }, [key, steps.length]);
  function finish() {
    window.localStorage.setItem(key, "done");
    setStep(null);
  }
  function next() {
    if (step === null) return;
    if (step === steps.length - 1) { finish(); router.push("/home"); return; }
    const nextStep = step + 1;
    window.localStorage.setItem(key, String(nextStep));
    setStep(nextStep);
    if (steps[nextStep].path !== pathname) router.push(steps[nextStep].path);
  }
  if (step === null || pathname.startsWith("/onboarding") || pathname.startsWith("/join") || pathname.startsWith("/signup")) return null;
  const item = steps[step];
  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-slate-950/70 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 sm:items-center" role="dialog" aria-modal="true" aria-label="strikr Einführung">
      <section className="w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-widest text-indigo-600">strikr · {role === "admin" ? "Admin" : "Spieler"}-Tour</span>
          <button type="button" onClick={finish} className="rounded-lg px-2 py-1 text-sm text-slate-500">Überspringen</button>
        </div>
        <div className="mt-4 flex gap-1.5">{steps.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-indigo-600" : "bg-slate-200"}`} />)}</div>
        <h2 className="mt-6 text-2xl font-black tracking-tight">{item.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
        <p className="mt-3 text-xs text-slate-400">Schritt {step + 1} von {steps.length}</p>
        <div className="mt-6 flex gap-3">
          <button type="button" disabled={step === 0} onClick={() => { const prev = Math.max(0, step - 1); setStep(prev); window.localStorage.setItem(key, String(prev)); router.push(steps[prev].path); }} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold disabled:opacity-30">Zurück</button>
          <button type="button" onClick={next} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">{item.action}</button>
        </div>
      </section>
    </div>
  );
}
