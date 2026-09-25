"use client";

import { useEffect, useMemo, useState } from "react";
import type { SessionGameResult } from "./session-types";
import { useI18n } from "@/components/i18n/I18nProvider";
import { translate } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/config";

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

function winnerText(a: number | null, b: number | null, locale: AppLocale) {
  if (a == null || b == null) return translate(locale, "score.open");
  if (a === b) return translate(locale, "score.draw");
  return a > b
    ? translate(locale, "score.team1")
    : translate(locale, "score.team2");
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
  const { locale, t } = useI18n();
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
            {t("score.game", { game: result.game_no })}
          </div>
          {!editing ? (
            <div className="mt-1 text-xl font-black text-slate-950">
              {result.goals_team_a ?? "–"} : {result.goals_team_b ?? "–"}
              <span className="ml-2 text-xs font-bold text-slate-500">
                · {winnerText(result.goals_team_a, result.goals_team_b, locale)}
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
            {t("score.edit")}
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
              aria-label={t("score.teamGoals", { team: t("score.team1"), game: result.game_no })}
            />
            <span className="font-black text-slate-400">:</span>
            <input
              inputMode="numeric"
              value={b}
              onChange={(event) => setB(cleanGoal(event.target.value))}
              disabled={saving}
              className="h-12 rounded-xl border bg-white text-center text-xl font-black"
              aria-label={t("score.teamGoals", { team: t("score.team2"), game: result.game_no })}
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
              {t("score.save")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className="rounded-full border px-3 py-2 text-xs font-bold"
            >
              {t("score.cancel")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onDelete(result.game_no)}
              className="ml-auto rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
            >
              {t("score.delete")}
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
  title,
}: Props) {
  const { t } = useI18n();
  const [showNextGameForm, setShowNextGameForm] = useState(results.length === 0);

  useEffect(() => {
    setShowNextGameForm(results.length === 0);
  }, [results.length]);

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
              {results.length === 1
                ? t("score.resultSaved")
                : t("score.gamesSaved", { count: results.length })}
            </div>
            <div className="mt-1 text-xs font-bold text-emerald-800">
              {single
                ? `${single.goals_team_a ?? "–"}:${single.goals_team_b ?? "–"}`
                : t("score.dailyWins", { a: summary.winsA, b: summary.winsB })}
            </div>
          </div>
          <span className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
            {t("score.openGames")}
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
            <div className="text-sm font-black text-slate-950">{title ?? t("score.results")}</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {t("score.description")}
            </p>
          </div>
          {results.length > 0 ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="shrink-0 rounded-full border px-3 py-2 text-xs font-bold"
            >
              {t("score.compact")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 p-4">
        {results.length > 1 ? (
          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
              {t("score.trainingWinner")}
            </div>
            <div className="mt-1 text-2xl font-black">
              {t("score.dailyWinsValue", { a: summary.winsA, b: summary.winsB })}
            </div>
            <div className="mt-1 text-xs font-semibold text-white/65">
              {summary.winsA === summary.winsB
                ? t("score.currentDraw")
                : summary.winsA > summary.winsB
                  ? t("score.teamAhead", { team: t("score.team1") })
                  : t("score.teamAhead", { team: t("score.team2") })}
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

        {showNextGameForm ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                {results.length === 0
                  ? t("score.game", { game: 1 })
                  : t("score.moreGame", { game: nextGameNo })}
              </div>
              {results.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowNextGameForm(false)}
                  disabled={saving}
                  className="rounded-full px-2 py-1 text-xs font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                >
                  {t("score.close")}
                </button>
              ) : null}
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
                aria-label={t("score.teamGoalsShort", { team: t("score.team1") })}
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
                aria-label={t("score.teamGoalsShort", { team: t("score.team2") })}
              />
            </div>
            <button
              type="button"
              onClick={onSaveResult}
              disabled={saving || !hasDraft}
              className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {saving
                ? t("score.saving")
                : results.length === 0
                  ? t("score.saveResult")
                  : t("score.saveGame", { game: nextGameNo })}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNextGameForm(true)}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 disabled:opacity-50"
          >
            <span className="text-lg leading-none">＋</span>
            {t("score.addGame")}
          </button>
        )}

        {results.length > 0 ? (
          <p className="text-[11px] leading-5 text-slate-500">
            {t("score.sessionHint")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
