import { addCategoryAction, updateCategoryAction } from "@/app/admin/settings/actions";

type CategoryRow = {
  id: number;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export function CategorySettingsSection({
  categoryLabel,
  useCategories,
  activeCategoriesCount,
  categories,
}: {
  categoryLabel: string;
  useCategories: boolean;
  activeCategoriesCount: number;
  categories: CategoryRow[];
}) {
  return (
    <>
      <div className="mb-6 rounded-[20px] border border-black/10 bg-neutral-50 p-5">
        <div className="text-sm font-semibold text-slate-950">
          Kurzer Hinweis
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Kategorien helfen dem Teamgenerator bei einer faireren Aufteilung,
          zum Beispiel nach <span className="font-semibold">Vorne</span>,{" "}
          <span className="font-semibold">Hinten</span>,{" "}
          <span className="font-semibold">Ü32</span> oder{" "}
          <span className="font-semibold">AH</span>.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              useCategories
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {useCategories
              ? "Im Generator aktiv"
              : "Im Generator aktuell aus"}
          </span>

          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {activeCategoriesCount} aktive Kategorien
          </span>
        </div>
      </div>

      <section className="mb-8 rounded-[20px] border border-black/10 bg-white p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-950">
          Neue Kategorie anlegen
        </h3>

        <form action={addCategoryAction} className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-900">
              Bezeichnung
            </label>
            <input
              name="label"
              required
              placeholder="z. B. AH"
              className="w-full rounded-lg border border-black/5 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-900">
              Schlüssel (optional)
            </label>
            <input
              name="key"
              placeholder="z. B. ah"
              className="w-full rounded-lg border border-black/5 bg-white px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Wird leer automatisch aus der Bezeichnung erzeugt.
            </p>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Kategorie anlegen
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[20px] border border-black/10 bg-white p-5">
        <h3 className="mb-5 text-base font-semibold text-slate-950">
          Bestehende Kategorien
        </h3>

        {!categories.length ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Noch keine Kategorien vorhanden.
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((category) => (
              <form
                key={category.id}
                action={updateCategoryAction}
                className="rounded-2xl border border-black/10 bg-neutral-50 p-4"
              >
                <input type="hidden" name="id" value={category.id} />

                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-900">
                      Bezeichnung
                    </label>
                    <input
                      name="label"
                      defaultValue={category.label}
                      required
                      className="w-full rounded-lg border border-black/5 bg-white px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-900">
                      Schlüssel
                    </label>
                    <input
                      name="key"
                      defaultValue={category.key}
                      required
                      className="w-full rounded-lg border border-black/5 bg-white px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-900">
                      Reihenfolge
                    </label>
                    <input
                      type="number"
                      name="sort_order"
                      defaultValue={category.sort_order}
                      className="w-full rounded-lg border border-black/5 bg-white px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 text-sm text-slate-900">
                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={category.is_active}
                      />
                      Aktiv
                    </label>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-neutral-100"
                  >
                    Speichern
                  </button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>
    </>
  );
}