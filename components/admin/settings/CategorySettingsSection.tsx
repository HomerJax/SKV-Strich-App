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
  const activeCount = categories.filter((category) => category.is_active).length;

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
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            useCategories
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {useCategories ? "Im Generator aktiv" : "Im Generator aktuell aus"}
        </span>

        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {activeCount} aktiv
        </span>
      </div>\n\n      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <div className="font-bold">Hinweis zur Team-Balance</div>
        <p className="mt-1">
          Für den Teamgenerator sollten maximal zwei Kategorien aktiv sein. Die
          stärkere Kategorie sollte zuerst stehen, die normale Kategorie danach.
          Wenn Kategorien keine sportliche Stärke abbilden, lass Kategorien im
          Generator besser aus und nutze nur die individuelle Stärke.
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
          <button
            type="submit"
            className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
          >
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
              className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-3 sm:flex-row sm:items-center"
            >
              <input type="hidden" name="redirect_to" value={redirectTo} />
              <input type="hidden" name="id" value={category.id} />
              <input
                type="hidden"
                name="sort_order"
                value={category.sort_order}
              />

              <input
                name="label"
                defaultValue={category.label}
                required
                className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
              />

              <label className="flex shrink-0 items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={category.is_active}
                />
                Aktiv
              </label>

              <button
                type="submit"
                className="shrink-0 rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-neutral-100"
              >
                Speichern
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}