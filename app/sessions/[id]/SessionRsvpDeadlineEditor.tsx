"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  formatDeadlineForDisplay,
  getEffectiveRsvpDeadlineMinutes,
  getSessionDeadlineEpochMs,
} from "@/lib/session-rsvp-deadline";
import { updateSessionRsvpSettingsAction } from "./session-rsvp-settings-actions";

type Props = {
  sessionId: number;
  date: string;
  startTime: string | null;
  sessionOverrideMinutes: number | null;
  clubDefaultMinutes: number;
  isAdmin: boolean;
  isSeries?: boolean;
};

function startLabel(value: string | null) {
  return value ? `${value.slice(0, 5)} Uhr` : "keine Startzeit";
}

export default function SessionRsvpDeadlineEditor({
  sessionId,
  date,
  startTime,
  sessionOverrideMinutes,
  clubDefaultMinutes,
  isAdmin,
  isSeries = false,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [time, setTime] = useState(startTime?.slice(0, 5) ?? "");
  const [useClubDefault, setUseClubDefault] = useState(sessionOverrideMinutes == null);
  const [minutes, setMinutes] = useState(
    String(sessionOverrideMinutes ?? clubDefaultMinutes),
  );
  const [scope, setScope] = useState<"single" | "future" | "series">("single");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setTime(startTime?.slice(0, 5) ?? "");
      setUseClubDefault(sessionOverrideMinutes == null);
      setMinutes(String(sessionOverrideMinutes ?? clubDefaultMinutes));
    }
  }, [clubDefaultMinutes, editing, sessionOverrideMinutes, startTime]);

  const effectiveMinutes = getEffectiveRsvpDeadlineMinutes(
    sessionOverrideMinutes,
    clubDefaultMinutes,
  );
  const deadlineAt = useMemo(
    () =>
      getSessionDeadlineEpochMs({
        date,
        startTime,
        sessionOverrideMinutes,
        clubDefaultMinutes,
      }),
    [clubDefaultMinutes, date, sessionOverrideMinutes, startTime],
  );
  const deadlineLabel = formatDeadlineForDisplay(deadlineAt);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("sessionId", String(sessionId));
        formData.set("start_time", time);
        formData.set(
          "rsvp_deadline_minutes_before",
          useClubDefault ? "" : minutes,
        );
        formData.set("scope", isSeries ? scope : "single");
        await updateSessionRsvpSettingsAction(formData);
        setEditing(false);
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Einstellungen konnten nicht gespeichert werden.",
        );
      }
    });
  }

  if (editing && isAdmin) {
    return (
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/48">
          Trainingszeit & Anmeldeschluss
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-white/72">
            Trainingsbeginn
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none"
            />
          </label>

          <label className="text-xs font-semibold text-white/72">
            Anmeldeschluss
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={10080}
                step={15}
                value={minutes}
                disabled={useClubDefault}
                onChange={(event) => setMinutes(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none disabled:opacity-45"
              />
              <span className="text-[11px] text-white/50">Min. vorher</span>
            </div>
          </label>
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-white/70">
          <input
            type="checkbox"
            checked={useClubDefault}
            onChange={(event) => setUseClubDefault(event.target.checked)}
          />
          Club-Standard verwenden ({clubDefaultMinutes} Min. vorher)
        </label>

        {isSeries ? (
          <div className="mt-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/48">
              Änderung anwenden auf
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {[
                ["single", "Nur diesen Termin"],
                ["future", "Ab diesem Termin"],
                ["series", "Ganze Serie"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScope(value as "single" | "future" | "series")}
                  className={[
                    "rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition",
                    scope === value
                      ? "bg-white text-slate-950 ring-white"
                      : "bg-white/8 text-white/72 ring-white/10 hover:bg-white/12",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-full bg-white px-3.5 py-2 text-xs font-bold text-slate-950 disabled:opacity-60"
          >
            {pending ? "Speichert…" : "Speichern"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            disabled={pending}
            className="rounded-full bg-white/8 px-3.5 py-2 text-xs font-semibold text-white/74 ring-1 ring-white/10"
          >
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/68">
      <span className="rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/10">
        Start {startLabel(startTime)}
      </span>
      <span className="rounded-full bg-white/8 px-3 py-1.5 ring-1 ring-white/10">
        Anmeldeschluss {deadlineLabel ? `${deadlineLabel} Uhr` : "nicht verfügbar"}
      </span>
      <span className="text-white/38">
        {effectiveMinutes} Min. vorher{sessionOverrideMinutes == null ? " · Club-Standard" : ""}
      </span>
      {isAdmin ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-white/70 ring-1 ring-white/10"
        >
          Ändern
        </button>
      ) : null}
    </div>
  );
}
