"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, ShieldCheck, Smartphone, Users } from "lucide-react";
import SignupForm from "@/app/signup/SignupForm";
import OnboardingForm from "@/app/onboarding/OnboardingForm";
import AdminSetupPreview from "./AdminSetupPreview";
import AdminFirstHomePreview from "./AdminFirstHomePreview";
import WaitingForInviteContent from "@/components/onboarding/WaitingForInviteContent";

type Scenario = "admin" | "invited" | "waiting" | "second-club";
type Stage = "signup" | "onboarding" | "club-setup" | "after";
type PreviewSize = "desktop" | "narrow";

const SCENARIOS: Record<Scenario, { title: string; description: string; flow: string; expected: string[] }> = {
  admin: {
    title: "Neuer Vereinsgründer",
    description: "Erster Account, erster Verein, danach Vereinseinrichtung.",
    flow: "/signup → /onboarding → /club-setup?created=1",
    expected: ["Vereinsname ist Pflicht", "Admin wird dem neuen Verein zugeordnet", "Club-Setup ist der nächste echte Schritt", "Einladungsweg und erster Termin sind auffindbar"],
  },
  invited: {
    title: "Neuer eingeladener Spieler",
    description: "Spieler kommt über einen Einladungslink und erstellt seinen Account.",
    flow: "/join?token=… → /signup → /onboarding?next=/join… → /join → Home",
    expected: ["Beitritt zum richtigen Verein", "Keine fremde Vereinsgründung", "Keine Admin-Elemente für Mitglieder", "Training und Zu-/Absagen verständlich"],
  },
  waiting: {
    title: "Spieler ohne Einladung",
    description: "Neuer Account, vorerst kein Team – Nutzer wartet auf Einladung.",
    flow: "/signup → /onboarding → /waiting-for-invite",
    expected: ["Auf Einladung warten auswählbar", "Kein Verein wird erzeugt", "Warteansicht erklärt den nächsten Schritt", "Verein kann später gegründet werden"],
  },
  "second-club": {
    title: "Bestehender Spieler – zweiter Verein",
    description: "Bereits angemeldetes Mitglied tritt zusätzlich einem anderen Verein bei.",
    flow: "/join?token=… → Club-Beitritt → Vereine wechseln",
    expected: ["Vorhandenes Konto bleibt erhalten", "Kein zweites Konto nötig", "Club-Zuordnung korrekt", "Daten und Berechtigungen der Vereine bleiben getrennt"],
  },
};

function Progress({ stage, scenario }: { stage: Stage; scenario: Scenario }) {
  const items = scenario === "second-club" ? ["Einladung", "Vereinswechsel"] : scenario === "admin" ? ["Registrierung", "Profil", "Vereins-Setup", "Erster Einstieg"] : ["Registrierung", "Onboarding", "Erster Einstieg"];
  const position = stage === "signup" ? 0 : stage === "onboarding" ? 1 : stage === "club-setup" ? 2 : items.length - 1;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item, index) => (
        <div key={item} className="min-w-0">
          <div className={`h-1.5 rounded-full ${index <= position ? "bg-cyan-500" : "bg-slate-200"}`} />
          <div className={`mt-1.5 truncate text-[11px] font-bold ${index === position ? "text-slate-900" : "text-slate-500"}`}>{item}</div>
        </div>
      ))}
    </div>
  );
}

function Completion({
  scenario,
  firstName,
  clubName,
  onRestart,
}: {
  scenario: Scenario;
  firstName: string;
  clubName: string;
  onRestart: () => void;
}) {
  const info = SCENARIOS[scenario];
  const destination = scenario === "admin" ? "/club-setup?created=1"
    : scenario === "waiting" ? "/waiting-for-invite"
    : scenario === "invited" ? "/join?token=…"
    : "/select-club";
  return (
    <div className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        <div>
          <h2 className="text-xl font-extrabold text-slate-950">Simulierter Einstieg abgeschlossen</h2>
          <p className="mt-1 text-sm text-slate-600">Keine Registrierung, kein neuer Verein und keine Datenbankänderungen.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <strong>Ab hier Ablauf-Vorschau, kein echtes Home-Screenshot.</strong> Die tatsächlichen Nachfolgeansichten benötigen zur Abnahme eigene, isolierte Staging-Accounts mit der jeweiligen Rolle.
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <div className="text-xs font-bold uppercase tracking-[.12em] text-cyan-300">Nächste echte Route</div>
          <div className="mt-2 break-all text-lg font-black">{destination}</div>
          <p className="mt-3 text-sm text-white/65">{scenario === "admin"
            ? `Hallo ${firstName || "Admin"}! Nächster Schritt: ${clubName || "Dein Verein"} einrichten, Mitspieler einladen und erstes Training planen.`
            : scenario === "waiting" ? "Auf eine Einladung warten oder später selbst eine Gruppe anlegen."
            : scenario === "invited" ? "Einladung annehmen; erst danach erhält der Spieler seine vereinsbezogene Ansicht."
            : "Mit dem bestehenden Account dem zweiten Verein beitreten und zwischen den Vereinen wechseln."}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-5">
          <div className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">QA-Prüfung</div>
          <p className="mt-2 text-sm font-semibold text-slate-800">Was im echten Rollentest kontrolliert werden muss:</p>
          <div className="mt-3 space-y-2">
            {info.expected.map((item) => <div key={item} className="flex items-start gap-2 text-sm text-slate-700"><span className="mt-0.5 text-slate-400">□</span>{item}</div>)}
          </div>
        </div>
      </div>
      <button type="button" onClick={onRestart} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"><RotateCcw className="h-4 w-4" /> Neu beginnen</button>
    </div>
  );
}

export default function FirstRunQA({ categorySetup, teamSetup }: { categorySetup: React.ReactNode; teamSetup: React.ReactNode }) {
  const [scenario, setScenario] = useState<Scenario>("admin");
  const [stage, setStage] = useState<Stage>("signup");
  const [runId, setRunId] = useState(0);
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const [firstName, setFirstName] = useState("");
  const [clubName, setClubName] = useState("");

  const info = SCENARIOS[scenario];
  function restart(nextScenario: Scenario = scenario) {
    setScenario(nextScenario);
    setStage(nextScenario === "second-club" ? "after" : "signup");
    setRunId((id) => id + 1);
    setFirstName("");
    setClubName("");
  }

  const inviteFlow = scenario === "invited";
  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-[#071522] p-5 text-white sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[.17em] text-cyan-300">Interne Produkt-QA · Power User</div>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">First-Run-Simulator</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/65">Teste den Einstieg neuer Nutzer mit den echten Registrierungs- und Onboarding-Formularen. Die Registrierung lässt sich mit einem Klick simulieren – ohne Account oder Datenbankänderungen.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-200"><ShieldCheck className="h-4 w-4" /> Keine Writes</span>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-[.12em] text-slate-600">Einstiegsszenario</h2>
          <button type="button" onClick={() => restart()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><RotateCcw className="h-3.5 w-3.5" /> Zurücksetzen</button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(Object.keys(SCENARIOS) as Scenario[]).map((key) => (
            <button key={key} type="button" onClick={() => restart(key)} aria-pressed={key === scenario}
              className={`rounded-xl border p-3 text-left transition ${scenario === key ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500" : "border-slate-200 bg-slate-50 hover:bg-white"}`}>
              <div className="text-sm font-bold text-slate-950">{SCENARIOS[key].title}</div>
              <div className="mt-1 text-xs leading-5 text-slate-600">{SCENARIOS[key].description}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-700">
          <span className="font-bold">Reale Produktstrecke:</span> {info.flow}
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-950"><Users className="h-4 w-4" /> {info.title}</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPreviewSize(previewSize === "desktop" ? "narrow" : "desktop")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
              <Smartphone className="h-4 w-4" /> {previewSize === "desktop" ? "Schmale Vorschau" : "Volle Breite"}
            </button>
            {stage !== "signup" && scenario !== "second-club" ? <button type="button" onClick={() => { setStage(stage === "after" && scenario === "admin" ? "club-setup" : stage === "club-setup" ? "onboarding" : stage === "after" ? "onboarding" : "signup"); setRunId((id) => id + 1); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><ArrowLeft className="h-4 w-4" /> Zurück</button> : null}
          </div>
        </div>
        <div className="mx-auto mt-5 max-w-xl"><Progress stage={stage} scenario={scenario} /></div>
        <p className="mt-3 text-center text-xs text-slate-500">Schmale Breite ist nur eine Layout-Vorschau; CSS-Breakpoints bitte zusätzlich auf einem echten Mobilgerät prüfen.</p>
        <div className={`mx-auto mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-neutral-100 ${previewSize === "narrow" ? "max-w-[390px]" : "w-full"}`}>
          {stage === "signup" ? (
            <SignupForm key={`signup-${runId}`} initialNext={scenario === "admin" ? "/club-setup" : inviteFlow ? "/join?token=qa-preview" : ""}
              qaPreview={{ onComplete: () => setStage("onboarding") }} />
          ) : stage === "onboarding" ? (
            <OnboardingForm key={`onboarding-${runId}`} inviteFlow={inviteFlow}
              qaPreview={{ onComplete: (input) => {
                setFirstName(input.firstName);
                setClubName(input.clubName);
                if (scenario === "admin" && input.intention === "create-team") setStage("club-setup");
                else if (scenario === "admin" && input.intention === "wait-for-invite") { setScenario("waiting"); setStage("after"); }
                else setStage("after");
              } }} />
          ) : stage === "club-setup" && scenario === "admin" ? (
            <AdminSetupPreview key={`club-setup-${runId}`} name={clubName} teamSetup={teamSetup} categorySetup={categorySetup} onDone={() => setStage("after")} />
          ) : scenario === "waiting" ? (
            <WaitingForInviteContent qaPreview />
          ) : scenario === "admin" ? (
            <AdminFirstHomePreview key={`home-${runId}`} firstName={firstName} name={clubName} onRestart={() => restart()} />
          ) : (
            <Completion scenario={scenario} firstName={firstName} clubName={clubName} onRestart={() => restart()} />
          )}
        </div>
        {scenario === "second-club" ? <p className="mt-3 text-center text-xs text-amber-800">Bei bestehenden Konten gibt es keine erneute Registrierung. Dieser Pfad ist als Rollentest in Staging durchzuführen.</p> : null}
      </section>

      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
        <strong>Abnahmegrenze:</strong> Registrierung, persönliches Onboarding und der erste Club-Einstellungsschritt nutzen die echten Produktkomponenten. Team-/Kategorie-Setup und der erste Vereinsstart sind ausdrücklich vereinfachte Ablaufmodelle. Autorisierung, E-Mail-Verifizierung, Beitritt, echtes Home und RLS müssen mit isolierten Testkonten in Staging geprüft werden. Es werden keine produktiven Konten, Termine oder Vereinsdaten verändert.
      </div>
      <Link href="/power-user" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">Zurück zur Power-User-Verwaltung <ArrowRight className="h-4 w-4" /></Link>
    </div>
  );
}
