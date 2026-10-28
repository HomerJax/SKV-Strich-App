"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle, RotateCcw, Sparkles, X } from "lucide-react";
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
  teamBalancePercent?: { a: number; b: number } | null;
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
  teamA, teamB, generationRunId, scoreOptions, showStrengthNumbers, teamBalancePercent,
  generating, saving, error, onAccept, onRegenerate, onManual, onClose,
}: Props) {
  const sequence: { side: "A" | "B"; player: Player }[] = [];
  for (let index = 0; index < Math.max(teamA.length, teamB.length); index += 1) {
    if (teamA[index]) sequence.push({ side: "A", player: teamA[index] });
    if (teamB[index]) sequence.push({ side: "B", player: teamB[index] });
  }
  const [revealed, setRevealed] = useState(0);
  const playerRevealMs = 470;
  const introMs = 650;
  const revealDuration = sequence.length * playerRevealMs;
  const complete = !error && !generating && generationRunId > 0 && revealed >= sequence.length && sequence.length >= 2;
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

    // Brief visible intro, then deliberate player-by-player reveal.
    // About twice as much time per player as the original animation.
    setRevealed(0);
    let current = 0;
    let interval: number | undefined;
    const intro = window.setTimeout(() => {
      interval = window.setInterval(() => {
        current += 1;
        setRevealed(Math.min(current, count));
        if (current >= count && interval !== undefined) window.clearInterval(interval);
      }, 470);
    }, 650);
    return () => {
      window.clearTimeout(intro);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [generationRunId, generating, teamA.length, teamB.length]);

  const shownA = sequence.slice(0, revealed).filter(item => item.side === "A").map(item => item.player);
  const shownB = sequence.slice(0, revealed).filter(item => item.side === "B").map(item => item.player);
  const scoring = scoreOptions.useStrength || scoreOptions.useCategories;
  const maximum = teamBalancePercent ? 100 : scoring
    ? Math.max(1, sumTeamScore(teamA, scoreOptions), sumTeamScore(teamB, scoreOptions))
    : Math.max(1, teamA.length, teamB.length);

  const columns = [
    { side: "A", title: "TEAM A", players: teamA, visible: shownA, tone: "bg-white", ring: "border-white/20" },
    { side: "B", title: "TEAM B", players: teamB, visible: shownB, tone: "bg-[#6ce1e6]", ring: "border-teal-300/30" },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="strikr Teamverteilung" className="fixed inset-0 z-[10080] flex items-center justify-center bg-[#020913]/95 backdrop-blur-xl sm:p-3">
      <style>{"@keyframes strikrBalancePop {from{opacity:0;transform:translateY(12px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}} @keyframes strikrBarFill {from{transform:scaleX(0)}to{transform:scaleX(1)}} @keyframes strikrScanning {0%{transform:translateX(-100%)}100%{transform:translateX(250%)}} @media (prefers-reduced-motion:reduce){.strikr-balance-bar{animation:none!important;transform:scaleX(1)!important}}"}</style>
      <div className="relative flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-gradient-to-b from-[#0b2631] via-[#081522] to-[#050d19] text-white shadow-[0_35px_110px_rgba(0,0,0,.8)] sm:h-[min(940px,96dvh)] sm:rounded-[32px] sm:border sm:border-teal-300/25">
        <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-24 h-64 w-64 rounded-full bg-teal-400/15 blur-[80px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-28 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />
        <header className="relative flex shrink-0 items-start justify-between gap-3 border-b border-teal-300/10 px-5 pb-5 pt-[calc(22px+env(safe-area-inset-top))] sm:px-9 sm:pb-6 sm:pt-7">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.22em] text-teal-300">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> strikr balance
            </div>
            <h2 className="mt-3 text-[27px] font-black leading-tight tracking-tight sm:text-4xl">
              {generating ? "Teams werden erstellt …" : complete ? "Das sind eure Teams!" : "Faire Teams entstehen."}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              {generating ? "strikr berechnet jetzt die beste Verteilung für euch." : complete ? "Bereit für euren Trainingsabend." : "Spieler für Spieler. Fair verteilt."}
            </p>
          </div>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Team-Popup schließen"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-9 sm:py-7">
          {generating && (
            <div role="status" aria-live="polite" className="relative mb-5 flex items-center gap-3 overflow-hidden rounded-2xl border border-teal-300/35 bg-teal-300/10 px-4 py-5 sm:px-5">
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-teal-300/10">
                <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-teal-300 to-transparent" style={{animation:"strikrScanning 1.5s linear infinite"}} />
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-300/15 text-teal-200">
                <Sparkles className="h-6 w-6 animate-pulse" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-white sm:text-lg">Teams werden erstellt …</h3>
                <p className="mt-1 text-xs leading-5 text-teal-100/70">Stärke, Positionen und Balance werden berücksichtigt.</p>
              </div>
              <LoaderCircle className="h-6 w-6 shrink-0 animate-spin text-teal-300" aria-hidden="true" />
            </div>
          )}
          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.065] px-4 py-3">
            <span className="text-xs font-bold text-slate-200">
              {generating ? "Optimale Einteilung wird berechnet" : complete ? "Verteilung abgeschlossen" : revealed === 0 ? "Gleich geht es los …" : "Spieler werden verteilt …"}
            </span>
            <span className="text-xs font-black tabular-nums text-teal-300">
              {generating ? "•••" : revealed + " / " + sequence.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {columns.map(team => {
              // Real leaders receive only server-aggregated bar percentages.
              // Never infer or animate per-player ratings from partial rosters.
              const fullScore = teamBalancePercent
                ? team.side === "A" ? teamBalancePercent.a : teamBalancePercent.b
                : scoring ? sumTeamScore(team.players, scoreOptions) : team.players.length;
              const currentScore = teamBalancePercent
                ? (complete ? fullScore : 0)
                : scoring ? sumTeamScore(team.visible, scoreOptions) : team.visible.length;
              const finalWidth = Math.min(100, fullScore / maximum * 100);
              return (
                <div key={team.side} className={"min-w-0 rounded-[24px] border bg-gradient-to-b from-white/[.09] to-white/[.035] p-3 shadow-[0_12px_35px_rgba(0,0,0,.14)] sm:p-6 " + team.ring}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-black tracking-[.14em] sm:text-lg">{team.title}</span>
                    <span className="text-[11px] font-bold tabular-nums text-white/65">{team.visible.length}/{team.players.length}</span>
                  </div>
                  <div className="mt-6 flex items-end justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-[.12em] text-teal-100/55">Teamstärke</span>
                    <span className="text-xl font-black tabular-nums text-white sm:text-2xl">
                      {showStrengthNumbers ? (complete ? fullScore : "···") : (complete ? Math.round(finalWidth) + "%" : "···")}
                    </span>
                  </div>
                  <div className="relative mt-3 h-5 overflow-hidden rounded-full border border-white/10 bg-[#020b16] shadow-inner sm:h-6" role="progressbar"
                    aria-label={team.title + " Teamstärke"} aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={currentScore}>
                    <div key={team.side + "-" + generationRunId}
                      className={"strikr-balance-bar h-full origin-left rounded-full shadow-[0_0_22px_rgba(94,234,212,.35)] " + team.tone}
                      style={{
                        width: finalWidth + "%",
                        transform: generating ? "scaleX(0)" : undefined,
                        animation: generating ? "none" : "strikrBarFill " + revealDuration + "ms cubic-bezier(.38,0,.58,1) " + introMs + "ms both"
                      }} />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent" />
                  </div>
                  <p className="mt-1 text-right text-[10px] text-white/45">
                    {complete && showStrengthNumbers ? "Gesamt " + fullScore : "\u00a0"}
                  </p>
                  <div className="mt-4 space-y-2">
                    {team.visible.map(player => (
                      <div key={player.id} className="min-w-0 rounded-xl border border-white/10 bg-white/[.085] px-3 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,.08)] sm:px-4 sm:py-3"
                        style={{ animation: "strikrBalancePop 450ms cubic-bezier(.2,.8,.2,1) both" }}>
                        <div className="truncate text-[13px] font-bold text-white sm:text-[15px]">{label(player)}</div>
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
            <p role="status" className="mt-6 rounded-2xl border border-teal-300/20 bg-teal-300/10 px-4 py-4 text-center text-lg font-black tracking-tight text-teal-200 sm:text-xl">
              <Check className="mr-1 inline h-5 w-5" aria-hidden="true" /> Faire Teams. Ein Klick.
            </p>
          )}
          {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/15 p-3 text-sm font-semibold text-rose-100">{error}</p>}
        </div>

        <footer className="relative shrink-0 space-y-3 border-t border-teal-300/15 bg-[#081522]/95 px-4 pb-[calc(14px+env(safe-area-inset-bottom))] pt-4 sm:px-9">
          <button type="button" disabled={!complete || busy} onClick={onAccept}
            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-teal-300 to-cyan-300 px-4 text-base font-black text-slate-950 shadow-[0_8px_25px_rgba(94,234,212,.2)] transition hover:from-teal-200 hover:to-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">
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
