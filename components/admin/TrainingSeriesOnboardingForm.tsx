"use client";

import { useContext, useState } from "react";
import { OnboardingQaSeasonContext } from "@/components/admin/OnboardingQaSeasonContext";
import { CalendarDays, Clock3, Info, Repeat2 } from "lucide-react";
import {
  addCalendarDays,
  firstWeekdayOnOrAfter,
  getWeeklyTrainingTemplate,
  getSecondTrainingStart,
} from "@/lib/onboarding/training-template";

type Props = {
  seasonName: string;
  seasonStart: string | null;
  seasonEnd: string | null;
  createSeries: (formData: FormData) => void | Promise<void>;
};

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

export default function TrainingSeriesOnboardingForm({
  seasonName, seasonStart, seasonEnd, createSeries,
}: Props) {
  const qaSeason = useContext(OnboardingQaSeasonContext);
  const activeSeasonStart = qaSeason?.start_date ?? seasonStart;
  const activeSeasonEnd = qaSeason ? qaSeason.end_date : seasonEnd;
  const activeSeasonName = qaSeason?.name ?? seasonName;
  const template = getWeeklyTrainingTemplate({ start_date: activeSeasonStart, end_date: activeSeasonEnd });
  const [weekday, setWeekday] = useState(4);
  const [startDate, setStartDate] = useState(template.firstDate);
  const [endDate, setEndDate] = useState(template.lastDate);
  const [startTime, setStartTime] = useState(template.startTime);
  const [secondEnabled, setSecondEnabled] = useState(false);
  const [secondWeekday, setSecondWeekday] = useState("");
  const [secondStartTime, setSecondStartTime] = useState("19:00");
  const secondFirstDate = secondEnabled && secondWeekday !== "" && activeSeasonStart && startDate
    ? getSecondTrainingStart(activeSeasonStart, startDate, weekday, Number(secondWeekday))
    : "";
  const invalidSecondDate = secondEnabled && Boolean(secondFirstDate && secondFirstDate > endDate);

  function changeWeekday(value: number) {
    setWeekday(value);
    if (String(value) === secondWeekday) setSecondWeekday("");
    const next = getWeeklyTrainingTemplate({ start_date: activeSeasonStart, end_date: activeSeasonEnd }, value);
    setStartDate(next.firstDate);
    setEndDate(next.lastDate);
  }

  function changeFirstDate(value: string) {
    const clamped = activeSeasonStart && value < activeSeasonStart ? activeSeasonStart : value;
    const aligned = clamped ? firstWeekdayOnOrAfter(clamped, weekday) : "";
    setStartDate(aligned);
    if (!aligned) return;
    const lastAllowed = addCalendarDays(aligned, 51 * 7);
    const lastSeasonDate = activeSeasonEnd && activeSeasonEnd < lastAllowed ? activeSeasonEnd : lastAllowed;
    if (!endDate || endDate < aligned || endDate > lastSeasonDate) {
      setEndDate(lastSeasonDate);
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="rounded-[24px] border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-cyan-800">
          <CalendarDays className="h-4 w-4" /> Trainingsvorlage
        </div>
        <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">Euer wöchentliches Training</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Damit ihr sofort starten könnt, haben wir ein Training pro Woche am Donnerstag um 19:00 Uhr vorausgewählt.
          Das erste Training liegt am ersten Donnerstag eurer Saison. Alles lässt sich noch ändern.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-sm font-bold text-slate-950"><Repeat2 className="h-4 w-4 shrink-0 text-cyan-700" />{secondEnabled ? "2 × pro Woche" : "1 × pro Woche"}</div>
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-sm font-bold text-slate-950"><CalendarDays className="h-4 w-4 shrink-0 text-cyan-700" />{WEEKDAYS[weekday]}</div>
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-sm font-bold text-slate-950"><Clock3 className="h-4 w-4 shrink-0 text-cyan-700" />{startTime} Uhr</div>
        </div>
      </div>

      <div className="min-w-0 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h3 className="text-base font-black text-slate-950">Trainingszeiten festlegen</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Zugeordnet zur Saison: <strong className="text-slate-700">{activeSeasonName}</strong></p>
        </div>

        {!activeSeasonStart || !template.firstDate ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {activeSeasonStart ? "Im festgelegten Saisonzeitraum liegt kein passender Trainingstag. Bitte die Saison verlängern oder einen anderen Zeitraum festlegen." : "Bitte lege zuerst eine Saison mit Startdatum fest."}
          </div>
        ) : (
          <form action={createSeries} className="min-w-0 space-y-4">
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block min-w-0 text-sm font-bold text-slate-800">
                Wochentag
                <select name="weekday" value={weekday} onChange={event => changeWeekday(Number(event.target.value))} className="mt-1.5 block w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-950">
                  {WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
                </select>
              </label>
              <label className="block min-w-0 text-sm font-bold text-slate-800">
                Uhrzeit
                <input name="start_time" required type="time" value={startTime} onChange={event=>setStartTime(event.target.value)} className="mt-1.5 block w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-950"/>
              </label>
              <label className="block min-w-0 text-sm font-bold text-slate-800">
                Erstes Training
                <input name="start_date" required type="date" value={startDate} min={activeSeasonStart} max={activeSeasonEnd ?? undefined} onChange={event=>changeFirstDate(event.target.value)} className="mt-1.5 block w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-2 py-3 text-base text-slate-950"/>
              </label>
              <label className="block min-w-0 text-sm font-bold text-slate-800">
                Letztes Training bis
                <input name="end_date" required type="date" value={endDate} min={startDate} max={startDate ? (activeSeasonEnd && activeSeasonEnd < addCalendarDays(startDate,51*7) ? activeSeasonEnd : addCalendarDays(startDate,51*7)) : (activeSeasonEnd ?? undefined)} onChange={event=>setEndDate(event.target.value)} className="mt-1.5 block w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-2 py-3 text-base text-slate-950"/>
              </label>
            </div>
            <section className="min-w-0 space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={secondEnabled} onChange={event => { setSecondEnabled(event.target.checked); if (!event.target.checked) setSecondWeekday(""); }} className="mt-1 h-5 w-5 shrink-0 accent-slate-950"/>
                <span className="min-w-0">
                  <strong className="block text-sm font-black text-slate-950">Optional: zweiten Trainingstag hinzufügen</strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">Wenn ihr zweimal pro Woche trainiert, kannst du einen weiteren Wochentag mit eigener Uhrzeit auswählen. Auch in Free sind bis zu zwei feste Trainingstage enthalten.</span>
                </span>
              </label>
              {secondEnabled ? (
                <div className="min-w-0 space-y-3 border-t border-slate-200 pt-4">
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block min-w-0 text-sm font-bold text-slate-800">
                      Zweiter Wochentag
                      <select name="weekday_two" required value={secondWeekday} onChange={event => setSecondWeekday(event.target.value)} className="mt-1.5 block w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-950">
                        <option value="">Tag auswählen</option>
                        {WEEKDAYS.map((day, index) => <option key={day} value={index} disabled={index === weekday}>{day}{index === weekday ? " (bereits ausgewählt)" : ""}</option>)}
                      </select>
                    </label>
                    <label className="block min-w-0 text-sm font-bold text-slate-800">
                      Uhrzeit am zweiten Tag
                      <input name="start_time_two" required type="time" value={secondStartTime} onChange={event => setSecondStartTime(event.target.value)} className="mt-1.5 block w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-950"/>
                    </label>
                  </div>
                  {secondFirstDate ? (
                    <p className="rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-xs leading-5 text-cyan-950">
                      Erstes Training am zweiten Wochentag: <strong>{new Date(secondFirstDate + "T12:00:00Z").toLocaleDateString("de-DE")}</strong>. Der letzte Termin liegt spätestens am ausgewählten Enddatum.
                    </p>
                  ) : null}
                  {invalidSecondDate ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">Der zweite Trainingstag liegt hinter dem Enddatum. Wähle einen längeren Zeitraum oder einen anderen Wochentag.</p> : null}
                </div>
              ) : null}
            </section>
            <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              <Info className="mt-0.5 h-4 w-4 shrink-0" /> strikr plant je Trainingstag maximal 52 wöchentliche Termine. Wenn du einen zweiten Tag auswählst, werden beide Trainingsserien mit ihren jeweiligen Uhrzeiten angelegt. Weitere Termine kannst du später ergänzen.
            </p>
            <button type="submit" disabled={invalidSecondDate} className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,23,42,.14)] hover:bg-slate-800">
              {secondEnabled ? "Beide Trainingsserien anlegen und weiter" : "Trainingsserie anlegen und weiter"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
