"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";

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
  variant?: "default" | "onboarding";
};

const COLOR_OPTIONS: Array<{ value: string; labelKey: MessageKey; color: string }> = [
  { value: "black", labelKey: "clubSetup.colorBlack", color: "#020617" },
  { value: "blue", labelKey: "clubSetup.colorBlue", color: "#1d4ed8" },
  { value: "red", labelKey: "clubSetup.colorRed", color: "#dc2626" },
  { value: "green", labelKey: "clubSetup.colorGreen", color: "#16a34a" },
];

const SPORT_OPTIONS: Array<{
  value: SportType;
  labelKey: MessageKey;
  descriptionKey: MessageKey;
}> = [
  { value: "football", labelKey: "clubSetup.sportFootball", descriptionKey: "clubSetup.sportFootballHint" },
  { value: "handball", labelKey: "clubSetup.sportHandball", descriptionKey: "clubSetup.sportHandballHint" },
  { value: "basketball", labelKey: "clubSetup.sportBasketball", descriptionKey: "clubSetup.sportBasketballHint" },
  { value: "volleyball", labelKey: "clubSetup.sportVolleyball", descriptionKey: "clubSetup.sportVolleyballHint" },
  { value: "ice_hockey", labelKey: "clubSetup.sportIceHockey", descriptionKey: "clubSetup.sportIceHockeyHint" },
  { value: "tennis", labelKey: "clubSetup.sportTennis", descriptionKey: "clubSetup.sportTennisHint" },
  { value: "padel", labelKey: "clubSetup.sportPadel", descriptionKey: "clubSetup.sportPadelHint" },
  { value: "other", labelKey: "clubSetup.sportOther", descriptionKey: "clubSetup.sportOtherHint" },
];

function getErrorMessage(
  error: string | undefined,
  t: (key: MessageKey) => string,
) {
  switch (error) {
    case "unauthorized": return t("clubSetup.unauthorized");
    case "missing_club": return t("clubSetup.missingClub");
    case "invalid_file": return t("clubSetup.invalidFile");
    case "file_too_large": return t("clubSetup.fileTooLarge");
    case "save_failed": return t("clubSetup.saveFailed");
    case "remove_failed": return t("clubSetup.removeFailed");
    default: return "";
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
  variant = "default",
}: ClubSetupClubStepProps) {
  const { t } = useI18n();
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
  const errorMessage = getErrorMessage(error, t);

  const playerNameModeLabel = useMemo(
    () => (nicknameMode ? t("clubSetup.nicknamesActive") : t("clubSetup.fullName")),
    [nicknameMode, t]
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
          {t("clubSetup.saved")}
        </div>
      ) : null}

      <div className={variant === "onboarding" ? "rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:p-5" : "rounded-[20px] border border-black/10 bg-neutral-50 p-4"}>
        <div className={variant === "onboarding" ? "mb-3 text-[10px] font-black uppercase tracking-[.16em] text-slate-500" : "mb-3 text-sm font-semibold text-slate-500"}>
          {t("clubSetup.livePreview")}
        </div>

        <div
          className={variant === "onboarding" ? "relative overflow-hidden rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm" : "rounded-2xl border border-slate-200 bg-white p-4"}
          style={{ borderTop: `4px solid ${previewColor}` }}
        >
          <div className="flex items-center gap-3">
            {previewLogoUrl ? (
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm">
                <Image
                  src={previewLogoUrl}
                  alt={displayName || t("clubSetup.clubLogo")}
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
                {displayName.trim() || t("home.yourTeam")}
              </div>
              <div className="text-sm text-slate-500">
                {t("clubSetup.clubInStrikr", { sport: t(selectedSport.labelKey) })}
              </div>
              {variant === "default" ? (
                <div className="mt-1 text-xs text-slate-500">
                  {t("clubSetup.playerNames")}{" "}
                  <span className="font-semibold text-slate-700">
                    {playerNameModeLabel}
                  </span>
                </div>
              ) : null}
              {selectedFileName ? (
                <div className="mt-2 text-xs font-medium text-emerald-700">
                  {t("clubSetup.selectedFile", { file: selectedFileName })}
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
            className={variant === "onboarding" ? "block text-xs font-black uppercase tracking-[.12em] text-slate-500" : "block text-sm font-medium text-slate-900"}
          >
            {t("clubSetup.sport")}
          </label>

          <select
            id="sport_type"
            name="sport_type"
            value={sportType}
            onChange={(event) =>
              setSportType(normalizeSportType(event.target.value))
            }
            className={variant === "onboarding" ? "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold text-slate-950 outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100" : "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-900"}
          >
            {SPORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>

          <p className="text-xs leading-5 text-slate-500">
            {t(selectedSport.descriptionKey)}
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="display_name"
            className={variant === "onboarding" ? "block text-xs font-black uppercase tracking-[.12em] text-slate-500" : "block text-sm font-medium text-slate-900"}
          >
            {t("clubSetup.teamName")}
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            maxLength={80}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={t("clubSetup.teamNamePlaceholder")}
            className={variant === "onboarding" ? "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100" : "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900"}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="logo"
            className={variant === "onboarding" ? "block text-xs font-black uppercase tracking-[.12em] text-slate-500" : "block text-sm font-medium text-slate-900"}
          >
            {t("clubSetup.clubLogoOptional")}
          </label>

          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className={variant === "onboarding" ? "block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-2 text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2.5 file:text-sm file:font-black file:text-white hover:file:bg-slate-800" : "block w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"}
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
            {t("clubSetup.allowedFiles")}
          </p>
        </div>

        <div className="space-y-2">
          <div className={variant === "onboarding" ? "block text-xs font-black uppercase tracking-[.12em] text-slate-500" : "block text-sm font-medium text-slate-900"}>
            {t("clubSetup.clubColor")}
          </div>

          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={variant === "onboarding" ? `flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-bold transition ${primaryColor === option.value ? "border-slate-950 bg-slate-950 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}` : "flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-900 transition hover:border-slate-900/20"}
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
                <span>{t(option.labelKey)}</span>
              </label>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            {t("clubSetup.clubColorHint")}
          </p>
        </div>

        {variant === "onboarding" ? (
          <details className="rounded-[20px] border border-slate-200 bg-slate-50">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-600 [&::-webkit-details-marker]:hidden">
              {t("clubSetup.optionalDisplay")}
            </summary>
            <div className="border-t border-slate-200 p-3">
              <label className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                <input
                  type="checkbox"
                  name="use_nicknames"
                  value="1"
                  checked={nicknameMode}
                  onChange={(event) => setNicknameMode(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-neutral-300"
                />
                <div>
                  <div className="text-sm font-bold text-slate-950">{t("clubSetup.showNicknames")}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{t("clubSetup.nicknamesLater")}</div>
                </div>
              </label>
            </div>
          </details>
        ) : (
          <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-500">{t("clubSetup.generalDisplay")}</div>
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
                <div className="text-sm font-semibold text-slate-950">{t("clubSetup.showNicknames")}</div>
                <div className="text-sm text-slate-600">{t("clubSetup.nicknamesHint")}</div>
              </div>
            </label>
          </div>
        )}

        <button
          type="submit"
          className={variant === "onboarding" ? "flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,23,42,.14)] transition hover:-translate-y-0.5 hover:bg-slate-900" : "inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"}
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
            {t("clubSetup.removeLogo")}
          </button>
        </form>
      ) : null}
    </div>
  );
}