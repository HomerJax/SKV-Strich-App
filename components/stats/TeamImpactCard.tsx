"use client";

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { formatImpactValue } from "@/lib/stats/utils";
import { useI18n } from "@/components/i18n/I18nProvider";

type ImpactDetail = {
  sessionId: number;
  date: string | null;
  scoreLabel: string;
  myTeamLabel: string;
  myTeamScore: number;
  opponentScore: number;
  goalsFor: number;
  goalsAgainst: number;
  impactValue: number;
  explanation: string;
};

type TeamImpactCardProps = {
  impactGames: number;
  impactWins: number;
  impactTotal: number;
  impactPerMatch: number;
  impactDetails?: ImpactDetail[];
  impactMeta: {
    title: string;
    text: string;
    badgeClasses: string;
    boxClasses: string;
  };
};

type ImpactStatProps = {
  label: string;
  value: string;
  hint?: string;
};

function ImpactStat({ label, value, hint }: ImpactStatProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold leading-none tracking-tight text-slate-950">
        {value}
      </div>
      {hint ? <div className="mt-3 text-xs leading-5 text-slate-500">{hint}</div> : null}
    </div>
  );
}

function formatDate(date: string | null, locale: "de" | "en") {
  if (!date) return null;

  return new Date(date).toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default function TeamImpactCard({
  impactGames,
  impactWins,
  impactTotal,
  impactPerMatch,
  impactDetails = [],
  impactMeta,
}: TeamImpactCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { locale, t } = useI18n();

  const impactFormula = impactDetails
    .map((detail) => formatImpactValue(detail.impactValue, locale))
    .join(" + ")
    .replace(/\+ -/g, "- ");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl text-sm leading-6 text-slate-600">
          {t("stats.impactIntro")}
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${impactMeta.badgeClasses}`}
        >
          {impactMeta.title}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setDetailsOpen((open) => !open)}
        className="grid w-full grid-cols-2 gap-3 text-left xl:grid-cols-4"
      >
        <ImpactStat label={t("stats.gamesWithYou")} value={String(impactGames)} hint={t("stats.gamesWithYouHint")} />
        <ImpactStat label={t("stats.winsWithYou")} value={String(impactWins)} hint={t("stats.winsWithYouHint")} />
        <ImpactStat label={t("stats.impactTotal")} value={formatImpactValue(impactTotal, locale)} hint={t("stats.impactTotalHint")} />
        <ImpactStat label={t("stats.impactPerGame")} value={formatImpactValue(impactPerMatch, locale)} hint={t("stats.impactPerGameHint")} />
      </button>

      <button
        type="button"
        onClick={() => setDetailsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 shadow-sm"
      >
        <span className="inline-flex items-center gap-2">
          <Info className="h-4 w-4 text-slate-500" />
          {t("stats.showCalculation")}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition ${detailsOpen ? "rotate-180" : ""}`} />
      </button>

      {detailsOpen ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">{t("stats.yourCalculation")}</div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {t("stats.impactTotal")}
              </div>
              <div className="mt-2 text-lg font-bold text-slate-950">
                {formatImpactValue(impactTotal, locale)}
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-600">
                {t("stats.sumGames", { count: impactGames })}
              </div>
              {impactFormula ? (
                <div className="mt-2 rounded-lg bg-slate-50 px-2 py-2 font-mono text-[11px] leading-5 text-slate-600">
                  {impactFormula} = {formatImpactValue(impactTotal, locale)}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {t("stats.impactPerGame")}
              </div>
              <div className="mt-2 text-lg font-bold text-slate-950">
                {formatImpactValue(impactPerMatch, locale)}
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-600">
                {t("stats.totalDivided")}
              </div>
              <div className="mt-2 rounded-lg bg-slate-50 px-2 py-2 font-mono text-[11px] leading-5 text-slate-600">
                {formatImpactValue(impactTotal, locale)} ÷ {impactGames || 0} ={" "}
                {formatImpactValue(impactPerMatch, locale)}
              </div>
            </div>
          </div>

          <div className="mt-5 font-semibold text-slate-900">
            {t("stats.singleGameCalc")}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              {t("stats.winFavorite")} → <span className="font-semibold">+1</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              {t("stats.winUnderdog")} → <span className="font-semibold">+2</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              {t("stats.lossFavorite")} → <span className="font-semibold">-1</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              {t("stats.lossUnderdog")} → <span className="font-semibold">0</span>
            </div>
          </div>

          <p className="mt-3 text-slate-600">
            {t("stats.impactBasis")}
          </p>

          {impactDetails.length > 0 ? (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {t("stats.singleCalculation")}
              </div>

              {impactDetails.map((detail) => (
                <div
                  key={`${detail.sessionId}-${detail.myTeamLabel}`}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">
                        {formatDate(detail.date, locale) ?? t("stats.noDate")} · {detail.scoreLabel}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {t("stats.teamStrength", { team: detail.myTeamLabel, mine: detail.myTeamScore, opponent: detail.opponentScore })}
                      </div>
                    </div>
                    <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-950">
                      {formatImpactValue(detail.impactValue, locale)}
                    </div>
                  </div>

                  <div className="mt-2 text-xs leading-5 text-slate-600">
                    {detail.explanation}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={`rounded-2xl border px-4 py-4 text-sm leading-6 ${impactMeta.boxClasses}`}>
        <div className="font-semibold">{impactMeta.title}</div>
        <div className="mt-1">{impactMeta.text}</div>
      </div>
    </div>
  );
}