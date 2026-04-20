"use client";

import { useMemo, useState } from "react";

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

const WEEKDAY_OPTIONS = [
  { value: "1", label: "Montag" },
  { value: "2", label: "Dienstag" },
  { value: "3", label: "Mittwoch" },
  { value: "4", label: "Donnerstag" },
  { value: "5", label: "Freitag" },
  { value: "6", label: "Samstag" },
  { value: "0", label: "Sonntag" },
] as const;

function formatSeasonDate(value: string | null) {
  if (!value) return "—";

  return new Date(`${value}T00:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getSessionTypeDescription(type: SessionType) {
  if (type === "event") {
    return "Für Spiel, Turnier oder Orga-Termin. Hier sammelst du Zu- und Absagen ohne Trainings-Flow.";
  }

  return "Voller STRIKR Flow mit Anwesenheit, Teams, Ergebnis, MVP und Sharing.";
}

export default function NewSessionForm({
  action,
  initialDate,
  seasons,
  enableSessionTypes = false,
}: NewSessionFormProps) {
  const [mode, setMode] = useState<CreateMode>("single");
  const [sessionType, setSessionType] = useState<SessionType>("training");

  const defaultSeasonId =
    seasons.length > 0 ? String(seasons[0].id) : "";

  const [seriesSeasonId, setSeriesSeasonId] = useState(defaultSeasonId);

  const selectedSeason = useMemo(
    () =>
      seasons.find((season) => String(season.id) === seriesSeasonId) ?? null,
    [seasons, seriesSeasonId]
  );

  const seriesMinStartDate = selectedSeason?.start_date ?? "";
  const seriesMaxStartDate = selectedSeason?.end_date ?? "";
  const seriesStartDefault = selectedSeason?.start_date ?? initialDate;
  const seriesEndDisplay = selectedSeason?.end_date ?? "";

  const notesLabel =
    sessionType === "event" ? "Worum geht’s?" : "Notiz";

  const notesPlaceholder =
    sessionType === "event"
      ? "z. B. Pokalspiel in Leonberg, Turnier in Calw oder Saisonabschluss"
      : "optional, z. B. Flutlicht oder Hallentraining";

  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
    >
      {enableSessionTypes ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-700">
            Terminart
          </legend>

          <label className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
            <input
              type="radio"
              name="type"
              value="training"
              checked={sessionType === "training"}
              onChange={() => setSessionType("training")}
              className="mt-1"
            />
            <div>
              <div className="font-semibold text-slate-900">Training</div>
              <div className="text-xs text-slate-500">
                Voller STRIKR Flow mit Teams, Ergebnis und MVP.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
            <input
              type="radio"
              name="type"
              value="event"
              checked={sessionType === "event"}
              onChange={() => setSessionType("event")}
              className="mt-1"
            />
            <div>
              <div className="font-semibold text-slate-900">Termin</div>
              <div className="text-xs text-slate-500">
                Für Spiel, Turnier oder Orga-Termin ohne Trainings-Stats.
              </div>
            </div>
          </label>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            {getSessionTypeDescription(sessionType)}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="type" value="training" />
      )}

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-slate-700">
          Modus
        </legend>

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <input
            type="radio"
            name="mode"
            value="single"
            checked={mode === "single"}
            onChange={() => setMode("single")}
          />
          Einzeltermin
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <input
            type="radio"
            name="mode"
            value="series"
            checked={mode === "series"}
            onChange={() => setMode("series")}
          />
          Serientermin
        </label>
      </fieldset>

      {mode === "single" ? (
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-900">
            Einzeltermin
          </div>

          <label className="block">
            <div className="mb-1 text-xs font-semibold text-slate-700">Datum</div>
            <input
              name="date"
              type="date"
              defaultValue={initialDate}
              required={mode === "single"}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
      ) : null}

      {mode === "series" ? (
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-900">
            Serientermin
          </div>

          {seasons.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Für Serientermine brauchst du zuerst eine Saison mit Start- und
              Enddatum.
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <div className="mb-1 text-xs font-semibold text-slate-700">
                  Saison
                </div>
                <select
                  name="series_season_id"
                  value={seriesSeasonId}
                  onChange={(event) => setSeriesSeasonId(event.target.value)}
                  required={mode === "series"}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Saisonzeitraum: {formatSeasonDate(selectedSeason?.start_date ?? null)} bis{" "}
                {formatSeasonDate(selectedSeason?.end_date ?? null)}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-1 text-xs font-semibold text-slate-700">
                    Startdatum der Serie
                  </div>
                  <input
                    key={`series-start-${seriesSeasonId}-${seriesStartDefault}`}
                    name="series_start_date"
                    type="date"
                    defaultValue={seriesStartDefault}
                    min={seriesMinStartDate}
                    max={seriesMaxStartDate}
                    required={mode === "series"}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <div className="mb-1 text-xs font-semibold text-slate-700">
                    Serienende
                  </div>
                  <input
                    type="text"
                    value={formatSeasonDate(seriesEndDisplay)}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-1 text-xs font-semibold text-slate-700">
                    Wochentag 1
                  </div>
                  <select
                    name="weekday_one"
                    defaultValue="4"
                    required={mode === "series"}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {WEEKDAY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="mb-1 text-xs font-semibold text-slate-700">
                    Wochentag 2 (optional)
                  </div>
                  <select
                    name="weekday_two"
                    defaultValue=""
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Kein zweiter Tag</option>
                    {WEEKDAY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="text-xs text-slate-500">
                Das Ende der Serie richtet sich automatisch nach der gewählten
                Saison. So vermeidest du falsche Datumsbereiche.
              </div>
            </div>
          )}
        </div>
      ) : null}

      <label className="block">
        <div className="mb-1 text-xs font-semibold text-slate-700">
          {notesLabel}
        </div>
        <input
          name="notes"
          placeholder={notesPlaceholder}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={mode === "series" && seasons.length === 0}
        className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {sessionType === "event" ? "Termin anlegen" : "Training anlegen"}
      </button>
    </form>
  );
}