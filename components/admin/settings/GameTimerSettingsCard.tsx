"use client";

import { useState } from "react";
import {
  GAME_TIMER_ALARM_OPTIONS,
  GAME_TIMER_HALFTIME_BEHAVIOR_OPTIONS,
  type GameTimerAlarmSound,
  type GameTimerHalftimeBehavior,
  type GameTimerMode,
} from "@/lib/game-timer";
import { playTimerAlarm, primeTimerAudio } from "@/lib/game-timer-audio";
import { useI18n } from "@/components/i18n/I18nProvider";

type GameTimerSettingsCardProps = {
  initialEnabled: boolean;
  initialMode: GameTimerMode;
  initialDurationMinutes: number;
  initialEndTime: string | null;
  initialHalftimeEnabled: boolean;
  initialHalftimeBehavior: GameTimerHalftimeBehavior;
  initialAlarmSound: GameTimerAlarmSound;
};

export default function GameTimerSettingsCard({
  initialEnabled,
  initialMode,
  initialDurationMinutes,
  initialEndTime,
  initialHalftimeEnabled,
  initialHalftimeBehavior,
  initialAlarmSound,
}: GameTimerSettingsCardProps) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [mode, setMode] = useState<GameTimerMode>(initialMode);
  const [durationMinutes, setDurationMinutes] = useState(initialDurationMinutes);
  const [endTime, setEndTime] = useState(initialEndTime ?? "20:30");
  const [halftimeEnabled, setHalftimeEnabled] = useState(initialHalftimeEnabled);
  const [halftimeBehavior, setHalftimeBehavior] =
    useState<GameTimerHalftimeBehavior>(initialHalftimeBehavior);
  const [alarmSound, setAlarmSound] =
    useState<GameTimerAlarmSound>(initialAlarmSound);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function testSound() {
    setError(null);
    await primeTimerAudio();
    const played = await playTimerAlarm(alarmSound, { preview: true });

    if (!played) {
      setError(t("gameTimer.soundPlaybackFailed"));
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/game-timer-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          enabled,
          mode,
          durationMinutes,
          endTime: endTime || null,
          halftimeEnabled,
          halftimeBehavior,
          alarmSound,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? t("settings.gameTimer.saveFailed"));
      }

      setMessage(t("settings.gameTimer.saved"));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("settings.gameTimer.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <label className="flex items-start justify-between gap-4 rounded-[20px] border border-black/10 bg-neutral-50 p-4">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-950">
            {t("settings.gameTimer.enable")}
          </span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">
            {t("settings.gameTimer.enableHint")}
          </span>
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-slate-950 focus:ring-slate-500"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
          <span className="block text-sm font-semibold text-slate-950">
            {t("settings.gameTimer.target")}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {t("settings.gameTimer.targetHint")}
          </span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as GameTimerMode)}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
          >
            <option value="duration">{t("gameTimer.durationMode")}</option>
            <option value="end_time">{t("gameTimer.endTimeMode")}</option>
          </select>
        </label>

        {mode === "duration" ? (
          <label className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
            <span className="block text-sm font-semibold text-slate-950">
              {t("settings.gameTimer.duration")}
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              {t("settings.gameTimer.durationHint")}
            </span>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={300}
                inputMode="numeric"
                value={durationMinutes}
                onChange={(event) =>
                  setDurationMinutes(Number.parseInt(event.target.value || "0", 10))
                }
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900"
              />
              <span className="text-sm font-semibold text-slate-500">{t("gameTimer.minutesShort")}</span>
            </div>
          </label>
        ) : (
          <label className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
            <span className="block text-sm font-semibold text-slate-950">
              {t("settings.gameTimer.endTime")}
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              {t("settings.gameTimer.endTimeHint")}
            </span>
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900"
            />
          </label>
        )}
      </div>

      <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
        <label className="flex items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-950">{t("gameTimer.withHalftime")}</span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">
              {t("settings.gameTimer.halftimeHint")}
            </span>
          </span>
          <input
            type="checkbox"
            checked={halftimeEnabled}
            onChange={(event) => setHalftimeEnabled(event.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-slate-950 focus:ring-slate-500"
          />
        </label>

        {halftimeEnabled ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="text-sm font-semibold text-slate-950">{t("settings.gameTimer.halftimeQuestion")}</div>
            <div className="mt-3 grid gap-2">
              {GAME_TIMER_HALFTIME_BEHAVIOR_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <input
                    type="radio"
                    name="halftimeBehavior"
                    value={option.value}
                    checked={halftimeBehavior === option.value}
                    onChange={() => setHalftimeBehavior(option.value)}
                    className="mt-1 h-4 w-4 border-slate-300 text-slate-950 focus:ring-slate-500"
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-900">{option.value === "pause" ? t("gameTimer.pauseOption") : t("gameTimer.signalOption")}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{option.value === "pause" ? t("gameTimer.pauseOptionHint") : t("gameTimer.signalOptionHint")}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <label className="block rounded-[20px] border border-black/10 bg-neutral-50 p-4">
        <span className="block text-sm font-semibold text-slate-950">{t("gameTimer.alarmSound")}</span>
        <span className="mt-1 block text-sm leading-6 text-slate-600">
          {t("settings.gameTimer.alarmHint")}
        </span>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            value={alarmSound}
            onChange={(event) =>
              setAlarmSound(event.target.value as GameTimerAlarmSound)
            }
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
          >
            {GAME_TIMER_ALARM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value === "whistle"
                  ? t("settings.gameTimer.whistle")
                  : option.value === "horn"
                    ? t("settings.gameTimer.horn")
                    : t("settings.gameTimer.buzzer")}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void testSound()}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t("gameTimer.testSound")}
          </button>
        </div>
      </label>

      <div className="rounded-[20px] border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
        {t("settings.gameTimer.info")}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? t("profile.savingShort") : t("settings.gameTimer.save")}
      </button>
    </div>
  );
}
