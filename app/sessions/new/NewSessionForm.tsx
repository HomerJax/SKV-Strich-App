"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/config";

type NewSessionFormSeason = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type NewSessionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  initialDate: string;
  seasons: NewSessionFormSeason[];
  enableSessionTypes?: boolean;
};

type CreateMode = "single" | "series";
type SessionType = "training" | "event";

const WEEKDAY_OPTIONS: Array<{ value: string; labelKey: MessageKey }> = [
  { value: "1", labelKey: "newSession.monday" },
  { value: "2", labelKey: "newSession.tuesday" },
  { value: "3", labelKey: "newSession.wednesday" },
  { value: "4", labelKey: "newSession.thursday" },
  { value: "5", labelKey: "newSession.friday" },
  { value: "6", labelKey: "newSession.saturday" },
  { value: "0", labelKey: "newSession.sunday" },
];

function SubmitButton({
  sessionType,
  blocked,
}: {
  sessionType: SessionType;
  blocked: boolean;
}) {
  const { t } = useI18n();
  const { pending } = useFormStatus();
  const label = sessionType === "event" ? t("newSession.event") : t("newSession.training");

  return (
    <button
      type="submit"
      disabled={blocked || pending}
      aria-busy={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
          />
          {t("newSession.creating", { type: label })}
        </>
      ) : (
        t("newSession.create", { type: label })
      )}
    </button>
  );
}

function formatSeasonDate(value: string | null, locale: AppLocale) {
  if (!value) return "—";

  return new Date(`${value}T00:00:00`).toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getSessionTypeDescription(
  type: SessionType,
  t: (key: MessageKey) => string,
) {
  if (type === "event") {
    return t("newSession.eventHint");
  }

  return t("newSession.trainingHint");
}

export default function NewSessionForm({
  action,
  initialDate,
  seasons,
  enableSessionTypes = false,
}: NewSessionFormProps) {
  const { locale, t } = useI18n();
  const [mode, setMode] = useState<CreateMode>("single");
  const [sessionType, setSessionType] = useState<SessionType>("training");

  const defaultSeasonId = seasons.length > 0 ? String(seasons[0].id) : "";
  const [seriesSeasonId, setSeriesSeasonId] = useState(defaultSeasonId);

  const selectedSeason = useMemo(
    () => seasons.find((season) => String(season.id) === seriesSeasonId) ?? null,
    [seasons, seriesSeasonId]
  );

  const seriesMinStartDate = selectedSeason?.start_date ?? "";
  const seriesMaxStartDate = selectedSeason?.end_date ?? "";
  const seriesStartDefault = selectedSeason?.start_date ?? initialDate;
  const seriesEndDisplay = selectedSeason?.end_date ?? "";
  const notesLabel = sessionType === "event" ? t("newSession.eventNotes") : t("newSession.trainingNotes");
  const notesPlaceholder =
    sessionType === "event"
      ? t("newSession.eventPlaceholder")
      : t("newSession.trainingPlaceholder");

  return (
    <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      {enableSessionTypes ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-700">{t("newSession.sessionType")}</legend>
          <label className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
            <input type="radio" name="type" value="training" checked={sessionType === "training"} onChange={() => setSessionType("training")} className="mt-1" />
            <div><div className="font-semibold text-slate-900">{t("newSession.training")}</div><div className="text-xs text-slate-500">{t("newSession.trainingShortHint")}</div></div>
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
            <input type="radio" name="type" value="event" checked={sessionType === "event"} onChange={() => setSessionType("event")} className="mt-1" />
            <div><div className="font-semibold text-slate-900">{t("newSession.event")}</div><div className="text-xs text-slate-500">{t("newSession.eventShortHint")}</div></div>
          </label>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">{getSessionTypeDescription(sessionType, t)}</div>
        </fieldset>
      ) : <input type="hidden" name="type" value="training" />}

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-slate-700">{t("newSession.mode")}</legend>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <input type="radio" name="mode" value="single" checked={mode === "single"} onChange={() => setMode("single")} /> {t("newSession.single")}
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <input type="radio" name="mode" value="series" checked={mode === "series"} onChange={() => setMode("series")} /> {t("newSession.series")}
        </label>
      </fieldset>

      {mode === "single" ? (
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-900">{t("newSession.single")}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><div className="mb-1 text-xs font-semibold text-slate-700">{t("newSession.date")}</div><input name="date" type="date" defaultValue={initialDate} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
            <label className="block"><div className="mb-1 text-xs font-semibold text-slate-700">{t("newSession.time")}</div><input name="start_time" type="time" step="900" defaultValue="19:30" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
          </div>
        </div>
      ) : null}

      {mode === "series" ? (
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-900">{t("newSession.series")}</div>
          {seasons.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{t("newSession.seriesNeedsSeason")}</div>
          ) : (
            <div className="space-y-3">
              <label className="block"><div className="mb-1 text-xs font-semibold text-slate-700">{t("newSession.season")}</div><select name="series_season_id" value={seriesSeasonId} onChange={(event) => setSeriesSeasonId(event.target.value)} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">{t("newSession.seasonRange", {
  start: formatSeasonDate(selectedSeason?.start_date ?? null, locale),
  end: formatSeasonDate(selectedSeason?.end_date ?? null, locale),
})}</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><div className="mb-1 text-xs font-semibold text-slate-700">{t("newSession.seriesStart")}</div><input key={`series-start-${seriesSeasonId}-${seriesStartDefault}`} name="series_start_date" type="date" defaultValue={seriesStartDefault} min={seriesMinStartDate} max={seriesMaxStartDate} required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
                <label className="block"><div className="mb-1 text-xs font-semibold text-slate-700">{t("newSession.seriesEnd")}</div><input type="text" value={formatSeasonDate(seriesEndDisplay, locale)} readOnly className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600" /></label>
              </div>
              <label className="block"><div className="mb-1 text-xs font-semibold text-slate-700">{t("newSession.time")}</div><input name="start_time" type="time" step="900" defaultValue="19:30" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><div className="mb-1 text-xs font-semibold text-slate-700">{t("newSession.weekday1")}</div><select name="weekday_one" defaultValue="4" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{WEEKDAY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}</select></label>
                <label className="block"><div className="mb-1 text-xs font-semibold text-slate-700">{t("newSession.weekday2")}</div><select name="weekday_two" defaultValue="" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">{t("newSession.noSecondDay")}</option>{WEEKDAY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}</select></label>
              </div>
              <div className="text-xs text-slate-500">{t("newSession.seriesEndHint")}</div>
            </div>
          )}
        </div>
      ) : null}

      <label className="block"><div className="mb-1 text-xs font-semibold text-slate-700">{notesLabel}</div><input name="notes" placeholder={notesPlaceholder} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>

      <SubmitButton sessionType={sessionType} blocked={mode === "series" && seasons.length === 0} />
    </form>
  );
}
