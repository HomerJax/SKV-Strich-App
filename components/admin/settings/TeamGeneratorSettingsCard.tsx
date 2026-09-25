import { getServerI18n } from "@/lib/i18n/server";
import { translate, type MessageKey } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/config";

type TeamGeneratorSettingsCardProps = {
  useStrength: boolean;
  useCategories: boolean;
  redirectTo?: string;
  submitLabel?: string;
  saved?: boolean;
  error?: string;
  variant?: "default" | "onboarding";
};

function getErrorMessage(error: string | undefined, locale: AppLocale) {
  switch (error) {
    case "nothing_to_save":
      return translate(locale, "teamGenerator.nothingToSave");
    case "unauthorized":
      return translate(locale, "teamGenerator.unauthorized");
    case "save_failed":
      return translate(locale, "teamGenerator.saveFailed");
    default:
      return error || "";
  }
}

export default async function TeamGeneratorSettingsCard({
  useStrength,
  useCategories,
  redirectTo = "/admin/settings",
  submitLabel = "Einstellungen speichern",
  saved = false,
  error = "",
  variant = "default",
}: TeamGeneratorSettingsCardProps) {
  const { locale, t } = await getServerI18n();
  const errorMessage = getErrorMessage(error, locale);

  return (
    <div className="space-y-5">
      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t("teamGenerator.saved")}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {variant === "onboarding" ? (
        <div className="rounded-[24px] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-4 sm:p-5">
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">
            {t("teamGenerator.autoTitle")}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200/70">
              <div className="text-sm font-black text-slate-950">{t("teamGenerator.equalSize")}</div>
              <div className="mt-1 text-xs font-medium leading-5 text-slate-500">{t("teamGenerator.equalSizeHint")}</div>
            </div>
            <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200/70">
              <div className="text-sm font-black text-slate-950">{t("teamGenerator.goalkeepers")}</div>
              <div className="mt-1 text-xs font-medium leading-5 text-slate-500">{t("teamGenerator.goalkeepersHint")}</div>
            </div>
            <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200/70">
              <div className="text-sm font-black text-slate-950">{t("teamGenerator.balance")}</div>
              <div className="mt-1 text-xs font-medium leading-5 text-slate-500">{t("teamGenerator.balanceHint")}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-500">{t("teamGenerator.shortExplain")}</div>
          <p className="text-sm leading-6 text-slate-700">
            {t("teamGenerator.shortExplainText")}
          </p>

          <details className="group mt-4 rounded-2xl border border-black/10 bg-white">
            <summary className="list-none cursor-pointer px-4 py-3 [&::-webkit-details-marker]:hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">{t("teamGenerator.adminExplain")}</div>
                <div className="rounded-full border border-black/10 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 transition group-open:rotate-180">⌄</div>
              </div>
            </summary>

            <div className="border-t border-black/10 px-4 py-4">
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <p><span className="font-semibold text-slate-900">{t("teamGenerator.whatHappens")}</span>{" "}{t("teamGenerator.whatHappensText")}</p>
                <p><span className="font-semibold text-slate-900">{t("teamGenerator.categoriesStrength")}</span>{" "}{t("teamGenerator.categoriesStrengthText")}</p>
                <p><span className="font-semibold text-slate-900">{t("teamGenerator.keepersPositions")}</span>{" "}{t("teamGenerator.keepersPositionsText")}</p>
                <p><span className="font-semibold text-slate-900">{t("teamGenerator.fineTune")}</span>{" "}{t("teamGenerator.fineTuneText")}</p>
              </div>
            </div>
          </details>
        </div>
      )}

      <form method="post" action="/api/admin/settings" className="space-y-4">
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <input type="hidden" name="settings_scope" value="team_generator" />

        <div className={variant === "onboarding" ? "space-y-3" : "rounded-[20px] border border-black/10 bg-neutral-50 p-4"}>
          <div className={variant === "onboarding" ? "text-xs font-black uppercase tracking-[.14em] text-slate-500" : "mb-3 text-sm font-semibold text-slate-500"}>
            {t("teamGenerator.balanceQuestion")}
          </div>
          <div className="space-y-3">
            <label className={variant === "onboarding" ? "flex cursor-pointer items-start gap-4 rounded-[22px] border border-violet-100 bg-violet-50/60 px-4 py-4 transition hover:border-violet-200" : "flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3"}>
              <input type="checkbox" name="use_strength" value="1" defaultChecked={useStrength} className="mt-1 h-5 w-5 rounded border-neutral-300 accent-slate-950" />
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                  {t("teamGenerator.individualStrength")}
                  {variant === "onboarding" ? <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-black text-white">{t("teamGenerator.recommended")}</span> : null}
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{t("teamGenerator.individualStrengthHint")}</div>
              </div>
            </label>

            <label className={variant === "onboarding" ? "flex cursor-pointer items-start gap-4 rounded-[22px] border border-cyan-100 bg-cyan-50/60 px-4 py-4 transition hover:border-cyan-200" : "flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3"}>
              <input type="checkbox" name="use_categories" value="1" defaultChecked={useCategories} className="mt-1 h-5 w-5 rounded border-neutral-300 accent-slate-950" />
              <div>
                <div className="text-sm font-black text-slate-950">{t("teamGenerator.categories")}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{t("teamGenerator.categoriesHint")}</div>
              </div>
            </label>
          </div>
        </div>

        <button type="submit" className={variant === "onboarding" ? "flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,23,42,.14)] transition hover:-translate-y-0.5 hover:bg-slate-900" : "inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"}>
          {submitLabel}
        </button>
      </form>
    </div>
  );
}
