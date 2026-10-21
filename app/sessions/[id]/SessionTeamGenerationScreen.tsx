"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Sparkles, Zap } from "lucide-react";
import type { Player } from "./session-types";
import { playerGeneratorScore, sumTeamScore } from "./session-ui";
import type { BalanceCategory } from "./session-ui";
import { useI18n } from "@/components/i18n/I18nProvider";

export type TeamRevealPayload = {
  phase: "preparing" | "revealing";
  teamA: Player[];
  teamB: Player[];
};

type ScoreOptions = {
  useStrength: boolean;
  useCategories: boolean;
  balanceCategories: BalanceCategory[];
};

type Props = {
  payload: TeamRevealPayload;
  showStrengthNumbers: boolean;
  scoreOptions: ScoreOptions;
  onClose: () => void;
};

function nameOf(player: Player) {
  return player.name?.trim() ||
    [player.first_name, player.last_name].filter(Boolean).join(" ") ||
    "Spieler";
}

export default function SessionTeamGenerationScreen({
  payload, showStrengthNumbers, scoreOptions, onClose,
}: Props) {
  const { locale } = useI18n();
  const de = locale === "de";
  const total = payload.teamA.length + payload.teamB.length;
  const [revealed, setRevealed] = useState(0);
  const [complete, setComplete] = useState(false);
  const calculating = payload.phase === "preparing";
  const active = payload.phase === "revealing";

  // Never animate invented data: the final team map has already been calculated.
  useEffect(() => {
    if (!active || total < 2) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setRevealed(total);
      setComplete(true);
      return;
    }

    let current = 0;
    const pace = Math.max(115, Math.min(215, Math.floor(2700 / total)));
    const timer = window.setInterval(() => {
      current += 1;
      setRevealed(Math.min(current, total));
      if (current >= total) {
        window.clearInterval(timer);
        window.setTimeout(() => setComplete(true), 450);
      }
    }, pace);
    return () => window.clearInterval(timer);
  }, [active, total]);

  const strengthEnabled = scoreOptions.useStrength || scoreOptions.useCategories;
  const maximum = useMemo(() => {
    if (!strengthEnabled) return Math.max(1, payload.teamA.length, payload.teamB.length);
    return Math.max(1, sumTeamScore(payload.teamA, scoreOptions), sumTeamScore(payload.teamB, scoreOptions));
  }, [payload.teamA, payload.teamB, scoreOptions, strengthEnabled]);

  // Alternate reveals. Odd team sizes never display a player from the other side.
  const shownA = Math.min(payload.teamA.length, Math.ceil(revealed / 2));
  const shownB = Math.min(payload.teamB.length, Math.floor(revealed / 2));

  const teams = [
    { label: "Team A", players: payload.teamA, shown: shownA, color: "bg-white" },
    { label: "Team B", players: payload.teamB, shown: shownB, color: "bg-teal-300" },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label={de ? "strikr Teamverteilung" : "strikr team assignment"}
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute -top-32 right-[-100px] h-80 w-80 rounded-full bg-teal-500/15 blur-[90px]" />
      <div className="pointer-events-none absolute bottom-16 left-[-140px] h-80 w-80 rounded-full bg-sky-500/10 blur-[90px]" />
      <div className="relative mx-auto flex h-full w-full max-w-xl flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(22px,env(safe-area-inset-top))] sm:px-6">
        <div className="shrink-0">
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-teal-300">
            <Zap className="h-4 w-4" /> strikr balance
          </div>
          <h1 className="mt-3 text-[clamp(24px,7vw,35px)] font-black leading-tight tracking-tight">
            {calculating
              ? de ? "Teams werden berechnet ..." : "Calculating fair teams ..."
              : complete
                ? de ? "Das sind eure Teams!" : "Here are your teams!"
                : de ? "Wer spielt mit wem?" : "Who plays with whom?"}
          </h1>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm text-white/55">
            <span>{calculating
              ? de ? "Wir suchen die fairste Verteilung" : "Finding the fairest split"
              : complete
                ? de ? "Aufteilung abgeschlossen" : "Assignment complete"
                : de ? "Spieler für Spieler ..." : "One player at a time ..."}</span>
            <span className="font-bold tabular-nums">{calculating ? "···" : `${revealed} / ${total}`}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-teal-300 transition-[width] duration-300"
              style={{ width: calculating ? "8%" : `${(revealed / Math.max(total, 1)) * 100}%` }} />
          </div>
        </div>

        {calculating ? (
          <div className="relative flex flex-1 flex-col items-center justify-center gap-5" aria-live="polite">
            <div className="relative grid h-24 w-24 place-items-center rounded-full border border-teal-300/40 bg-teal-300/10">
              <div className="absolute inset-[-10px] animate-spin rounded-full border-2 border-transparent border-t-teal-300" />
              <Sparkles className="h-11 w-11 animate-pulse text-teal-300" />
            </div>
            <p className="max-w-xs text-center text-sm text-white/60">
              {de ? "Stärken, Positionen und Kategorien werden berücksichtigt." : "Balancing strengths, positions and categories."}
            </p>
          </div>
        ) : (
          <div className="relative mt-5 flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5">
              {teams.map(team => {
                const visible = team.players.slice(0, team.shown);
                const currentScore = strengthEnabled
                  ? sumTeamScore(visible, scoreOptions)
                  : visible.length;
                const percentage = 100 * currentScore / maximum;
                return (
                  <div key={team.label} className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-2.5 sm:p-3">
                    <div className="flex shrink-0 items-center justify-between gap-1">
                      <span className="text-sm font-extrabold">{team.label}</span>
                      {showStrengthNumbers ? (
                        <span className="text-xs font-black tabular-nums text-teal-200">{currentScore}</span>
                      ) : (
                        <span className="text-[10px] font-semibold tabular-nums text-white/50">{team.shown}/{team.players.length}</span>
                      )}
                    </div>
                    <div className="mt-2 h-3.5 shrink-0 overflow-hidden rounded-full bg-white/10"
                      role={showStrengthNumbers ? "progressbar" : "img"}
                      aria-label={`${team.label} ${de ? "Balance-Balken" : "balance bar"}`}
                      aria-valuemin={showStrengthNumbers ? 0 : undefined}
                      aria-valuemax={showStrengthNumbers ? maximum : undefined}
                      aria-valuenow={showStrengthNumbers ? currentScore : undefined}>
                      <div className={`h-full rounded-full transition-[width] duration-300 ease-out ${team.color}`}
                        style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pb-2">
                      {visible.map((player, index) => (
                        <div key={player.id} className="rounded-xl border border-white/10 bg-white/[0.07] px-2.5 py-2 animate-[rise-in_250ms_ease-out]" style={{ animationDelay: "0ms" }}>
                          <div className="flex items-start gap-1.5">
                            <span className="mt-0.5 text-[10px] font-extrabold tabular-nums text-teal-300">{index + 1}.</span>
                            <div className="min-w-0 flex-1">
                              <div className="break-words text-[11px] font-bold leading-4 sm:text-xs">{nameOf(player)}</div>
                              {showStrengthNumbers ? (
                                <div className="mt-0.5 text-[10px] text-white/50">
                                  {de ? "Stärke" : "Strength"} {player.strength ?? "–"}
                                  <span className="ml-1">· {de ? "Wertung" : "Score"} {playerGeneratorScore(player, scoreOptions)}</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="shrink-0 py-4 text-center">
              {complete ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-teal-300/30 bg-teal-300/10 px-4 py-2 text-sm font-black text-teal-200">
                  <CheckCircle2 className="h-5 w-5" /> {de ? "FAIRE TEAMS. EIN KLICK." : "FAIR TEAMS. ONE CLICK."}
                </div>
              ) : (
                <span className="text-xs font-semibold text-teal-200/70">
                  <Sparkles className="mr-1 inline h-3 w-3 animate-pulse" />
                  {de ? "strikr verteilt ..." : "strikr is assigning ..."}
                </span>
              )}
            </div>
          </div>
        )}

        {complete ? (
          <button type="button" onClick={onClose}
            className="relative flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 py-3.5 text-sm font-black text-slate-950 shadow-[0_5px_35px_rgba(94,234,212,0.18)]">
            {de ? "Teams prüfen & bestätigen" : "Review and confirm teams"}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : active ? (
          <button type="button" onClick={() => { setRevealed(total); setComplete(true); }}
            className="relative min-h-11 shrink-0 self-center rounded-xl px-6 text-xs font-semibold text-white/50 underline-offset-4 hover:underline">
            {de ? "Animation überspringen" : "Skip animation"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
