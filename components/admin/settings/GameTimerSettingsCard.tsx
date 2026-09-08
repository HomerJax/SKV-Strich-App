"use client";

import { useState } from "react";
import {
  GAME_TIMER_ALARM_OPTIONS,
  type GameTimerAlarmSound,
  type GameTimerMode,
} from "@/lib/game-timer";
import { playTimerAlarm, primeTimerAudio } from "@/lib/game-timer-audio";

type GameTimerSettingsCardProps = {
  initialEnabled: boolean;
  initialMode: GameTimerMode;
  initialDurationMinutes: number;
  initialEndTime: string | null;
  initialHalftimeEnabled: boolean;
  initialAlarmSound: GameTimerAlarmSound;
};

export default function GameTimerSettingsCard({
  initialEnabled,
  initialMode,
  initialDurationMinutes,
  initialEndTime,
  initialHalftimeEnabled,
  initialAlarmSound,
}: GameTimerSettingsCardProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [mode, setMode] = useState<GameTimerMode>(initialMode);
  const [durationMinutes, setDurationMinutes] = useState(initialDurationMinutes);
  const [endTime, setEndTime] = useState(initialEndTime ?? "20:30");
  const [halftimeEnabled, setHalftimeEnabled] = useState(initialHalftimeEnabled);
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
      setError("Der Alarmton konnte auf diesem Gerät nicht abgespielt werden.");
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
          alarmSound,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Spieluhr-Einstellungen konnten nicht gespeichert werden.");
      }

      setMessage("Spieluhr-Einstellungen gespeichert.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Spieluhr-Einstellungen konnten nicht gespeichert werden.",
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
            Spieluhr im Training verwenden
          </span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">
            Wenn aktiv, erscheint in Trainings eine große Spieluhr. Die Werte hier
            sind nur der Club-Standard und können für jedes Training separat geändert werden.
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
            Standard-Ziel
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Entweder feste Spielzeit oder eine Uhrzeit, zu der Schluss sein soll.
          </span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as GameTimerMode)}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
          >
            <option value="duration">Spielzeit in Minuten</option>
            <option value="end_time">Feste Endzeit</option>
          </select>
        </label>

        {mode === "duration" ? (
          <label className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
            <span className="block text-sm font-semibold text-slate-950">
              Standard-Spielzeit
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Gesamtspielzeit ohne Halbzeitpause.
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
              <span className="text-sm font-semibold text-slate-500">Min.</span>
            </div>
          </label>
        ) : (
          <label className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
            <span className="block text-sm font-semibold text-slate-950">
              Standard-Endzeit
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Beispiel: Das Spiel soll spätestens um 20:30 Uhr enden.
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

      <label className="flex items-start justify-between gap-4 rounded-[20px] border border-black/10 bg-neutral-50 p-4">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-950">Mit Halbzeit</span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">
            Bei Spielzeit in Minuten stoppt die Uhr nach Hälfte 1 und wartet auf „2. Halbzeit starten“.
            Bei fester Endzeit bleibt die gewählte Schlusszeit bestehen.
          </span>
        </span>
        <input
          type="checkbox"
          checked={halftimeEnabled}
          onChange={(event) => setHalftimeEnabled(event.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-slate-950 focus:ring-slate-500"
        />
      </label>

      <label className="block rounded-[20px] border border-black/10 bg-neutral-50 p-4">
        <span className="block text-sm font-semibold text-slate-950">Alarmton</span>
        <span className="mt-1 block text-sm leading-6 text-slate-600">
          Der Ton ertönt zur Halbzeit und beim Spielende. Die Lautstärke hängt von der Gerätelautstärke ab.
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
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void testSound()}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ton testen
          </button>
        </div>
      </label>

      <div className="rounded-[20px] border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
        Während die Spieluhr läuft, versucht strikr den Bildschirm wach zu halten. Für einen zuverlässig klingelnden Alarm bei komplett gesperrtem Bildschirm brauchen wir später noch eine native Erweiterung.
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
        {saving ? "Speichert…" : "Spieluhr speichern"}
      </button>
    </div>
  );
}
