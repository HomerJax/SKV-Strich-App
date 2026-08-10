"use client";

import { useEffect, useState } from "react";

type PushPreferences = {
  trainingReminders: boolean;
  rsvpUpdates: boolean;
  results: boolean;
  badges: boolean;
  announcements: boolean;
};

const DEFAULT_PREFERENCES: PushPreferences = {
  trainingReminders: true,
  rsvpUpdates: true,
  results: true,
  badges: true,
  announcements: true,
};

const OPTIONS: Array<{
  key: keyof PushPreferences;
  label: string;
  description: string;
}> = [
  {
    key: "trainingReminders",
    label: "Trainingserinnerungen",
    description: "Erinnerungen vor einem anstehenden Training.",
  },
  {
    key: "rsvpUpdates",
    label: "Zusagen",
    description: "Mitteilung, wenn ein Teilnehmer zum Training zusagt.",
  },
  {
    key: "results",
    label: "Ergebnisse",
    description: "Mitteilung, sobald ein Training abgeschlossen und das Ergebnis eingetragen wurde.",
  },
  {
    key: "badges",
    label: "Badges",
    description: "Mitteilung, wenn jemand aus deinem Club einen Badge erhält.",
  },
  {
    key: "announcements",
    label: "strikr-Ankündigungen",
    description: "Wichtige Hinweise und Neuigkeiten rund um strikr.",
  },
];

export default function PushPreferencesForm() {
  const [preferences, setPreferences] = useState<PushPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/push/preferences", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? "Einstellungen konnten nicht geladen werden.");
        }

        if (!cancelled && payload?.preferences) {
          setPreferences(payload.preferences as PushPreferences);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Einstellungen konnten nicht geladen werden.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(key: keyof PushPreferences) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
    setMessage(null);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/push/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(preferences),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Einstellungen konnten nicht gespeichert werden.");
      }

      setMessage("Benachrichtigungseinstellungen gespeichert.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Einstellungen konnten nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Benachrichtigungen
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        Wähle, welche Push-Mitteilungen du von strikr erhalten möchtest.
      </p>

      <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {OPTIONS.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">
                {option.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {option.description}
              </span>
            </span>

            <input
              type="checkbox"
              checked={preferences[option.key]}
              disabled={loading || saving}
              onChange={() => toggle(option.key)}
              className="h-5 w-5 shrink-0 rounded border-slate-300 text-slate-950 focus:ring-slate-500"
            />
          </label>
        ))}
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void save()}
        disabled={loading || saving}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Lädt…" : saving ? "Speichert…" : "Einstellungen speichern"}
      </button>
    </section>
  );
}
