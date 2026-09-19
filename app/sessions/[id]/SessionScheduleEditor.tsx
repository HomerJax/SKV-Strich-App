"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Scope = "single" | "future" | "series";

type Props = {
  sessionId: number;
  date: string;
  startTime: string | null;
  isSeries: boolean;
  compact?: boolean;
};

export default function SessionScheduleEditor({
  sessionId,
  date,
  startTime,
  isSeries,
  compact = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nextDate, setNextDate] = useState(date);
  const [nextTime, setNextTime] = useState((startTime ?? "").slice(0, 5));
  const [scope, setScope] = useState<Scope>("single");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNextDate(date);
    setNextTime((startTime ?? "").slice(0, 5));
  }, [date, startTime]);

  async function save() {
    if (!nextDate || !nextTime) {
      setError("Bitte Datum und Uhrzeit angeben.");
      return;
    }

    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      const response = await fetch(`/api/sessions/${sessionId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          date: nextDate,
          startTime: nextTime,
          scope: isSeries ? scope : "single",
        }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || "Änderung fehlgeschlagen.");
      setMessage(payload.message || "Termin aktualisiert.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Änderung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSeries(deleteScope: "future" | "series") {
    const label =
      deleteScope === "series"
        ? "wirklich die komplette Terminserie"
        : "diesen und alle folgenden Termine";
    if (!window.confirm(`Willst du ${label} löschen?\n\nDas kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const response = await fetch(`/api/sessions/${sessionId}/schedule`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ scope: deleteScope }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Löschen fehlgeschlagen.");
      router.push("/sessions");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-8 items-center rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/85 ring-1 ring-white/10 transition hover:bg-white/15"
      >
        {open ? "Termin bearbeiten schließen" : "✎ Termin bearbeiten"}
      </button>

      {open ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/55 p-3 backdrop-blur-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] font-semibold text-white/70">
              Datum
              <input
                type="date"
                value={nextDate}
                onChange={(event) => setNextDate(event.target.value)}
                disabled={busy}
                className="mt-1 block w-full rounded-xl border border-white/15 bg-white px-3 py-2 text-base text-slate-950"
              />
            </label>
            <label className="text-[11px] font-semibold text-white/70">
              Uhrzeit
              <input
                type="time"
                value={nextTime}
                onChange={(event) => setNextTime(event.target.value)}
                disabled={busy}
                className="mt-1 block w-full rounded-xl border border-white/15 bg-white px-3 py-2 text-base text-slate-950"
              />
            </label>
          </div>

          {isSeries ? (
            <label className="mt-3 block text-[11px] font-semibold text-white/70">
              Änderung anwenden auf
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value as Scope)}
                disabled={busy}
                className="mt-1 block w-full rounded-xl border border-white/15 bg-white px-3 py-2 text-sm text-slate-950"
              >
                <option value="single">Nur diesen Termin</option>
                <option value="future">Diesen + alle folgenden</option>
                <option value="series">Komplette Serie</option>
              </select>
            </label>
          ) : null}

          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-60"
          >
            {busy ? "Speichert..." : "Datum & Uhrzeit speichern"}
          </button>

          {isSeries ? (
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                Serie löschen
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteSeries("future")}
                  className="rounded-full bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-100 ring-1 ring-rose-300/20 disabled:opacity-60"
                >
                  Ab diesem Termin
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteSeries("series")}
                  className="rounded-full bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-100 ring-1 ring-rose-300/20 disabled:opacity-60"
                >
                  Ganze Serie
                </button>
              </div>
            </div>
          ) : null}

          {message ? (
            <div className="mt-2 text-xs font-semibold text-emerald-200">{message}</div>
          ) : null}
          {error ? (
            <div className="mt-2 text-xs font-semibold text-rose-200">{error}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
