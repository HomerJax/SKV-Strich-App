import TeamGeneratorOnboardingFields, { TeamGeneratorOnboardingHero } from "@/components/club-setup/TeamGeneratorOnboardingFields";
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
  submitLabel,
  saved = false,
  error = "",
  variant = "default",
}: TeamGeneratorSettingsCardProps) {
  const { locale, t } = await getServerI18n();
  const errorMessage = getErrorMessage(error, locale);
  const resolvedSubmitLabel = submitLabel ?? t("teamGenerator.save");

  return (
    <div className="space-y-3">
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
        <div className="mb-4"><TeamGeneratorOnboardingHero /></div>
      ) : null}

      {variant === "onboarding" ? (
        <div className="rounded-[22px] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-4 sm:p-5">
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">SO FUNKTIONIERT DIE FAIRE EINTEILUNG</div>
          <p className="mt-2 text-xs leading-5 text-slate-600">Das berücksichtigt strikr automatisch. Die folgenden Punkte sind nur eine Erklärung – hier musst du nichts auswählen.</p>
          <div className="mt-4 divide-y divide-slate-200/80 rounded-2xl border border-slate-200/80 bg-white/70 px-4">
            {[
              { title: t("teamGenerator.equalSize"), hint: t("teamGenerator.equalSizeHint") },
              { title: t("teamGenerator.goalkeepers"), hint: t("teamGenerator.goalkeepersHint") },
              { title: t("teamGenerator.balance"), hint: t("teamGenerator.balanceHint") },
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-3 py-3">
                <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs font-black text-cyan-800">{index + 1}</span>
                <div><div className="text-sm font-black text-slate-950">{item.title}</div><p className="mt-0.5 text-xs leading-5 text-slate-500">{item.hint}</p></div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-700">Deine Einstellungen wählst du im nächsten Bereich aus.</p>
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

        {variant === "onboarding" ? (
          <TeamGeneratorOnboardingFields useStrength={useStrength} useCategories={useCategories} />
        ) : (
        <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
          <div className={"mb-3 text-sm font-semibold text-slate-500"}>
            {t("teamGenerator.balanceQuestion")}
          </div>
          <div className="space-y-3">
            <label className={"flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3"}>
              <input type="checkbox" name="use_strength" value="1" defaultChecked={useStrength} className="mt-1 h-5 w-5 rounded border-neutral-300 accent-slate-950" />
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                  {t("teamGenerator.individualStrength")}
                  {false ? <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-black text-white">{t("teamGenerator.recommended")}</span> : null}
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{t("teamGenerator.individualStrengthHint")}</div>
              </div>
            </label>

            <label className={"flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3"}>
              <input type="checkbox" name="use_categories" value="1" defaultChecked={useCategories} className="mt-1 h-5 w-5 rounded border-neutral-300 accent-slate-950" />
              <div>
                <div className="text-sm font-black text-slate-950">{t("teamGenerator.categories")}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{t("teamGenerator.categoriesHint")}</div>
              </div>
            </label>
          </div>
        </div>

        )}

        <button type="submit" className={variant === "onboarding" ? "flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,23,42,.14)] transition hover:-translate-y-0.5 hover:bg-slate-900" : "inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"}>
          {resolvedSubmitLabel}
        </button>
      </form>
    </div>
  );
}
