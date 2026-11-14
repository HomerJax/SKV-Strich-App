"use client";

import { useState } from "react";
import SignupForm from "@/app/signup/SignupForm";
import OnboardingForm from "@/app/onboarding/OnboardingForm";

type Step = "invite" | "signup" | "onboarding" | "done";

export default function FirstRunQA() {
  const [step, setStep] = useState<Step>("invite");
  const [round, setRound] = useState(0);
  const [firstName, setFirstName] = useState("");
  const reset = () => { setRound((value) => value + 1); setFirstName(""); setStep("invite"); };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-950 px-5 py-5 text-white">
        <div className="text-xs font-bold uppercase tracking-widest text-cyan-300">Power User · In-App-Test</div>
        <h1 className="mt-2 text-2xl font-black">Spieler-Onboarding durchspielen</h1>
        <p className="mt-2 text-sm text-white/70">1. FC Strikr 2026 · Du bleibst in der App angemeldet.</p>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
        <span>Geschützter UI-Test mit den originalen Formular-Komponenten. Anmeldung, Vereinsbeitritt und Datenbankänderungen werden nicht ausgeführt.</span>
        <button type="button" onClick={reset} className="shrink-0 rounded-lg bg-white px-3 py-2 font-bold ring-1 ring-amber-300">Erneut testen</button>
      </div>
      <div key={round}>
        {step === "invite" && (
          <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Schritt 1 von 3 · Einladung</p>
            <h2 className="mt-3 text-2xl font-bold">Du wurdest eingeladen!</h2>
            <p className="mt-3 text-sm text-slate-600">Du hast eine Einladung als Spieler zum 1. FC Strikr 2026 erhalten. Erstelle dein Konto, um dem Team beizutreten.</p>
            <button type="button" onClick={() => setStep("signup")} className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">Konto erstellen</button>
          </div>
        )}
        {step === "signup" && <SignupForm qaPreview={{ onComplete: () => setStep("onboarding") }} />}
        {step === "onboarding" && <OnboardingForm inviteFlow qaPreview={{ onComplete: (input) => { setFirstName(input.firstName); setStep("done"); } }} />}
        {step === "done" && (
          <div className="mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Schritt 3 von 3 · Abschluss</p>
            <h2 className="mt-3 text-2xl font-bold">Willkommen{firstName ? `, ${firstName}` : ""}!</h2>
            <p className="mt-3 text-sm text-slate-600">Das Formular-Onboarding ist durchlaufen. Ein echter Vereinsbeitritt und die anschließende Spieleransicht sind in diesem geschützten Testmodus noch nicht abgebildet.</p>
            <button type="button" onClick={reset} className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">Erneut testen</button>
          </div>
        )}
      </div>
    </div>
  );
}
