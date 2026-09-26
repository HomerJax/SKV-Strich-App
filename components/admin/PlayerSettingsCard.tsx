import Link from "next/link";
import { getServerI18n } from "@/lib/i18n/server";

type PlayerSettingsCardProps = {
  useStrength: boolean;
  strengthDefault: number | null;
  useCategories: boolean;
  categoryCount: number;
  categoryLabels?: string[];
  strongCategoryLabel?: string | null;
  activePlayerCount?: number;
  missingCategoryCount?: number;
  missingPositionCount?: number;
  defaultStrengthCount?: number;
  balanceGroupCount?: number;
  className?: string;
};

function StatusCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs leading-5 text-slate-600">{hint}</div>
    </div>
  );
}

function ReadinessRow({
  label,
  count,
  okText,
  warningText,
}: {
  label: string;
  count: number;
  okText: string;
  warningText: string;
}) {
  const ok = count === 0;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-sm ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-amber-200 bg-amber-50 text-amber-950"
      }`}
    >
      <div>
        <div className="font-semibold">{label}</div>
        <div className="mt-0.5 text-xs opacity-80">
          {ok ? okText : warningText}
        </div>
      </div>
      <div className="shrink-0 text-base font-extrabold">{ok ? "✓" : count}</div>
    </div>
  );
}

export default async function PlayerSettingsCard({
  useStrength,
  strengthDefault,
  useCategories,
  categoryCount,
  categoryLabels = [],
  strongCategoryLabel = null,
  activePlayerCount = 0,
  missingCategoryCount = 0,
  missingPositionCount = 0,
  defaultStrengthCount = 0,
  balanceGroupCount = 0,
  className = "",
}: PlayerSettingsCardProps) {
  const { t } = await getServerI18n();
  const normalCategories = categoryLabels.filter(
    (label) => label !== strongCategoryLabel
  );

  return (
    <section
      className={`rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
            {t("playerSettings.eyebrow")}
          </div>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
            {t("playerSettings.title")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t("playerSettings.description")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/settings"
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {t("playerSettings.rules")}
          </Link>
          <Link
            href="/admin/settings"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t("playerSettings.categoriesSetup")}
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatusCard
          label={t("playerSettings.generatorPlayers")}
          value={String(activePlayerCount)}
          hint={t("playerSettings.generatorPlayersHint")}
        />
        <StatusCard
          label={t("playerSettings.categories")}
          value={useCategories ? t("playerSettings.activeCount", { count: categoryCount }) : t("playerSettings.off")}
          hint={
            useCategories
              ? t("playerSettings.categoriesActiveHint")
              : t("playerSettings.categoriesOffHint")
          }
        />
        <StatusCard
          label={t("playerSettings.strength")}
          value={useStrength ? t("playerSettings.active") : t("playerSettings.off")}
          hint={
            useStrength
              ? t("playerSettings.strengthActiveHint", { value: strengthDefault ?? 3 })
              : t("playerSettings.strengthOffHint")
          }
        />
      </div>

      {useCategories ? (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-bold text-blue-950">
            {t("playerSettings.categoryWeight")}
          </div>
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-white/80 px-3 py-2 text-blue-950 ring-1 ring-blue-100">
              <span className="font-bold">{t("playerSettings.strongCategory")}</span>{" "}
              {strongCategoryLabel ?? t("playerSettings.notSet")}
            </div>
            <div className="rounded-xl bg-white/80 px-3 py-2 text-blue-950 ring-1 ring-blue-100">
              <span className="font-bold">{t("playerSettings.normalLevel")}</span>{" "}
              {normalCategories.join(", ") || t("playerSettings.none")}
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-blue-900">
            {t("playerSettings.categoryWeightHint")}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {useCategories ? (
          <ReadinessRow
            label={t("playerSettings.categoryReady")}
            count={missingCategoryCount}
            okText={t("playerSettings.categoryReadyOk")}
            warningText={t("playerSettings.categoryReadyWarn", { count: missingCategoryCount })}
          />
        ) : null}

        <ReadinessRow
          label={t("playerSettings.positionReady")}
          count={missingPositionCount}
          okText={t("playerSettings.positionReadyOk")}
          warningText={t("playerSettings.positionReadyWarn", { count: missingPositionCount })}
        />

        {useStrength ? (
          <ReadinessRow
            label={t("playerSettings.strengthReady")}
            count={defaultStrengthCount}
            okText={t("playerSettings.strengthReadyOk")}
            warningText={t("playerSettings.strengthReadyWarn", { count: defaultStrengthCount, value: strengthDefault ?? 3 })}
          />
        ) : null}

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm text-violet-950">
          <div>
            <div className="font-semibold">{t("playerSettings.balanceGroups")}</div>
            <div className="mt-0.5 text-xs opacity-80">
              {t("playerSettings.balanceGroupsHint")}
            </div>
          </div>
          <div className="shrink-0 text-base font-extrabold">{balanceGroupCount}</div>
        </div>
      </div>

      <details className="group mt-5 rounded-2xl border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">
              {t("playerSettings.how")}
            </div>
            <div className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 transition group-open:rotate-180">
              ⌄
            </div>
          </div>
        </summary>

        <div className="border-t border-slate-200 px-4 py-4 text-sm leading-6 text-slate-600">
          <ol className="space-y-2">
            <li><strong className="text-slate-900">1.</strong>{" "}{t("playerSettings.step1")}</li>
            <li><strong className="text-slate-900">2.</strong>{" "}{t("playerSettings.step2")}</li>
            <li><strong className="text-slate-900">3.</strong>{" "}{t("playerSettings.step3")}</li>
            <li><strong className="text-slate-900">4.</strong>{" "}{t("playerSettings.step4")}</li>
            <li><strong className="text-slate-900">5.</strong>{" "}{t("playerSettings.step5")}</li>
            <li><strong className="text-slate-900">6.</strong>{" "}{t("playerSettings.step6")}</li>
          </ol>
        </div>
      </details>
    </section>
  );
}
