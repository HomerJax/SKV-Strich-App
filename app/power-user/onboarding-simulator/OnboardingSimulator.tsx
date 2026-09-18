"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  Rocket,
  Share2,
  Sparkles,
  Trophy,
  Users,
  WandSparkles,
} from "lucide-react";

type Step = "account" | "team" | "club" | "balance" | "groups" | "done";

const steps: Array<{ key: Step; label: string }> = [
  { key: "account", label: "Account" },
  { key: "team", label: "Teamname" },
  { key: "club", label: "Club-Look" },
  { key: "balance", label: "Faire Teams" },
  { key: "groups", label: "Spielergruppen" },
  { key: "done", label: "Startklar" },
];

export default function OnboardingSimulator() {
  const [index, setIndex] = useState(0);
  const [teamName, setTeamName] = useState("SKV Rutesheim AH");
  const [strength, setStrength] = useState(true);
  const [groups, setGroups] = useState(true);
  const [sport, setSport] = useState("Fußball");
  const step = steps[index].key;

  const progress = useMemo(
    () => Math.round(((index + 1) / steps.length) * 100),
    [index],
  );

  function next() {
    setIndex((value) => Math.min(steps.length - 1, value + 1));
  }

  function previous() {
    setIndex((value) => Math.max(0, value - 1));
  }

  function restart() {
    setIndex(0);
  }

  return (
    <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-sm">
      <div className="relative overflow-hidden bg-[#070b12] p-5 text-white sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-8 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">
                Power User · Simulation
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-[-.035em] sm:text-3xl">
                Admin-Onboarding durchspielen
              </h1>
            </div>
            <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black text-emerald-200">
              KEINE ECHTEN ÄNDERUNGEN
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/55">
            Das ist eine lokale Simulation des neuen Starts. Du kannst klicken, Werte ändern
            und den kompletten Flow prüfen, ohne einen Club oder Einstellungen zu verändern.
          </p>

          <div className="mt-6 grid grid-cols-6 gap-1.5">
            {steps.map((item, itemIndex) => {
              const done = itemIndex < index;
              const active = itemIndex === index;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setIndex(itemIndex)}
                  className="min-w-0 text-left"
                >
                  <div
                    className={[
                      "h-1.5 rounded-full",
                      done || active
                        ? "bg-gradient-to-r from-cyan-300 to-violet-400"
                        : "bg-white/10",
                    ].join(" ")}
                  />
                  <div className="mt-2 flex items-center gap-1">
                    {done ? (
                      <Check className="h-3 w-3 shrink-0 text-cyan-300" />
                    ) : (
                      <Circle
                        className={[
                          "h-2.5 w-2.5 shrink-0",
                          active ? "fill-white text-white" : "text-white/20",
                        ].join(" ")}
                      />
                    )}
                    <span
                      className={[
                        "truncate text-[9px] font-bold",
                        active
                          ? "text-white"
                          : done
                            ? "text-white/55"
                            : "text-white/25",
                      ].join(" ")}
                    >
                      {item.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {step === "account" ? (
          <div className="grid gap-4 md:grid-cols-[1fr_.9fr]">
            <div className="rounded-[28px] bg-[#070b12] p-6 text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                Dein Team startet hier
              </div>
              <h2 className="mt-5 text-4xl font-black leading-[.98] tracking-[-.05em]">
                Noch ein Account.
                <span className="block bg-gradient-to-r from-white via-cyan-200 to-violet-300 bg-clip-text text-transparent">
                  Dann wird&apos;s gut.
                </span>
              </h2>
              <p className="mt-4 text-sm font-medium leading-6 text-white/55">
                Danach direkt Club anlegen, faire Teams einstellen und Mannschaft reinholen.
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-violet-600">
                Account
              </div>
              <div className="mt-2 text-2xl font-black text-slate-950">Kurz registrieren.</div>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400">
                  du@beispiel.de
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400">
                  ••••••••
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === "team" ? (
          <div className="mx-auto max-w-xl">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-600">
              Los geht&apos;s
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-slate-950">
              Wie heißt euer Team?
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Mehr brauchen wir für den Start noch nicht.
            </p>
            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              className="mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-bold outline-none focus:border-cyan-400 focus:bg-white"
            />
          </div>
        ) : null}

        {step === "club" ? (
          <div className="mx-auto max-w-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <WandSparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-600">
                  Euer Auftritt
                </div>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Mach strikr zu eurem Club.
                </h2>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="rounded-[22px] border border-slate-200 border-t-4 border-t-slate-950 bg-white p-4">
                <div className="text-lg font-black text-slate-950">{teamName || "Dein Team"}</div>
                <div className="mt-1 text-sm text-slate-500">{sport} · euer Club in strikr</div>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-black uppercase tracking-[.12em] text-slate-500">
                Sportart
              </label>
              <select
                value={sport}
                onChange={(event) => setSport(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold"
              >
                <option>Fußball</option>
                <option>Handball</option>
                <option>Basketball</option>
                <option>Volleyball</option>
              </select>
            </div>
          </div>
        ) : null}

        {step === "balance" ? (
          <div className="mx-auto max-w-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">
                  Faire Teams
                </div>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Sag strikr nur, was zählen soll.
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <label className="flex cursor-pointer gap-4 rounded-[22px] border border-violet-100 bg-violet-50/60 p-4">
                <input
                  type="checkbox"
                  checked={strength}
                  onChange={(event) => setStrength(event.target.checked)}
                  className="mt-1 h-5 w-5 accent-slate-950"
                />
                <div>
                  <div className="text-sm font-black text-slate-950">
                    Individuelle Stärke <span className="ml-1 rounded-full bg-slate-950 px-2 py-0.5 text-[9px] text-white">EMPFOHLEN</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Stärke 1–5 sorgt für feinere Balance.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer gap-4 rounded-[22px] border border-cyan-100 bg-cyan-50/60 p-4">
                <input
                  type="checkbox"
                  checked={groups}
                  onChange={(event) => setGroups(event.target.checked)}
                  className="mt-1 h-5 w-5 accent-slate-950"
                />
                <div>
                  <div className="text-sm font-black text-slate-950">Spielergruppen / Kategorien</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Sinnvoll bei AH, Ü32 oder klar unterschiedlichen Gruppen.
                  </div>
                </div>
              </label>
            </div>
          </div>
        ) : null}

        {step === "groups" ? (
          <div className="mx-auto max-w-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">
                  Spielergruppen
                </div>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Nur so viel Struktur wie ihr braucht.
                </h2>
              </div>
            </div>

            <div className="mt-6 rounded-[22px] border border-cyan-100 bg-cyan-50 p-4 text-sm leading-6 text-slate-700">
              {groups
                ? "Kategorien sind aktiv. Beispiel: AH als stärkere Gruppe und Ü32 als normale Gruppe."
                : "Kategorien sind ausgeschaltet. strikr arbeitet nur mit individueller Stärke und Positionen."}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm font-black text-amber-950">★ AH</div>
                <div className="mt-1 text-xs text-amber-800">Stärkere Kategorie</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-black text-slate-950">Ü32</div>
                <div className="mt-1 text-xs text-slate-500">Normale Kategorie</div>
              </div>
            </div>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="overflow-hidden rounded-[28px]">
            <div className="relative overflow-hidden bg-[#070b12] px-6 py-10 text-center text-white">
              <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10 bg-white/8">
                <Trophy className="h-7 w-7 text-cyan-200" />
              </div>
              <div className="relative mt-5 text-[10px] font-black uppercase tracking-[.22em] text-cyan-300">
                Setup geschafft
              </div>
              <h2 className="relative mt-2 text-3xl font-black tracking-[-.04em]">
                {teamName || "Dein Team"} ist startklar.
              </h2>
              <p className="relative mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-white/55">
                Faire Teams, Ergebnisse, Tabelle, Stats und Trophäen können starten.
              </p>
            </div>

            <div className="grid gap-3 bg-slate-50 p-5 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-[22px] bg-slate-950 p-4 text-white">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-300">
                    Empfohlen
                  </div>
                  <div className="mt-1 text-sm font-black">Erstes Training anlegen</div>
                </div>
                <Rocket className="h-5 w-5" />
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-white p-4">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[.16em] text-slate-400">
                    Team
                  </div>
                  <div className="mt-1 text-sm font-black text-slate-950">Invite-Link teilen</div>
                </div>
                <Share2 className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <div className="text-xs font-bold text-slate-400">
            Schritt {index + 1} von {steps.length} · {progress}%
          </div>

          <div className="flex gap-2">
            {index > 0 ? (
              <button
                type="button"
                onClick={previous}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück
              </button>
            ) : null}

            {index < steps.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
              >
                Weiter
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={restart}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
              >
                <Rocket className="h-4 w-4" />
                Nochmal starten
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
