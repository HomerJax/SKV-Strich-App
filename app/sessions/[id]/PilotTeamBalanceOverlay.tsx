"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw, Sparkles, X } from "lucide-react";
import { playerGeneratorScore, sumTeamScore, type BalanceCategory } from "./session-ui";
import type { Player } from "./session-types";

type ScoreOptions = {
  useStrength: boolean;
  useCategories: boolean;
  balanceCategories: BalanceCategory[];
};

type Props = {
  teamA: Player[];
  teamB: Player[];
  generationRunId: number;
  scoreOptions: ScoreOptions;
  showStrengthNumbers: boolean;
  generating: boolean;
  saving: boolean;
  error: string;
  onAccept: () => void;
  onRegenerate: () => void;
  onManual: () => void;
  onClose: () => void;
};

function label(player: Player) {
  return player.name?.trim() || [player.first_name, player.last_name].filter(Boolean).join(" ") || "Spieler";
}

/** Visualizes the already calculated teams; the animation never changes the actual lineup. */
export default function PilotTeamBalanceOverlay({
  teamA, teamB, generationRunId, scoreOptions, showStrengthNumbers,
  generating, saving, error, onAccept, onRegenerate, onManual, onClose,
}: Props) {
  const sequence: { side: "A" | "B"; player: Player }[] = [];
  for (let index = 0; index < Math.max(teamA.length, teamB.length); index += 1) {
    if (teamA[index]) sequence.push({ side: "A", player: teamA[index] });
    if (teamB[index]) sequence.push({ side: "B", player: teamB[index] });
  }
  const [revealed, setRevealed] = useState(0);
  const complete = !generating && generationRunId > 0 && revealed >= sequence.length && sequence.length >= 2;
  const busy = generating || saving;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", keydown);
    };
  }, [busy, onClose]);

  useEffect(() => {
    if (generating || generationRunId === 0) {
      setRevealed(0);
      return;
    }
    const count = teamA.length + teamB.length;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(count);
      return;
    }
    setRevealed(0);
    let current = 0;
    const id = window.setInterval(() => {
      current += 1;
      setRevealed(Math.min(current, count));
      if (current >= count) window.clearInterval(id);
    }, Math.max(115, Math.min(230, Math.round(3200 / Math.max(1, count)))));
    return () => window.clearInterval(id);
  }, [generationRunId, generating, teamA.length, teamB.length]);

  const shownA = sequence.slice(0, revealed).filter(item => item.side === "A").map(item => item.player);
  const shownB = sequence.slice(0, revealed).filter(item => item.side === "B").map(item => item.player);
  const scoring = scoreOptions.useStrength || scoreOptions.useCategories;
  const maximum = scoring
    ? Math.max(1, sumTeamScore(teamA, scoreOptions), sumTeamScore(teamB, scoreOptions))
    : Math.max(1, teamA.length, teamB.length);

  const columns = [
    { side: "A", title: "TEAM A", players: teamA, visible: shownA, tone: "bg-white", ring: "border-white/20" },
    { side: "B", title: "TEAM B", players: teamB, visible: shownB, tone: "bg-[#6ce1e6]", ring: "border-teal-300/30" },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="strikr Teamverteilung" className="fixed inset-0 z-[10080] flex items-center justify-center bg-[#020913]/90 backdrop-blur-lg sm:p-4">
      <style>{ "@keyframes strikrBalancePop {from{opacity:0;transform:translateY(9px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}" }</style>
      <div className="relative flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-[#081522] text-white shadow-[0_30px_100px_rgba(0,0,0,.65)] sm:h-[min(850px,94dvh)] sm:rounded-[30px] sm:border sm:border-teal-300/20">
        <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-24 h-64 w-64 rounded-full bg-teal-400/15 blur-[80px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-28 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />
        <header className="relative flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 pb-4 pt-[calc(19px+env(safe-area-inset-top))] sm:px-7 sm:pt-6">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.22em] text-teal-300">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> strikr balance
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              {complete ? "Das sind eure Teams!" : "Faire Teams entstehen."}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              {complete ? "Bereit für euren Trainingsabend." : "Spieler für Spieler. Fair verteilt."}
            </p>
          </div>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Team-Popup schließen"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-7">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <span className="text-xs font-bold text-slate-200">
              {generating ? "Teams werden berechnet …" : complete ? "Verteilung abgeschlossen" : "Spieler werden verteilt …"}
            </span>
            <span className="text-xs font-black tabular-nums text-teal-300">
              {generating ? "•••" : revealed + " / " + sequence.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {columns.map(team => {
              const currentScore = scoring ? sumTeamScore(team.visible, scoreOptions) : team.visible.length;
              const fullScore = scoring ? sumTeamScore(team.players, scoreOptions) : team.players.length;
              const width = Math.min(100, currentScore / maximum * 100);
              return (
                <div key={team.side} className={"min-w-0 rounded-[20px] border bg-white/[.055] p-2.5 sm:p-4 " + team.ring}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-black tracking-[.12em] sm:text-sm">{team.title}</span>
                    <span className="text-[11px] font-bold tabular-nums text-white/65">{team.visible.length}/{team.players.length}</span>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">Teamstärke</span>
                    <span className="text-base font-black tabular-nums text-white sm:text-lg">
                      {showStrengthNumbers ? currentScore : Math.round(width) + "%"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-white/10" role="progressbar"
                    aria-label={team.title + " Teamstärke"} aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={currentScore}>
                    <div className={"h-full rounded-full transition-[width] duration-300 ease-out " + team.tone}
                      style={{ width: width + "%" }} />
                  </div>
                  <p className="mt-1 text-right text-[10px] text-white/45">
                    {complete && showStrengthNumbers ? "Gesamt " + fullScore : "\u00a0"}
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {team.visible.map(player => (
                      <div key={player.id} className="min-w-0 rounded-xl border border-white/10 bg-white/10 px-2.5 py-2"
                        style={{ animation: "strikrBalancePop 290ms ease-out both" }}>
                        <div className="truncate text-[11px] font-bold text-white sm:text-sm">{label(player)}</div>
                        {showStrengthNumbers && <p className="mt-0.5 text-[10px] font-semibold text-teal-200/75">
                          +{playerGeneratorScore(player, scoreOptions)} Wertung
                        </p>}
                      </div>
                    ))}
                    {!team.visible.length && <div className="py-5 text-center text-xs text-white/35">
                      {generating ? "Berechne …" : "Spieler kommen gleich …"}
                    </div>}
                  </div>
                </div>
              );
            })}
          </div>
          {complete && (
            <p role="status" className="mt-5 text-center text-lg font-black tracking-tight text-teal-200">
              <Check className="mr-1 inline h-5 w-5" aria-hidden="true" /> Faire Teams. Ein Klick.
            </p>
          )}
          {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/15 p-3 text-sm font-semibold text-rose-100">{error}</p>}
        </div>

        <footer className="relative shrink-0 space-y-2 border-t border-white/10 bg-[#081522]/95 px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3 sm:px-7">
          <button type="button" disabled={!complete || busy} onClick={onAccept}
            className="flex min-h-14 w-full items-center justify-center rounded-xl bg-teal-300 px-4 text-base font-black text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? "Teams werden gespeichert …" : "Teams übernehmen →"}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={onRegenerate}
              className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 text-xs font-bold text-white disabled:opacity-40">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Neu generieren
            </button>
            <button type="button" disabled={busy || !complete} onClick={onManual}
              className="min-h-12 rounded-xl border border-white/20 bg-white/5 px-3 text-xs font-bold text-white disabled:opacity-40">
              Manuell anpassen
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
