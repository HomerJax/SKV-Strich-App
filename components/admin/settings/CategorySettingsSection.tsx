import {
  addCategoryAction,
  updateCategoryAction,
} from "@/app/admin/settings/actions";

type CategoryRow = {
  id: number;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  is_strong: boolean;
};

type CategorySettingsSectionProps = {
  categories: CategoryRow[];
  useCategories: boolean;
  redirectTo?: string;
  saved?: boolean;
  error?: string;
};

export function CategorySettingsSection({
  categories,
  useCategories,
  redirectTo = "/admin/settings",
  saved = false,
  error = "",
}: CategorySettingsSectionProps) {
  const activeCategories = categories
    .filter((category) => category.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const activeCount = activeCategories.length;
  const strongCategory = activeCategories.find((category) => category.is_strong) ?? null;

  return (
    <div className="space-y-4">
      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Kategorie gespeichert.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${useCategories ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
          {useCategories ? "Im Generator aktiv" : "Im Generator aktuell aus"}
        </span>
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {activeCount} aktiv
        </span>
        {strongCategory ? (
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            Stärker: {strongCategory.label}
          </span>
        ) : null}
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
        <div className="font-bold">Welche Kategorie ist stärker?</div>
        <p className="mt-1">
          Die Reihenfolge ist künftig egal. Markiere bei den aktiven Kategorien einfach die sportlich stärkere Kategorie. Der Generator bewertet diese höher und nutzt die individuelle Stärke 1–5 anschließend zur Feinabstimmung.
        </p>
        <p className="mt-2 text-blue-900">
          Pro Club kann genau eine aktive Kategorie als stärker markiert sein. Wenn Kategorien bei euch keine sportliche Stärke ausdrücken, kannst du die Kategorien im Teamgenerator komplett deaktivieren.
        </p>
      </div>

      <div className="rounded-xl border border-black/10 bg-neutral-50 p-3">
        <form action={addCategoryAction} className="flex gap-2">
          <input type="hidden" name="redirect_to" value={redirectTo} />
          <input
            name="label"
            required
            placeholder="Neue Kategorie, z. B. AH"
            className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
            Hinzufügen
          </button>
        </form>
      </div>

      {!categories.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Noch keine Kategorien vorhanden.
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <form
              key={category.id}
              action={updateCategoryAction}
              className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center ${
                category.is_strong
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
                  Aktiv
                </label>

                {category.is_active ? (
                  category.is_strong ? (
                    <span className="inline-flex w-fit rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-950">
                      ★ Stärkere Kategorie
                    </span>
                  ) : (
                    <button
                      type="submit"
                      name="make_strong"
                      value="1"
                      className="w-fit rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-50"
                    >
                      Als stärker markieren
                    </button>
                  )
                ) : (
                  <span className="text-xs font-semibold text-slate-500">Nicht im Generator</span>
                )}
              </div>

              <button type="submit" className="shrink-0 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-neutral-100">
                Speichern
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
