"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Sparkles, Zap } from "lucide-react";
import type { DemoPlayer } from "@/lib/demo/data";

type Props = {
  teamA: DemoPlayer[];
  teamB: DemoPlayer[];
  scoreA: number;
  scoreB: number;
  runId: number;
};

function positionLabel(position: DemoPlayer["position"]) {
  if (position === "goalkeeper") return "TW";
  if (position === "defense") return "DEF";
  return "ANG";
}

function PlayerRow({
  player,
  visible,
}: {
  player: DemoPlayer;
  visible: boolean;
}) {
  return (
    <div
      className={
        "flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 transition-all duration-500 ease-out " +
        (visible
          ? "translate-y-0 scale-100 opacity-100"
          : "translate-y-4 scale-[0.96] opacity-0")
      }
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-extrabold text-white">{player.name}</div>
        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
          {positionLabel(player.position)} · Stärke {player.strength}
        </div>
      </div>
      <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-black text-white/70">
        {player.category}
      </span>
    </div>
  );
}

function TeamColumn({
  label,
  team,
  side,
  revealCount,
}: {
  label: string;
  team: DemoPlayer[];
  side: "A" | "B";
  revealCount: number;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/30 p-3.5 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-black text-white">{label}</div>
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
          {team.length} Spieler
        </div>
      </div>
      <div className="space-y-2">
        {team.map((player, index) => {
          const slotIndex = index * 2 + (side === "B" ? 1 : 0);
          return (
            <PlayerRow
              key={player.id}
              player={player}
              visible={revealCount > slotIndex}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function TeamBalanceReveal({
  teamA,
  teamB,
  scoreA,
  scoreB,
  runId,
}: Props) {
  const totalPlayers = teamA.length + teamB.length;
  const [revealCount, setRevealCount] = useState(0);
  const [scoreReady, setScoreReady] = useState(false);

  useEffect(() => {
    setRevealCount(0);
    setScoreReady(false);

    let current = 0;
    let scoreTimer: number | undefined;
    const interval = window.setInterval(() => {
      current += 1;
      setRevealCount(current);

      if (current >= totalPlayers) {
        window.clearInterval(interval);
        scoreTimer = window.setTimeout(() => setScoreReady(true), 220);
      }
    }, 105);

    return () => {
      window.clearInterval(interval);
      if (scoreTimer) window.clearTimeout(scoreTimer);
    };
  }, [runId, totalPlayers]);

  const maxScore = Math.max(scoreA, scoreB, 1);
  const diff = Math.abs(scoreA - scoreB);
  const spread = useMemo(() => {
    const average = (scoreA + scoreB) / 2 || 1;
    return ((diff / average) * 100).toFixed(1);
  }, [diff, scoreA, scoreB]);

  const barA = Math.max(6, (scoreA / maxScore) * 100) + "%";
  const barB = Math.max(6, (scoreB / maxScore) * 100) + "%";

  return (
    <section className="overflow-hidden rounded-[28px] bg-zinc-950 p-4 text-white shadow-2xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">
            <Sparkles className="h-3 w-3" />
            strikr balance
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
            Teams werden verteilt.
          </h2>
          <p className="mt-1 text-xs leading-5 text-white/50 sm:text-sm">
            Echte Berechnung aus den ausgewählten Spielern – keine Demo-Fakewerte.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-right">
          <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
            Differenz
          </div>
          <div className="mt-0.5 text-xl font-black">{diff}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <TeamColumn label="Team A" team={teamA} side="A" revealCount={revealCount} />
        <TeamColumn label="Team B" team={teamB} side="B" revealCount={revealCount} />
      </div>

      <div
        className={
          "mt-4 rounded-[24px] border border-white/10 bg-white/[0.055] p-4 transition-all duration-500 " +
          (scoreReady
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0")
        }
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
              Teamstärke
            </div>
            <div className="mt-1 text-sm font-bold text-white/70">
              Berechnete Balance · Abweichung {spread}%
            </div>
          </div>
          <Zap className="h-5 w-5 text-emerald-300" />
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-black">
              <span>Team A</span>
              <span>{scoreA}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-700 ease-out"
                style={{ width: scoreReady ? barA : "0%" }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-black">
              <span>Team B</span>
              <span>{scoreB}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-300 transition-[width] duration-700 ease-out"
                style={{ width: scoreReady ? barB : "0%" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={
          "mt-4 flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-center transition-all duration-500 " +
          (scoreReady
            ? "scale-100 border-emerald-300/30 bg-emerald-300/10 opacity-100"
            : "scale-[0.98] border-white/5 bg-white/[0.03] opacity-0")
        }
      >
        <CheckCircle2 className="h-5 w-5 text-emerald-300" />
        <div className="text-base font-black tracking-tight sm:text-lg">
          FAIRE TEAMS. EIN KLICK.
        </div>
      </div>
    </section>
  );
}
