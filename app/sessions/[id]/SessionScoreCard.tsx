"use client";

import { useEffect, useMemo, useState } from "react";
import type { SessionGameResult } from "./session-types";

type Props = {
  results: SessionGameResult[];
  saving: boolean;
  collapsed: boolean;
  goalsA: string;
  goalsB: string;
  onGoalsAChange: (value: string) => void;
  onGoalsBChange: (value: string) => void;
  onSaveResult: () => void;
  onUpdateResult: (gameNo: number, goalsA: string, goalsB: string) => void;
  onDeleteResult: (gameNo: number) => void;
  onToggleCollapsed: () => void;
  title?: string;
};

function cleanGoal(value: string) {
  return value.replace(/\D/g, "").slice(0, 3);
}

function winnerText(a: number | null, b: number | null) {
  if (a == null || b == null) return "Offen";
  if (a === b) return "Remis";
  return a > b ? "Team 1" : "Team 2";
}

function GameRow({
  result,
  saving,
  onUpdate,
  onDelete,
}: {
  result: SessionGameResult;
  saving: boolean;
  onUpdate: (gameNo: number, goalsA: string, goalsB: string) => void;
  onDelete: (gameNo: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [a, setA] = useState(String(result.goals_team_a ?? ""));
  const [b, setB] = useState(String(result.goals_team_b ?? ""));

  useEffect(() => {
    setA(String(result.goals_team_a ?? ""));
    setB(String(result.goals_team_b ?? ""));
  }, [result.goals_team_a, result.goals_team_b]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            Spiel {result.game_no}
          </div>
          {!editing ? (
            <div className="mt-1 text-xl font-black text-slate-950">
              {result.goals_team_a ?? "–"} : {result.goals_team_b ?? "–"}
              <span className="ml-2 text-xs font-bold text-slate-500">
                · {winnerText(result.goals_team_a, result.goals_team_b)}
              </span>
            </div>
          ) : null}
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={saving}
            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          >
            Bearbeiten
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input
              inputMode="numeric"
              value={a}
              onChange={(event) => setA(cleanGoal(event.target.value))}
              disabled={saving}
              className="h-12 rounded-xl border bg-white text-center text-xl font-black"
              aria-label={`Tore Team 1 Spiel ${result.game_no}`}
            />
            <span className="font-black text-slate-400">:</span>
            <input
              inputMode="numeric"
              value={b}
              onChange={(event) => setB(cleanGoal(event.target.value))}
              disabled={saving}
              className="h-12 rounded-xl border bg-white text-center text-xl font-black"
              aria-label={`Tore Team 2 Spiel ${result.game_no}`}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || a === "" || b === ""}
              onClick={() => {
                onUpdate(result.game_no, a, b);
                setEditing(false);
              }}
              className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
            >
              Speichern
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className="rounded-full border px-3 py-2 text-xs font-bold"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onDelete(result.game_no)}
              className="ml-auto rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
            >
              Löschen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function SessionScoreCard({
  results,
  saving,
  collapsed,
  goalsA,
  goalsB,
  onGoalsAChange,
  onGoalsBChange,
  onSaveResult,
  onUpdateResult,
  onDeleteResult,
  onToggleCollapsed,
  title = "Ergebnisse",
}: Props) {
  const summary = useMemo(() => {
    let winsA = 0;
    let winsB = 0;
    for (const result of results) {
      if (result.goals_team_a == null || result.goals_team_b == null) continue;
      if (result.goals_team_a > result.goals_team_b) winsA += 1;
      if (result.goals_team_b > result.goals_team_a) winsB += 1;
    }
    return { winsA, winsB };
  }, [results]);

  const nextGameNo =
    results.reduce((max, result) => Math.max(max, result.game_no), 0) + 1;
  const hasDraft = goalsA.trim() !== "" && goalsB.trim() !== "";

  if (collapsed) {
    const single = results.length === 1 ? results[0] : null;
    return (
      <section className="rounded-[20px] border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex w-full items-center justify-between gap-4 rounded-[20px] bg-emerald-50 px-4 py-3.5 text-left"
        >
          <div className="min-w-0">
            <div className="text-sm font-black text-emerald-950">
              {results.length === 1 ? "Ergebnis gespeichert" : `${results.length} Spiele gespeichert`}
            </div>
            <div className="mt-1 text-xs font-bold text-emerald-800">
              {single
                ? `${single.goals_team_a ?? "–"}:${single.goals_team_b ?? "–"}`
                : `Tagessiege ${summary.winsA}:${summary.winsB}`}
            </div>
          </div>
          <span className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
            Spiele öffnen
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-950">{title}</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Ein Training, feste Teams, beliebig viele Spiele. Jeder Spielsieg zählt als eigener Strich.
            </p>
          </div>
          {results.length > 0 ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="shrink-0 rounded-full border px-3 py-2 text-xs font-bold"
            >
              Kompakt
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 p-4">
        {results.length > 1 ? (
          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
              Sieger des Trainingsabends
            </div>
            <div className="mt-1 text-2xl font-black">
              {summary.winsA}:{summary.winsB} Tagessiege
            </div>
            <div className="mt-1 text-xs font-semibold text-white/65">
              {summary.winsA === summary.winsB
                ? "Aktuell unentschieden – kein eindeutiges Siegerteam."
                : summary.winsA > summary.winsB
                  ? "Team 1 liegt vorne."
                  : "Team 2 liegt vorne."}
            </div>
          </div>
        ) : null}

        {results.map((result) => (
          <GameRow
            key={result.game_no}
            result={result}
            saving={saving}
            onUpdate={onUpdateResult}
            onDelete={onDeleteResult}
          />
        ))}

        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3">
          <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            {results.length === 0 ? "Spiel 1" : `Weiteres Spiel · Spiel ${nextGameNo}`}
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={goalsA}
              onChange={(event) => onGoalsAChange(cleanGoal(event.target.value))}
              disabled={saving}
              placeholder="0"
              className="h-14 rounded-2xl border text-center text-2xl font-black"
              aria-label="Tore Team 1"
            />
            <span className="text-xl font-black text-slate-400">:</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={goalsB}
              onChange={(event) => onGoalsBChange(cleanGoal(event.target.value))}
              disabled={saving}
              placeholder="0"
              className="h-14 rounded-2xl border text-center text-2xl font-black"
              aria-label="Tore Team 2"
            />
          </div>
          <button
            type="button"
            onClick={onSaveResult}
            disabled={saving || !hasDraft}
            className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {saving
              ? "Speichert..."
              : results.length === 0
                ? "Ergebnis speichern"
                : `Spiel ${nextGameNo} speichern`}
          </button>
        </div>

        {results.length > 0 ? (
          <p className="text-[11px] leading-5 text-slate-500">
            Anwesenheit zählt für den Trainingsabend nur einmal. Die Teams bleiben für alle Spiele dieser Session gleich.
          </p>
        ) : null}
      </div>
    </section>
  );
}
