"use client";

import { useState } from "react";
import SignupForm from "@/app/signup/SignupForm";
import OnboardingForm from "@/app/onboarding/OnboardingForm";

type Mode = "invite" | "founder";
type Step = "choose" | "invite" | "signup" | "onboarding" | "done";

export default function FirstRunQA() {
  const [step, setStep] = useState<Step>("choose");
  const [mode, setMode] = useState<Mode>("invite");
  const [round, setRound] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [clubName, setClubName] = useState("");
  const reset = () => { setRound((v) => v + 1); setFirstName(""); setClubName(""); setStep("choose"); };
  const choose = (value: Mode) => { setMode(value); setStep(value === "invite" ? "invite" : "signup"); };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-950 px-5 py-5 text-white">
        <div className="text-xs font-bold uppercase tracking-widest text-cyan-300">Power User · In-App-Test</div>
        <h1 className="mt-2 text-2xl font-black">Onboarding durchspielen</h1>
        <p className="mt-2 text-sm text-white/70">Vereinsgründung oder Spielereinladung · Du bleibst angemeldet.</p>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
        <span>Geschützter Test mit originalen Registrierungs- und Profilformularen. Keine echten Konten, Vereine oder Datenbankänderungen.</span>
        <button type="button" onClick={reset} className="shrink-0 rounded-lg bg-white px-3 py-2 font-bold ring-1 ring-amber-300">Neu starten</button>
      </div>
      <div key={round}>
        {step === "choose" && (
          <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">Welchen Einstieg möchtest du testen?</h2>
            <button type="button" onClick={() => choose("founder")} className="block w-full rounded-xl border border-slate-200 p-5 text-left hover:bg-slate-50">
              <span className="block font-bold">Neuen Verein gründen</span>
              <span className="mt-1 block text-sm text-slate-600">Registrierung und Onboarding als neuer Admin</span>
            </button>
            <button type="button" onClick={() => choose("invite")} className="block w-full rounded-xl border border-slate-200 p-5 text-left hover:bg-slate-50">
              <span className="block font-bold">Als Spieler eingeladen werden</span>
              <span className="mt-1 block text-sm text-slate-600">Einladung zum 1. FC Strikr 2026 annehmen</span>
            </button>
          </div>
        )}
        {step === "invite" && (
          <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-bold">Du wurdest eingeladen!</h2>
            <p className="mt-3 text-sm text-slate-600">Du hast eine Einladung als Spieler zum 1. FC Strikr 2026 erhalten.</p>
            <button type="button" onClick={() => setStep("signup")} className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">Konto erstellen</button>
          </div>
        )}
        {step === "signup" && <SignupForm initialNext={mode === "founder" ? "/club-setup" : ""} qaPreview={{ onComplete: () => setStep("onboarding") }} />}
        {step === "onboarding" && <OnboardingForm inviteFlow={mode === "invite"} qaPreview={{ onComplete: (input) => { setFirstName(input.firstName); setClubName(input.clubName); if (mode === "founder") { window.location.assign("/power-user/onboarding-simulator/wizard"); } else { setStep("done"); } } }} />}
        {step === "done" && (
          <div className="mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-white p-6">
            <h2 className="text-2xl font-bold">Willkommen{firstName ? `, ${firstName}` : ""}!</h2>
            <p className="mt-3 text-sm text-slate-600">{mode === "founder" ? `Der Einstieg zur Vereinsgründung${clubName ? ` für ${clubName}` : ""} ist durchlaufen.` : "Der Einstieg als eingeladener Spieler ist durchlaufen."} Weitere Einrichtungsschritte und die echte Spieleransicht sind noch nicht Teil dieses geschützten Tests.</p>
            <button type="button" onClick={reset} className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3 font-bold text-white">Erneut testen</button>
          </div>
        )}
      </div>
    </div>
  );
}
