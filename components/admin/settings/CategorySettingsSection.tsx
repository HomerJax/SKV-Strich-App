import {
  addCategoryAction,
  updateCategoryAction,
} from "@/app/admin/settings/actions";
import { getServerI18n } from "@/lib/i18n/server";

type CategoryRow = {
  id: number;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  is_strong?: boolean;
};

type CategorySettingsSectionProps = {
  categories: CategoryRow[];
  useCategories: boolean;
  redirectTo?: string;
  saved?: boolean;
  error?: string;
  variant?: "default" | "onboarding";
};

export async function CategorySettingsSection({
  categories,
  useCategories,
  redirectTo = "/admin/settings",
  saved = false,
  error = "",
  variant = "default",
}: CategorySettingsSectionProps) {
  const { t } = await getServerI18n();
  const activeCategories = categories
    .filter((category) => category.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const activeCount = activeCategories.length;
  const strongCategory = activeCategories.find((category) => category.is_strong === true) ?? null;

  return (
    <div className="space-y-4">
      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t("categories.saved")}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${useCategories ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
          {useCategories ? t("categories.generatorActive") : t("categories.generatorOff")}
        </span>
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {t("categories.activeCount", { count: activeCount })}
        </span>
        {strongCategory ? (
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            {t("categories.stronger", { name: strongCategory.label })}
          </span>
        ) : null}
      </div>

      {variant === "onboarding" ? (
        <div className="rounded-[22px] border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-4 text-sm leading-6 text-slate-700">
          <div className="font-black text-slate-950">{t("categories.shortExplain")}</div>
          <p className="mt-1">
            {t("categories.shortExplainText")}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          <div className="font-bold">{t("categories.whichStronger")}</div>
          <p className="mt-1">
            {t("categories.whichStrongerText")}
          </p>
          <p className="mt-2 text-blue-900">
            {t("categories.onlyOneStrong")}
          </p>
        </div>
      )}

      <div className={variant === "onboarding" ? "rounded-[22px] border border-slate-200 bg-slate-50 p-3" : "rounded-xl border border-black/10 bg-neutral-50 p-3"}>
        <form action={addCategoryAction} className="flex gap-2">
          <input type="hidden" name="redirect_to" value={redirectTo} />
          <input
            name="label"
            required
            placeholder={t("categories.newPlaceholder")}
            className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
            {t("categories.add")}
          </button>
        </form>
      </div>

      {!categories.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          {t("categories.none")}
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <form
              key={category.id}
              action={updateCategoryAction}
              className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center ${
                category.is_strong === true
                  ? "border-amber-300 bg-amber-50"
                  : "border-black/10 bg-white"
              }`}
            >
              <input type="hidden" name="redirect_to" value={redirectTo} />
              <input type="hidden" name="id" value={category.id} />
              <input type="hidden" name="sort_order" value={category.sort_order} />

              <input
                name="label"
                defaultValue={category.label}
                required
                className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
              />

              <div className="flex shrink-0 flex-col gap-2 sm:min-w-48">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="is_active" defaultChecked={category.is_active} />
                  {t("categories.active")}
                </label>

                {category.is_active ? (
                  category.is_strong === true ? (
                    <span className="inline-flex w-fit rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-950">
                      {t("categories.strongCategory")}
                    </span>
                  ) : (
                    <button
                      type="submit"
                      name="make_strong"
                      value="1"
                      className="w-fit rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-50"
                    >
                      {t("categories.markStrong")}
                    </button>
                  )
                ) : (
                  <span className="text-xs font-semibold text-slate-500">{t("categories.notInGenerator")}</span>
                )}
              </div>

              <button type="submit" className="shrink-0 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-neutral-100">
                {t("categories.save")}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
