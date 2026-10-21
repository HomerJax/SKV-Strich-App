"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import type { Player } from "./session-types";
import { playerGeneratorScore, sumTeamScore } from "./session-ui";
import type { BalanceCategory } from "./session-ui";
import { useI18n } from "@/components/i18n/I18nProvider";

type ScoreOptions = {
  useStrength: boolean;
  useCategories: boolean;
  balanceCategories: BalanceCategory[];
};

type Props = {
  teamA: Player[];
  teamB: Player[];
  generationRunId: number;
  showStrengthNumbers: boolean;
  scoreOptions: ScoreOptions;
  onRevealingChange?: (revealing: boolean) => void;
};

function playerName(player: Player) {
  return player.name?.trim() ||
    [player.first_name?.trim(), player.last_name?.trim()].filter(Boolean).join(" ") ||
    "Spieler";
}

export default function SessionTeamGenerationReveal({
  teamA,
  teamB,
  generationRunId,
  showStrengthNumbers,
  scoreOptions,
  onRevealingChange,
}: Props) {
  const { locale } = useI18n();
  const de = locale === "de";
  const [revealed, setRevealed] = useState({ runId: 0, count: 0 });
  const total = teamA.length + teamB.length;
  const currentRun = generationRunId > 0 && revealed.runId === generationRunId;
  const revealing = generationRunId > 0 &&
    (!currentRun || revealed.count < total);
  const shown = !revealing ? total : currentRun ? revealed.count : 0;

  useEffect(() => {
    if (generationRunId === 0) return;
    const count = teamA.length + teamB.length;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setRevealed({ runId: generationRunId, count: reduceMotion ? count : 0 });
    if (reduceMotion || count === 0) return;

    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setRevealed({ runId: generationRunId, count: Math.min(index, count) });
      if (index >= count) window.clearInterval(interval);
    }, Math.max(120, Math.min(240, Math.round(2700 / count))));

    return () => window.clearInterval(interval);
  }, [generationRunId]); // Deliberately keyed to new generations, not routine server refreshes.

  useEffect(() => {
    onRevealingChange?.(revealing);
  }, [onRevealingChange, revealing]);

  if (total === 0) return null;

  // Players are disclosed alternately, but their membership and score are already final.
  const shownA = revealing ? Math.min(teamA.length, Math.ceil(shown / 2)) : teamA.length;
  const shownB = revealing ? Math.min(teamB.length, Math.floor(shown / 2)) : teamB.length;
  const scoringActive = scoreOptions.useStrength || scoreOptions.useCategories;
  const max = scoringActive
    ? Math.max(1, sumTeamScore(teamA, scoreOptions), sumTeamScore(teamB, scoreOptions))
    : Math.max(1, teamA.length, teamB.length);

  const teams = [
    { label: "Team A", players: teamA, count: shownA, color: "bg-white" },
    { label: "Team B", players: teamB, count: shownB, color: "bg-teal-300" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-950 p-3.5 text-white shadow-xl sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-teal-300">
            <Sparkles aria-hidden="true" className={`h-4 w-4 ${revealing ? "animate-pulse" : ""}`} />
            strikr balance
          </div>
          <div className="mt-1 text-sm font-extrabold sm:text-base">
            {revealing
              ? de ? "Teams werden verteilt ..." : "Distributing teams ..."
              : de ? "Teams sind verteilt!" : "Teams assigned!"}
          </div>
        </div>
        <div aria-live="polite" className="shrink-0 text-xs font-semibold text-white/60">
          {revealing ? `${shown} / ${total}` : <Check aria-label={de ? "Fertig" : "Done"} className="h-5 w-5 text-teal-300" />}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {teams.map((team) => {
          const partialScore = scoringActive ? sumTeamScore(team.players.slice(0, team.count), scoreOptions) : team.count;
          const fullScore = scoringActive ? sumTeamScore(team.players, scoreOptions) : team.players.length;
          return (
            <div key={team.label} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.055] p-2.5 sm:p-3">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-extrabold">{team.label}</span>
                {showStrengthNumbers ? (
                  <span className="text-xs font-black tabular-nums text-teal-200">
                    {partialScore}{!revealing ? ` / ${fullScore}` : ""}
                  </span>
                ) : (
                  <span className="text-[10px] text-white/50">{team.count}/{team.players.length}</span>
                )}
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/15"
                role={showStrengthNumbers ? "progressbar" : "img"}
                aria-label={`${team.label} ${scoringActive ? (de ? "Teamstärke" : "team strength") : (de ? "Verteilungsfortschritt" : "assignment progress")}`}
                aria-valuemin={showStrengthNumbers ? 0 : undefined}
                aria-valuemax={showStrengthNumbers ? max : undefined}
                aria-valuenow={showStrengthNumbers ? partialScore : undefined}>
                <div className={`h-full rounded-full transition-[width] duration-300 ease-out ${team.color}`}
                  style={{ width: `${(partialScore / max) * 100}%` }} />
              </div>
              {revealing ? (
                <div className="mt-2.5 space-y-1.5">
                  {team.players.slice(0, team.count).map((player) => (
                    <div key={player.id} className="min-w-0 animate-[fade-in_300ms_ease-out] rounded-lg border border-white/10 bg-white/10 px-2 py-1.5">
                      <div className="truncate text-[11px] font-semibold">{playerName(player)}</div>
                      {showStrengthNumbers ? (
                        <div className="text-[10px] text-white/55">
                          {de ? "Stärke" : "Strength"} {player.strength ?? "–"}
                          {" · "}{de ? "Wertung" : "Score"} {playerGeneratorScore(player, scoreOptions)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {revealing ? (
        <p className="mt-3 text-center text-[10px] font-medium text-white/50">
          {de ? "Spieler werden den berechneten Teams zugeordnet" : "Assigning players to calculated teams"}
        </p>
      ) : (
        <div className="mt-3 rounded-xl border border-teal-300/20 bg-teal-300/10 px-3 py-2 text-center text-xs font-extrabold text-teal-200">
          {de ? "FAIRE TEAMS. EIN KLICK." : "FAIR TEAMS. ONE CLICK."}
        </div>
      )}
    </div>
  );
}
