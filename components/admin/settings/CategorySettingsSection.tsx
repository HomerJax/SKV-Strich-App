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
};

export function CategorySettingsSection({
  categories,
  useCategories,
}: CategorySettingsSectionProps) {
  const activeCount = categories.filter((category) => category.is_active).length;

  return (
    <div className="space-y-4">
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
      </div>

      <div className="rounded-xl border border-black/10 bg-neutral-50 p-3">
        <form action={addCategoryAction} className="flex gap-2">
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