import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import { getServerI18n } from "@/lib/i18n/server";
import { translate, type MessageKey } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/config";

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
  primary_color: string | null;
};

type ClubSettingsCardProps = {
  saved?: boolean;
  error?: string;
  redirectTo?: string;
  submitLabel?: string;
  removeLogoRedirectTo?: string;
};

const COLOR_OPTIONS: Array<{ value: string; labelKey: MessageKey; color: string }> = [
  { value: "black", labelKey: "settings.club.colorBlack", color: "#020617" },
  { value: "blue", labelKey: "settings.club.colorBlue", color: "#1d4ed8" },
  { value: "red", labelKey: "settings.club.colorRed", color: "#dc2626" },
  { value: "green", labelKey: "settings.club.colorGreen", color: "#16a34a" },
];

function getErrorMessage(error: string | undefined, locale: AppLocale) {
  const keyByError: Record<string, MessageKey> = {
    unauthorized: "settings.club.errorUnauthorized",
    missing_club: "settings.club.errorMissing",
    invalid_file: "settings.club.errorInvalidFile",
    file_too_large: "settings.club.errorFileTooLarge",
    save_failed: "settings.club.errorSave",
    remove_failed: "settings.club.errorRemove",
    delete_confirmation: "settings.club.errorDeleteConfirm",
    delete_unauthorized: "settings.club.errorDeleteUnauthorized",
    delete_delete_failed: "settings.club.errorDeleteFailed",
  };
  const key = error ? keyByError[error] : undefined;
  return key ? translate(locale, key) : "";
}

export default async function ClubSettingsCard({
  saved = false,
  error = "",
  redirectTo = "/admin/settings",
  submitLabel,
  removeLogoRedirectTo,
}: ClubSettingsCardProps) {
  const { locale, t } = await getServerI18n();
  const { clubId, membership, isPowerUser } = await requireClub();

  const hasAdminAccess = canManageClub({
    isPowerUser,
    role: membership.role,
  });

  if (!hasAdminAccess) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const [{ data: clubData, error: clubError }, flags] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, display_name, logo_path, primary_color")
      .eq("id", clubId)
      .maybeSingle(),
    getFeatureFlagsForClub(clubId),
  ]);

  if (clubError) {
    throw new Error(clubError.message);
  }

  const club = (clubData as ClubRow | null) ?? null;

  if (!club) {
    redirect("/admin/settings?club_error=missing_club");
  }

  let logoUrl: string | null = null;

  if (club.logo_path) {
    const { data } = supabase.storage
      .from("club-logos")
      .getPublicUrl(club.logo_path);

    logoUrl = data.publicUrl;
  }

  const selectedColor = club.primary_color ?? "black";
  const previewColor =
    COLOR_OPTIONS.find((option) => option.value === selectedColor)?.color ??
    "#020617";

  const errorMessage = getErrorMessage(error, locale);
  const useNicknames = flags.use_nicknames ?? false;
  const canDeleteClub = membership.role === "admin";
  const clubLabel = club.display_name?.trim() || t("settings.club.clubFallback");
  const saveLabel = submitLabel ?? t("settings.club.save");

  return (
    <div className="space-y-5">
      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t("settings.club.saved")}
        </div>
      ) : null}

      <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
        <div className="mb-3 text-sm font-semibold text-slate-500">
          {t("settings.club.preview")}
        </div>

        <div
          className="rounded-2xl border border-slate-200 bg-white p-4"
          style={{ borderTop: `4px solid ${previewColor}` }}
        >
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm">
                <Image
                  src={logoUrl}
                  alt={club.display_name || t("settings.club.logoAlt")}
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
                {club.display_name?.trim() || t("settings.club.teamFallback")}
              </div>
              <div className="text-sm text-slate-500">{t("settings.club.headerPreview")}</div>
              <div className="mt-1 text-xs text-slate-500">
                {t("settings.club.playerNames")}{" "}
                <span className="font-semibold text-slate-700">
                  {useNicknames ? t("settings.club.nicknamesActive") : t("settings.club.fullNames")}
                </span>
              </div>
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
            htmlFor="display_name"
            className="block text-sm font-medium text-slate-900"
          >
            {t("settings.club.name")}
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            maxLength={80}
            defaultValue={club.display_name ?? ""}
            placeholder={t("settings.club.namePlaceholder")}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="logo"
            className="block text-sm font-medium text-slate-900"
          >
            {t("settings.club.logo")}
          </label>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
          />
          <p className="text-xs text-slate-500">
            {t("settings.club.logoHint")}
          </p>
        </div>

        <div className="space-y-2">
          <div className="block text-sm font-medium text-slate-900">
            {t("settings.club.color")}
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
                  defaultChecked={option.value === selectedColor}
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
            {t("settings.club.colorHint")}
          </p>
        </div>

        <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-500">
            {t("settings.club.generalDisplay")}
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
            <input
              type="checkbox"
              name="use_nicknames"
              value="1"
              defaultChecked={useNicknames}
              className="mt-1 h-4 w-4 rounded border-neutral-300"
            />
            <div>
              <div className="text-sm font-semibold text-slate-950">
                {t("settings.club.showNicknames")}
              </div>
              <div className="text-sm text-slate-600">
                {t("settings.club.showNicknamesHint")}
              </div>
            </div>
          </label>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {saveLabel}
        </button>
      </form>

      {club.logo_path ? (
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
            {t("settings.club.removeLogo")}
          </button>
        </form>
      ) : null}

      {canDeleteClub ? (
        <div
          id="club-delete"
          className="rounded-[24px] border border-rose-200 bg-rose-50/60 p-5"
        >
          <div className="inline-flex rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-bold text-rose-700">
            {t("settings.club.danger")}
          </div>

          <h3 className="mt-3 text-lg font-extrabold tracking-tight text-slate-950">
            {t("settings.club.delete")}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-700">
            {t("settings.club.deleteHint", { club: clubLabel })}
          </p>

          <form
            method="post"
            action="/api/admin/club/delete"
            className="mt-5 space-y-4"
          >
            <input type="hidden" name="redirect_to" value={redirectTo} />

            <div>
              <label
                htmlFor="club_delete_confirmation"
                className="block text-sm font-semibold text-slate-900"
              >
                {t("settings.club.deleteConfirmLabel")}
              </label>
              <input
                id="club_delete_confirmation"
                name="confirmation"
                type="text"
                autoComplete="off"
                className="mt-2 w-full rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-rose-500"
                placeholder={t("settings.club.deleteConfirmPhrase")}
              />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-white px-4 py-3">
              <input
                type="checkbox"
                name="acknowledgement"
                value="1"
                className="mt-1 h-4 w-4 rounded border-rose-300"
              />
              <span className="text-sm leading-6 text-rose-900">
                {t("settings.club.deleteAck")}
              </span>
            </label>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700"
            >
              {t("settings.club.delete")} · 14 Tage Papierkorb
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
