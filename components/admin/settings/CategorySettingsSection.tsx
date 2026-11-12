import { Users, ShieldCheck, Plus, Check } from "lucide-react";
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
  isPro?: boolean;
};

export async function CategorySettingsSection({
  categories,
  useCategories,
  redirectTo = "/admin/settings",
  saved = false,
  error = "",
  variant = "default",
  isPro = false,
}: CategorySettingsSectionProps) {
  const { t, locale } = await getServerI18n();
  const activeCategories = categories
    .filter((category) => category.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const activeCount = activeCategories.length;
  const strongCategory = activeCategories.find((category) => category.is_strong === true) ?? null;

  if (variant === "onboarding") {
    const de = locale === "de";
    const copy = (german: string, english: string) => de ? german : english;
    return (
      <div className="min-w-0 space-y-5">
        {saved ? <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{t("categories.saved")}</p> : null}
        {error ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

        <section className="min-w-0 overflow-hidden rounded-[24px] border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-4 sm:p-6">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-cyan-800"><Users className="h-4 w-4" />{copy("Einfach erklärt", "How it works")}</div>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{copy("Spieler sinnvoll in Gruppen einteilen", "Organize players into useful groups")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{copy("Kategorien sind Gruppen für eure Spieler – zum Beispiel „Erfahren“ und „Einsteiger“. Du ordnest die Spieler später einer Kategorie zu. Wenn du Kategorien im Teamgenerator aktivierst, kann strikr diese Gruppen bei der Teameinteilung berücksichtigen.", "Categories are groups for your players, such as “Experienced” and “Beginner”. You assign players to a group later. When enabled in the team generator, strikr can consider these groups when balancing teams.")}</p>

          <div className="mt-5 min-w-0 rounded-[22px] border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-black uppercase tracking-wider text-slate-700">{copy("Beispiel: Acht Spieler, zwei Teams", "Example: eight players, two teams")}</div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{copy("Nur zur Erklärung", "Illustration only")}</span>
            </div>
            <div className="mt-3 grid min-w-0 grid-cols-2 gap-2.5">
              {[
                { title: "TEAM A", border: "border-cyan-200", bg: "bg-cyan-50", dot: "bg-cyan-500" },
                { title: "TEAM B", border: "border-violet-200", bg: "bg-violet-50", dot: "bg-violet-500" }
              ].map((team) => (
                <div key={team.title} className={`min-w-0 rounded-2xl border ${team.border} ${team.bg} p-3`}>
                  <div className="flex items-center gap-2 text-xs font-black text-slate-950"><span className={`h-2 w-2 rounded-full ${team.dot}`}/>{team.title}</div>
                  <div className="mt-3 space-y-2 text-xs font-semibold text-slate-800">
                    <div className="rounded-lg bg-white/90 px-2 py-2">{copy("2 Erfahrene", "2 experienced")}</div>
                    <div className="rounded-lg bg-white/90 px-2 py-2">{copy("2 Einsteiger", "2 beginners")}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-emerald-800"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{copy("Statt alle Erfahrenen in ein Team zu stecken, werden die Gruppen möglichst ausgeglichen verteilt.", "Instead of putting every experienced player on one side, the groups are distributed as evenly as possible.")}</p>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">{copy("Du brauchst keine Kategorien? Kein Problem. Dieser Schritt ist optional und lässt sich später jederzeit nachholen.", "Don't need categories? No problem. This step is optional, and you can set it up later.")}</p>
        </section>

        <section className="min-w-0 space-y-3">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-950">{copy("Eure Kategorien festlegen", "Set up your categories")}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{copy("Vergib Namen, die für eure Gruppe verständlich sind. Die Namen kannst du später ändern.", "Choose names your group will understand. You can change them later.")}</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            <form action={addCategoryAction} className="min-w-0 space-y-3">
              <input type="hidden" name="redirect_to" value={redirectTo}/>
              <label htmlFor="onboarding-category-name" className="block text-sm font-black text-slate-900">{copy("Neue Kategorie", "New category")}</label>
              <input id="onboarding-category-name" name="label" maxLength={60} required placeholder={copy("z. B. Erfahren", "e.g. Experienced")} className="block w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-950 outline-none focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"/>
              <p className="text-xs leading-5 text-slate-500">{copy("Beispielnamen: Erfahren / Einsteiger oder AH / Ü32. Du kannst auch nur eine Kategorie anlegen.", "Example names: Experienced / Beginner or Seniors / Over 32. You can start with just one category.")}</p>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"><Plus className="h-4 w-4"/>{copy("Kategorie hinzufügen", "Add category")}</button>
            </form>
          </div>

          {categories.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-black text-slate-900">{copy("Eure Kategorien", "Your categories")} <span className="font-medium text-slate-500">({activeCount} {copy("aktiv", "active")})</span></p>
              {categories.map((category) => (
                <form key={category.id} action={updateCategoryAction} className="min-w-0 space-y-3 rounded-[22px] border border-slate-200 bg-white p-4">
                  <input type="hidden" name="redirect_to" value={redirectTo}/>
                  <input type="hidden" name="id" value={category.id}/>
                  <input type="hidden" name="sort_order" value={category.sort_order}/>
                  <label className="block min-w-0 text-xs font-black uppercase tracking-wider text-slate-500">{copy("Kategoriename", "Category name")}
                    <input name="label" required defaultValue={category.label} className="mt-1.5 block w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base font-bold text-slate-950"/>
                  </label>
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input type="checkbox" name="is_active" defaultChecked={category.is_active} disabled={!isPro && !category.is_active && activeCount >= 2} className="h-4 w-4 accent-cyan-700" />{copy("Aktiv verwenden", "Use category")}
                    </label>
                    {category.is_active ? category.is_strong ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-900"><Check className="h-3 w-3"/>{copy("Stärkere Gruppe", "Stronger group")}</span> : <button type="submit" name="make_strong" value="1" className="rounded-xl border border-amber-300 px-3 py-2 text-xs font-bold text-amber-900">{copy("Als stärkere Gruppe markieren", "Mark as stronger group")}</button> : null}
                  </div>
                  <button type="submit" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm font-black text-slate-900">{copy("Änderungen speichern", "Save changes")}</button>
                </form>
              ))}
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">{copy("Eine aktive Kategorie kann als stärkere Gruppe markiert werden. Damit versteht strikr, welche Gruppe bei der Teameinteilung höher gewichtet werden soll. Das ersetzt keine individuellen Spielstärken.", "One active category can be marked as the stronger group. This tells strikr which group to weigh more highly when balancing teams. It does not replace individual player strengths.")}</p>
            </div>
          ) : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">{copy("Noch keine Kategorien angelegt. Wenn ihr keine benötigt, könnt ihr einfach mit dem Spielmodus weitermachen.", "No categories yet. If you don't need any, simply continue to game mode.")}</div>}

          <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs leading-5 text-violet-950">{isPro ? copy("PRO aktiv: Ihr könnt zusätzliche Kategorien verwenden.", "PRO active: You can use extra categories.") : copy("Free: Bis zu zwei aktive Kategorien. Mehr Kategorien gibt es mit PRO.", "Free: Up to two active categories. More are available with PRO.")} {copy("Spieler ordnet ihr später in der Spielerverwaltung zu.", "You assign players in player management later.")}</div>
          {!useCategories ? <p className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-xs leading-5 text-cyan-950">{copy("Hinweis: Damit der Teamgenerator diese Gruppen nutzt, aktiviere im vorherigen Schritt „Kategorien verwenden“.", "Note: To let the team generator use these groups, enable “Use categories” in the previous step.")}</p> : null}
        </section>
      </div>
    );
  }

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
        {!isPro ? (
          <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">2 aktive Kategorien Free · weitere 🔒 PRO</span>
        ) : null}
        {strongCategory ? (
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            {t("categories.stronger", { name: strongCategory.label })}
          </span>
        ) : null}
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
        <div className="font-bold">{t("categories.whichStronger")}</div>
        <p className="mt-1">{t("categories.whichStrongerText")}</p>
        <p className="mt-2 text-blue-900">{t("categories.onlyOneStrong")}</p>
      </div>

      <div className="rounded-xl border border-black/10 bg-neutral-50 p-3">
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
              className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${
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
                  <input type="checkbox" name="is_active" defaultChecked={category.is_active} disabled={!isPro && !category.is_active && activeCount >= 2} />
                  {t("categories.active")}{!isPro && !category.is_active && activeCount >= 2 ? " · 🔒 PRO" : ""}
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
