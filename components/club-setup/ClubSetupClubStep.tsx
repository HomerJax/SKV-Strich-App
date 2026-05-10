"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type SportType =
  | "football"
  | "handball"
  | "basketball"
  | "volleyball"
  | "ice_hockey"
  | "tennis"
  | "padel"
  | "other";

type ClubSetupClubStepProps = {
  saved?: boolean;
  error?: string;
  redirectTo: string;
  submitLabel?: string;
  removeLogoRedirectTo?: string;
  initialDisplayName: string;
  initialPrimaryColor: string;
  initialSportType: SportType | string | null;
  initialLogoUrl: string | null;
  useNicknames: boolean;
};

const COLOR_OPTIONS = [
  { value: "black", label: "Schwarz", color: "#020617" },
  { value: "blue", label: "Blau", color: "#1d4ed8" },
  { value: "red", label: "Rot", color: "#dc2626" },
  { value: "green", label: "Grün", color: "#16a34a" },
] as const;

const SPORT_OPTIONS: Array<{
  value: SportType;
  label: string;
  description: string;
}> = [
  {
    value: "football",
    label: "Fußball",
    description: "Trainings, Teams, Ergebnisse und MVPs für Fußballteams.",
  },
  {
    value: "handball",
    label: "Handball",
    description: "Für Hallen- und Feldteams mit Trainings-Flow.",
  },
  {
    value: "basketball",
    label: "Basketball",
    description: "Für schnelle Trainingsgruppen und faire Teams.",
  },
  {
    value: "volleyball",
    label: "Volleyball",
    description: "Für Teams, Trainingsabende und interne Spielrunden.",
  },
  {
    value: "ice_hockey",
    label: "Eishockey",
    description: "Für Eis- und Inline-Teams.",
  },
  {
    value: "tennis",
    label: "Tennis",
    description: "Für Trainingsgruppen, Doppel und interne Runden.",
  },
  {
    value: "padel",
    label: "Padel",
    description: "Für Padel-Gruppen, Doppel und regelmäßige Sessions.",
  },
  {
    value: "other",
    label: "Andere Sportart",
    description: "Für alle Teams, die strikr flexibel nutzen möchten.",
  },
];

function getErrorMessage(error?: string) {
  switch (error) {
    case "unauthorized":
      return "Du hast keinen Zugriff auf diesen Bereich.";
    case "missing_club":
      return "Es konnte kein Club gefunden werden.";
    case "invalid_file":
      return "Bitte lade nur PNG, JPG, JPEG oder WEBP hoch.";
    case "file_too_large":
      return "Die Datei ist zu groß. Maximal 2 MB sind erlaubt.";
    case "save_failed":
      return "Die Änderungen konnten nicht gespeichert werden.";
    case "remove_failed":
      return "Das Logo konnte nicht entfernt werden.";
    default:
      return "";
  }
}

function normalizeSportType(value: SportType | string | null): SportType {
  return SPORT_OPTIONS.some((option) => option.value === value)
    ? (value as SportType)
    : "football";
}

export default function ClubSetupClubStep({
  saved = false,
  error = "",
  redirectTo,
  submitLabel = "Weiter",
  removeLogoRedirectTo,
  initialDisplayName,
  initialPrimaryColor,
  initialSportType,
  initialLogoUrl,
  useNicknames,
}: ClubSetupClubStepProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [primaryColor, setPrimaryColor] = useState(
    initialPrimaryColor || "black"
  );
  const [sportType, setSportType] = useState<SportType>(
    normalizeSportType(initialSportType)
  );
  const [nicknameMode, setNicknameMode] = useState(useNicknames);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(
    null
  );

  const previewColor =
    COLOR_OPTIONS.find((option) => option.value === primaryColor)?.color ??
    "#020617";

  const selectedSport =
    SPORT_OPTIONS.find((option) => option.value === sportType) ??
    SPORT_OPTIONS[0];

  const previewLogoUrl = selectedPreviewUrl ?? initialLogoUrl ?? null;
  const errorMessage = getErrorMessage(error);

  const playerNameModeLabel = useMemo(
    () => (nicknameMode ? "Spitznamen aktiv" : "Vor- und Nachname"),
    [nicknameMode]
  );

  return (
    <div className="space-y-5">
      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Änderungen gespeichert.
        </div>
      ) : null}

      <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
        <div className="mb-3 text-sm font-semibold text-slate-500">
          Vorschau
        </div>

        <div
          className="rounded-2xl border border-slate-200 bg-white p-4"
          style={{ borderTop: `4px solid ${previewColor}` }}
        >
          <div className="flex items-center gap-3">
            {previewLogoUrl ? (
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm">
                <Image
                  src={previewLogoUrl}
                  alt={displayName || "Clublogo"}
                  width={80}
                  height={80}
                  unoptimized
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white text-xs font-semibold text-neutral-400">
                Logo
              </div>
            )}

            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-slate-950">
                {displayName.trim() || "Dein Team"}
              </div>
              <div className="text-sm text-slate-500">
                {selectedSport.label} · Anzeige im Header
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Spielernamen:{" "}
                <span className="font-semibold text-slate-700">
                  {playerNameModeLabel}
                </span>
              </div>
              {selectedFileName ? (
                <div className="mt-2 text-xs font-medium text-emerald-700">
                  Ausgewählt: {selectedFileName}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <form
        method="post"
        action="/api/admin/club"
        encType="multipart/form-data"
        className="space-y-5"
      >
        <input type="hidden" name="redirect_to" value={redirectTo} />

        <div className="space-y-2">
          <label
            htmlFor="sport_type"
            className="block text-sm font-medium text-slate-900"
          >
            Sportart
          </label>

          <select
            id="sport_type"
            name="sport_type"
            value={sportType}
            onChange={(event) =>
              setSportType(normalizeSportType(event.target.value))
            }
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-900"
          >
            {SPORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <p className="text-xs leading-5 text-slate-500">
            {selectedSport.description}
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="display_name"
            className="block text-sm font-medium text-slate-900"
          >
            Vereinsname
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            maxLength={80}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="z. B. SKV Rutesheim"
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="logo"
            className="block text-sm font-medium text-slate-900"
          >
            Vereinslogo
          </label>

          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;

              if (!file) {
                setSelectedFileName("");
                setSelectedPreviewUrl(null);
                return;
              }

              setSelectedFileName(file.name);
              setSelectedPreviewUrl(URL.createObjectURL(file));
            }}
          />

          <p className="text-xs text-slate-500">
            Erlaubt: PNG, JPG, JPEG, WEBP · maximal 2 MB
          </p>
        </div>

        <div className="space-y-2">
          <div className="block text-sm font-medium text-slate-900">
            Vereinsfarbe
          </div>

          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-900 transition hover:border-slate-900/20"
              >
                <input
                  type="radio"
                  name="primary_color"
                  value={option.value}
                  checked={primaryColor === option.value}
                  onChange={() => setPrimaryColor(option.value)}
                />
                <span
                  className="h-4 w-4 rounded-full border border-black/10"
                  style={{ backgroundColor: option.color }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            Die Farbe wird als dezenter Akzent für euren Club in der App genutzt.
          </p>
        </div>

        <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-500">
            Allgemeine Anzeige
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
            <input
              type="checkbox"
              name="use_nicknames"
              value="1"
              checked={nicknameMode}
              onChange={(event) => setNicknameMode(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-neutral-300"
            />
            <div>
              <div className="text-sm font-semibold text-slate-950">
                Spitznamen anzeigen
              </div>
              <div className="text-sm text-slate-600">
                Wenn aktiv, werden Spieler in Sessions, Teams, Stats und weiteren
                Ansichten bevorzugt mit ihrem Spitznamen angezeigt.
              </div>
            </div>
          </label>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {submitLabel}
        </button>
      </form>

      {initialLogoUrl ? (
        <form method="post" action="/api/admin/club">
          <input
            type="hidden"
            name="redirect_to"
            value={removeLogoRedirectTo ?? redirectTo}
          />
          <input type="hidden" name="remove_logo" value="1" />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Logo entfernen
          </button>
        </form>
      ) : null}
    </div>
  );
}