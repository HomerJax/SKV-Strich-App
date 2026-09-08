"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GAME_TIMER_ALARM_OPTIONS,
  type GameTimerAlarmSound,
  type GameTimerMode,
  type GameTimerSettings,
} from "@/lib/game-timer";
import { playTimerAlarm, primeTimerAudio } from "@/lib/game-timer-audio";

type TimerPhase = "idle" | "running" | "halftime" | "finished";
type TimerSegment = "continuous" | "first" | "second";

type PersistedTimerRuntime = {
  phase: TimerPhase;
  segment: TimerSegment;
  targetAt: number | null;
  endAt: number | null;
  settings: GameTimerSettings;
  savedAt: number;
};

type SessionGameTimerCardProps = {
  sessionId: number;
  initialSettings: GameTimerSettings;
  clubDefaultSettings: GameTimerSettings;
  initialUsesOverride: boolean;
};

const MAX_RUNTIME_AGE_MS = 18 * 60 * 60 * 1000;

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatEndTime(value: string | null) {
  return value || "–";
}

function getAlarmLabel(sound: GameTimerAlarmSound) {
  return GAME_TIMER_ALARM_OPTIONS.find((option) => option.value === sound)?.label ?? "Alarm";
}

function getFutureEndTimestamp(endTime: string | null) {
  if (!endTime) return null;

  const match = endTime.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;

  const now = new Date();
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const candidate = new Date(now);
  candidate.setHours(hours, minutes, 0, 0);

  if (candidate.getTime() > now.getTime()) {
    return candidate.getTime();
  }

  const overnight = now.getHours() >= 18 && hours <= 4;
  if (!overnight) return null;

  candidate.setDate(candidate.getDate() + 1);
  return candidate.getTime();
}

function getInitialRuntime(settings: GameTimerSettings): PersistedTimerRuntime {
  return {
    phase: "idle",
    segment: settings.halftimeEnabled ? "first" : "continuous",
    targetAt: null,
    endAt: null,
    settings,
    savedAt: Date.now(),
  };
}

function runtimeStorageKey(sessionId: number) {
  return `strikr:game-timer:${sessionId}`;
}

export default function SessionGameTimerCard({
  sessionId,
  initialSettings,
  clubDefaultSettings,
  initialUsesOverride,
}: SessionGameTimerCardProps) {
  const [settings, setSettings] = useState<GameTimerSettings>(initialSettings);
  const [usesOverride, setUsesOverride] = useState(initialUsesOverride);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<PersistedTimerRuntime>(() =>
    getInitialRuntime(initialSettings),
  );
  const [remainingMs, setRemainingMs] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const handledTargetRef = useRef<number | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const isRunning = runtime.phase === "running";
  const canEdit = runtime.phase === "idle" || runtime.phase === "finished";

  const persistRuntime = useCallback(
    (nextRuntime: PersistedTimerRuntime) => {
      setRuntime(nextRuntime);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          runtimeStorageKey(sessionId),
          JSON.stringify(nextRuntime),
        );
      }
    },
    [sessionId],
  );

  const resetRuntime = useCallback(
    (nextSettings: GameTimerSettings = settings) => {
      const nextRuntime = getInitialRuntime(nextSettings);
      persistRuntime(nextRuntime);
      setRemainingMs(0);
      handledTargetRef.current = null;
    },
    [persistRuntime, settings],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(runtimeStorageKey(sessionId));
    if (!raw) {
      setHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PersistedTimerRuntime;
      const validAge =
        typeof parsed.savedAt === "number" &&
        Date.now() - parsed.savedAt <= MAX_RUNTIME_AGE_MS;
      const validPhase = ["idle", "running", "halftime", "finished"].includes(
        parsed.phase,
      );

      if (validAge && validPhase && parsed.settings) {
        setRuntime(parsed);
        if (parsed.phase === "running" && parsed.targetAt) {
          setRemainingMs(Math.max(0, parsed.targetAt - Date.now()));
        }
      } else {
        window.localStorage.removeItem(runtimeStorageKey(sessionId));
      }
    } catch {
      window.localStorage.removeItem(runtimeStorageKey(sessionId));
    } finally {
      setHydrated(true);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!hydrated || !isRunning || !runtime.targetAt) return;

    const update = () => {
      setRemainingMs(Math.max(0, runtime.targetAt! - Date.now()));
    };

    update();
    const intervalId = window.setInterval(update, 250);
    return () => window.clearInterval(intervalId);
  }, [hydrated, isRunning, runtime.targetAt]);

  const releaseWakeLock = useCallback(async () => {
    const current = wakeLockRef.current;
    wakeLockRef.current = null;
    if (!current) return;

    try {
      await current.release();
    } catch {
      // Wake Lock ist optional. Timer läuft trotzdem über Zeitstempel weiter.
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === "undefined") return;

    const wakeLockApi = (
      navigator as Navigator & {
        wakeLock?: {
          request: (type: "screen") => Promise<{ release: () => Promise<void> }>;
        };
      }
    ).wakeLock;

    if (!wakeLockApi || wakeLockRef.current) return;

    try {
      wakeLockRef.current = await wakeLockApi.request("screen");
    } catch {
      // Nicht auf jedem Browser/WebView verfügbar.
    }
  }, []);

  useEffect(() => {
    if (isRunning) {
      void requestWakeLock();
    } else {
      void releaseWakeLock();
    }

    return () => {
      void releaseWakeLock();
    };
  }, [isRunning, releaseWakeLock, requestWakeLock]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && isRunning) {
        void requestWakeLock();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isRunning, requestWakeLock]);

  useEffect(() => {
    if (
      runtime.phase !== "running" ||
      !runtime.targetAt ||
      Date.now() < runtime.targetAt ||
      handledTargetRef.current === runtime.targetAt
    ) {
      return;
    }

    handledTargetRef.current = runtime.targetAt;
    void playTimerAlarm(runtime.settings.alarmSound);

    if (runtime.settings.halftimeEnabled && runtime.segment === "first") {
      persistRuntime({
        ...runtime,
        phase: "halftime",
        targetAt: null,
        savedAt: Date.now(),
      });
      setRemainingMs(0);
      setMessage("Halbzeit. Alarm ausgelöst.");
      return;
    }

    persistRuntime({
      ...runtime,
      phase: "finished",
      targetAt: null,
      savedAt: Date.now(),
    });
    setRemainingMs(0);
    setMessage("Abpfiff. Spielzeit beendet.");
  }, [persistRuntime, runtime, remainingMs]);

  const displayTime = useMemo(() => {
    if (runtime.phase === "halftime") return "HALBZEIT";
    if (runtime.phase === "finished") return "00:00";
    if (runtime.phase === "idle") {
      if (settings.mode === "duration") {
        const milliseconds = settings.halftimeEnabled
          ? (settings.durationMinutes * 60 * 1000) / 2
          : settings.durationMinutes * 60 * 1000;
        return formatRemaining(milliseconds);
      }
      return settings.endTime ? `bis ${settings.endTime}` : "–";
    }
    return formatRemaining(remainingMs);
  }, [remainingMs, runtime.phase, settings]);

  const phaseLabel = useMemo(() => {
    if (runtime.phase === "idle") return "Bereit";
    if (runtime.phase === "halftime") return "Pause";
    if (runtime.phase === "finished") return "Abpfiff";
    if (runtime.segment === "first") return "1. Halbzeit";
    if (runtime.segment === "second") return "2. Halbzeit";
    return "Spiel läuft";
  }, [runtime.phase, runtime.segment]);

  const settingsSummary = useMemo(() => {
    const target =
      settings.mode === "duration"
        ? `${settings.durationMinutes} Min.`
        : `Ende ${formatEndTime(settings.endTime)}`;
    const halftime = settings.halftimeEnabled ? "2 Halbzeiten" : "durchspielen";
    return `${target} · ${halftime} · ${getAlarmLabel(settings.alarmSound)}`;
  }, [settings]);

  async function startTimer() {
    setError(null);
    setMessage(null);
    handledTargetRef.current = null;
    await primeTimerAudio();

    const now = Date.now();
    let endAt: number | null = null;
    let targetAt: number;

    if (settings.mode === "duration") {
      const totalMs = settings.durationMinutes * 60 * 1000;
      targetAt = now + (settings.halftimeEnabled ? totalMs / 2 : totalMs);
    } else {
      endAt = getFutureEndTimestamp(settings.endTime);
      if (!endAt) {
        setError("Die gewählte Endzeit liegt bereits zurück. Bitte die Endzeit für dieses Training anpassen.");
        return;
      }

      targetAt = settings.halftimeEnabled ? now + (endAt - now) / 2 : endAt;
    }

    persistRuntime({
      phase: "running",
      segment: settings.halftimeEnabled ? "first" : "continuous",
      targetAt,
      endAt,
      settings,
      savedAt: Date.now(),
    });
    setRemainingMs(Math.max(0, targetAt - now));
  }

  async function startSecondHalf() {
    setError(null);
    setMessage(null);
    handledTargetRef.current = null;
    await primeTimerAudio();

    const activeSettings = runtime.settings;
    const now = Date.now();
    let targetAt: number;

    if (activeSettings.mode === "duration") {
      targetAt = now + (activeSettings.durationMinutes * 60 * 1000) / 2;
    } else {
      const endAt = runtime.endAt;
      if (!endAt || endAt <= now) {
        persistRuntime({
          ...runtime,
          phase: "finished",
          segment: "second",
          targetAt: null,
          savedAt: Date.now(),
        });
        setError("Die feste Endzeit ist bereits erreicht.");
        return;
      }
      targetAt = endAt;
    }

    persistRuntime({
      ...runtime,
      phase: "running",
      segment: "second",
      targetAt,
      savedAt: Date.now(),
    });
    setRemainingMs(Math.max(0, targetAt - now));
  }

  function stopTimer() {
    setMessage("Spieluhr gestoppt.");
    setError(null);
    resetRuntime(settings);
  }

  async function testSound() {
    setError(null);
    await primeTimerAudio();
    const played = await playTimerAlarm(settings.alarmSound, { preview: true });
    if (!played) {
      setError("Der Alarmton konnte auf diesem Gerät nicht abgespielt werden.");
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(settings),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Spieluhr konnte nicht gespeichert werden.");
      }

      setUsesOverride(true);
      setEditing(false);
      resetRuntime(settings);
      setMessage("Spieluhr für dieses Training angepasst.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Spieluhr konnte nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function resetToClubDefault() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ reset: true }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Club-Standard konnte nicht geladen werden.");
      }

      setSettings(clubDefaultSettings);
      setUsesOverride(false);
      setEditing(false);
      resetRuntime(clubDefaultSettings);
      setMessage("Club-Standard für dieses Training wiederhergestellt.");
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Club-Standard konnte nicht wiederhergestellt werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold tracking-tight text-slate-950">
              Spieluhr
            </h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {usesOverride ? "für dieses Training angepasst" : "Club-Standard"}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{settingsSummary}</p>
        </div>

        {canEdit ? (
          <button
            type="button"
            onClick={() => setEditing((current) => !current)}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            {editing ? "Schließen" : "Für heute anpassen"}
          </button>
        ) : null}
      </div>

      <div className="p-4 sm:p-5">
        <div className="rounded-[22px] bg-slate-950 px-4 py-6 text-center text-white sm:py-8">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
            {phaseLabel}
          </div>
          <div
            className={`mt-2 font-black tabular-nums tracking-tight ${
              runtime.phase === "halftime"
                ? "text-4xl sm:text-5xl"
                : "text-6xl sm:text-7xl"
            }`}
          >
            {displayTime}
          </div>
          {runtime.phase === "halftime" && runtime.settings.mode === "end_time" ? (
            <div className="mt-3 text-sm font-semibold text-white/70">
              Feste Endzeit: {runtime.settings.endTime} Uhr
            </div>
          ) : null}
          {runtime.phase === "halftime" && runtime.settings.mode === "duration" ? (
            <div className="mt-3 text-sm font-semibold text-white/70">
              2. Halbzeit: {formatRemaining((runtime.settings.durationMinutes * 60 * 1000) / 2)}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {runtime.phase === "idle" ? (
            <button
              type="button"
              onClick={() => void startTimer()}
              disabled={!hydrated}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              Spiel starten
            </button>
          ) : null}

          {runtime.phase === "running" ? (
            <button
              type="button"
              onClick={stopTimer}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
            >
              Spieluhr stoppen
            </button>
          ) : null}

          {runtime.phase === "halftime" ? (
            <>
              <button
                type="button"
                onClick={() => void startSecondHalf()}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800"
              >
                2. Halbzeit starten
              </button>
              <button
                type="button"
                onClick={stopTimer}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Beenden
              </button>
            </>
          ) : null}

          {runtime.phase === "finished" ? (
            <button
              type="button"
              onClick={() => resetRuntime(settings)}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800"
            >
              Spieluhr zurücksetzen
            </button>
          ) : null}
        </div>

        {editing && canEdit ? (
          <div className="mt-5 space-y-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <div>
              <div className="text-sm font-extrabold text-slate-950">
                Nur für dieses Training
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Weniger Leute, kürzer spielen oder heute eine feste Schlusszeit? Hier überschreibst du den Club-Standard nur für diese Session.
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-bold text-slate-700">Ziel</span>
              <select
                value={settings.mode}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    mode: event.target.value as GameTimerMode,
                  }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900"
              >
                <option value="duration">Spielzeit in Minuten</option>
                <option value="end_time">Feste Endzeit</option>
              </select>
            </label>

            {settings.mode === "duration" ? (
              <label className="block">
                <span className="text-xs font-bold text-slate-700">Spielzeit gesamt</span>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={300}
                    inputMode="numeric"
                    value={settings.durationMinutes}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        durationMinutes: Number.parseInt(event.target.value || "0", 10),
                      }))
                    }
                    className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900"
                  />
                  <span className="text-sm font-semibold text-slate-500">Min.</span>
                </div>
              </label>
            ) : (
              <label className="block">
                <span className="text-xs font-bold text-slate-700">Spiel endet um</span>
                <input
                  type="time"
                  value={settings.endTime ?? ""}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      endTime: event.target.value || null,
                    }))
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900"
                />
              </label>
            )}

            <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-3.5">
              <span>
                <span className="block text-sm font-bold text-slate-900">Mit Halbzeit</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Aus = ohne Unterbrechung durchspielen.
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings.halftimeEnabled}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    halftimeEnabled: event.target.checked,
                  }))
                }
                className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-slate-950 focus:ring-slate-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-700">Alarmton</span>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <select
                  value={settings.alarmSound}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      alarmSound: event.target.value as GameTimerAlarmSound,
                    }))
                  }
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900"
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
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Ton testen
                </button>
              </div>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveSettings()}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Speichert…" : "Für dieses Training speichern"}
              </button>

              {usesOverride ? (
                <button
                  type="button"
                  onClick={() => void resetToClubDefault()}
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Club-Standard verwenden
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {message}
          </div>
        ) : null}

        <p className="mt-4 text-[11px] leading-5 text-slate-400">
          strikr hält den Bildschirm während der laufenden Uhr nach Möglichkeit wach. Für den Alarm Gerätelautstärke einschalten und die App geöffnet lassen.
        </p>
      </div>
    </section>
  );
}
