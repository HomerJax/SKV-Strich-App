"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import ResultShareCard from "@/components/share/result-share/ResultShareCard";
import type { ExtendedResultShareData } from "@/components/share/result-share/result-share.types";

type VoteState = "like" | "dislike";

const SCENARIOS = [
  {
    id: "skv",
    clubName: "SKV Rutesheim AH",
    score: "6:4",
    headline: "UNDER\nDOG.",
    subline: "IN UNTERZAHL\nGEWONNEN.",
    image: "/dev/mock-winner-story.png",
  },
];

const REAL_RESULT_SHARE_PREVIEW_DATA: ExtendedResultShareData = {
  sessionId: 312,
  title: "Ergebnis",
  subtitle: "match result by strikr",
  date: "18.05.2026",
  goalsA: "6",
  goalsB: "4",
  teamAName: "",
  teamBName: "",
  winnerLabel: "Team A gewinnt",
  winnerPhotoUrl: "/dev/mock-winner-story.png",
  branding: {
    appName: "strikr",
    appTagline: "Training redefined",
    appLogoUrl: "/brand/strikr-mark.png",
    clubName: "SKV Rutesheim AH",
    clubCrestUrl: "/brand/strikr-mark.png",
  },
  clubName: "SKV Rutesheim AH",
  clubLogoUrl: "/brand/strikr-mark.png",
  strikrLogoUrl: "/brand/strikr-mark.png",
  clubPrimaryColor: "#2563eb",
  winnerWasShorthanded: true,
  upsetWin: true,
  dramaticFinish: true,
};

const COLORWAYS = [
  {
    id: "neon-blue",
    label: "Neon Blue",
    bg: "#2563eb",
    text: "#ffffff",
    accent: "#60a5fa",
    glow: "rgba(96,165,250,0.45)",
  },
  {
    id: "neon-pink",
    label: "Neon Pink",
    bg: "#ec4899",
    text: "#ffffff",
    accent: "#f9a8d4",
    glow: "rgba(236,72,153,0.55)",
  },
  {
    id: "neon-turquoise",
    label: "Neon Türkis",
    bg: "#06b6d4",
    text: "#042f2e",
    accent: "#67e8f9",
    glow: "rgba(103,232,249,0.55)",
  },
  {
    id: "menthol",
    label: "Menthol",
    bg: "#ccfbf1",
    text: "#115e59",
    accent: "#5eead4",
    glow: "rgba(94,234,212,0.45)",
  },
  {
    id: "electric-purple",
    label: "Electric Purple",
    bg: "#7c3aed",
    text: "#ffffff",
    accent: "#c4b5fd",
    glow: "rgba(196,181,253,0.52)",
  },
  {
    id: "ice-mint",
    label: "Ice Mint",
    bg: "#ecfeff",
    text: "#0f766e",
    accent: "#99f6e4",
    glow: "rgba(153,246,228,0.42)",
  },
  {
    id: "hot-coral",
    label: "Hot Coral",
    bg: "#fb7185",
    text: "#ffffff",
    accent: "#fecdd3",
    glow: "rgba(251,113,133,0.48)",
  },
  {
    id: "deep-teal",
    label: "Deep Teal",
    bg: "#0f766e",
    text: "#ffffff",
    accent: "#5eead4",
    glow: "rgba(94,234,212,0.46)",
  },
];

function VoteButton({
  active,
  label,
  variant,
  onClick,
}: {
  active: boolean;
  label: string;
  variant: "like" | "dislike";
  onClick: () => void;
}) {
  const activeClass =
    variant === "like"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : "border-rose-300 bg-rose-50 text-rose-700";

  const idleClass =
    variant === "like"
      ? "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/50"
      : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50/50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
        active ? activeClass : idleClass
      }`}
    >
      {label}
    </button>
  );
}

function SportsEditorialCard({
  scenario,
  palette,
}: {
  scenario: (typeof SCENARIOS)[number];
  palette: (typeof COLORWAYS)[number];
}) {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[360px] overflow-hidden rounded-[34px] border border-black/8 bg-[#f8f6f2] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div
          className="relative overflow-hidden rounded-[28px]"
          style={{
            background: palette.bg,
          }}
        >
          <div
            className="absolute left-[-80px] top-[-80px] h-[220px] w-[220px] rounded-full blur-3xl"
            style={{
              background: palette.glow,
            }}
          />

          <div className="relative z-10 flex items-start justify-between px-6 pt-6">
            <div>
              <div
                className="text-[11px] font-black uppercase tracking-[0.28em]"
                style={{
                  color: palette.text,
                  opacity: 0.65,
                }}
              >
                Sports Editorial
              </div>

              <div
                className="mt-3 text-[15px] font-black"
                style={{
                  color: palette.text,
                }}
              >
                {scenario.clubName}
              </div>
            </div>

            <div
              className="text-[18px] font-black tracking-[-0.04em]"
              style={{
                color: palette.text,
              }}
            >
              strikr
            </div>
          </div>

          <div
            className="relative z-10 mt-8 px-6 text-[78px] font-black uppercase leading-[0.82] tracking-[-0.12em]"
            style={{
              color: palette.text,
            }}
          >
            UNDER
            <br />
            DOG.
          </div>

          <div className="relative mt-0">
            <img
              src={scenario.image}
              alt="Winner"
              className="h-[420px] w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
              <div
                className="flex items-end font-black leading-none tracking-[-0.12em]"
                style={{
                  color: palette.accent,
                  textShadow: `0 0 18px ${palette.glow}`,
                }}
              >
                <span className="text-[72px]">6</span>
                <span className="mx-0.5 text-[62px] opacity-90">:</span>
                <span className="text-[72px]">4</span>
              </div>

              <div
                className="max-w-[130px] text-right text-[20px] font-black uppercase leading-[0.88] tracking-[-0.06em]"
                style={{
                  color: palette.accent,
                  textShadow: `0 0 18px ${palette.glow}`,
                }}
              >
                IN
                <br />
                UNTERZAHL
                <br />
                GEWONNEN.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-600">{palette.label}</div>

            <div
              className="h-3 w-3 rounded-full"
              style={{
                background: palette.accent,
              }}
            />
          </div>

          <button className="rounded-full bg-black px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DevResultSharePage() {
  const [votes, setVotes] = useState<Record<string, VoteState | undefined>>({});

  const liked = useMemo(
    () =>
      Object.entries(votes)
        .filter(([, value]) => value === "like")
        .map(([key]) => key),
    [votes]
  );

  const disliked = useMemo(
    () =>
      Object.entries(votes)
        .filter(([, value]) => value === "dislike")
        .map(([key]) => key),
    [votes]
  );

  function updateVote(key: string, next?: VoteState) {
    setVotes((prev) => ({
      ...prev,
      [key]: next,
    }));
  }

  return (
    <main className="min-h-screen bg-[#ece9e2] px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[28px] border border-black/5 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.28em] text-slate-500">
                Real Product Preview
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">
                Echte ResultShareCard
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Diese Vorschau nutzt dieselbe Komponente wie die API-Route:
                <span className="font-semibold text-slate-900"> ResultShareCard / SportsEditorialLayout</span>.
              </p>
            </div>

            <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
              1080 × 1350
            </div>
          </div>

          <div className="mt-6 flex justify-center overflow-auto rounded-[28px] bg-slate-950/95 p-4">
            <div
              style={{
                width: 1080,
                height: 1350,
                transform: "scale(0.34)",
                transformOrigin: "top center",
                marginBottom: -891,
              }}
            >
              <ResultShareCard data={REAL_RESULT_SHARE_PREVIEW_DATA} />
            </div>
          </div>
        </section>

        <div className="mb-8 rounded-[28px] border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur">
          <div className="text-[12px] font-black uppercase tracking-[0.28em] text-slate-500">
            Dev Exploration
          </div>

          <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">
            Sports Editorial Premium
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Tesla / Apple / Editorial / Nike Campaign / Premium Sports Poster
            Richtung. Fokus auf brutale Typografie, starke Farben, modernes
            Editorial Layout und emotionale Siegerfotos.
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <div className="rounded-full bg-emerald-100 px-4 py-2 font-semibold text-emerald-700">
              Gefällt mir: {liked.length}
            </div>

            <div className="rounded-full bg-rose-100 px-4 py-2 font-semibold text-rose-700">
              Gefällt mir nicht: {disliked.length}
            </div>
          </div>
        </div>

        {SCENARIOS.map((scenario) => (
          <section key={scenario.id}>
            <div className="mb-6 flex items-center gap-4">
              <div className="text-[12px] font-black uppercase tracking-[0.28em] text-slate-500">
                Szenario 1
              </div>

              <div className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                {scenario.clubName}
              </div>

              <div className="rounded-full border border-black/10 bg-white px-4 py-1 text-xl font-black text-blue-600 shadow-sm">
                {scenario.score}
              </div>
            </div>

            <div className="grid gap-8 xl:grid-cols-2 2xl:grid-cols-3">
              {COLORWAYS.map((palette) => {
                const key = `${scenario.id}-${palette.id}`;

                return (
                  <div key={palette.id} className="space-y-4">
                    <SportsEditorialCard
                      scenario={scenario}
                      palette={palette}
                    />

                    <div className="flex flex-wrap gap-2">
                      <VoteButton
                        active={votes[key] === "like"}
                        label="Gefällt mir"
                        variant="like"
                        onClick={() =>
                          updateVote(
                            key,
                            votes[key] === "like" ? undefined : "like"
                          )
                        }
                      />

                      <VoteButton
                        active={votes[key] === "dislike"}
                        label="Gefällt mir nicht"
                        variant="dislike"
                        onClick={() =>
                          updateVote(
                            key,
                            votes[key] === "dislike"
                              ? undefined
                              : "dislike"
                          )
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}