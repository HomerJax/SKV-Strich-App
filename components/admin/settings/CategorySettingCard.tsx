import { addCategoryAction, updateCategoryAction } from "@/app/admin/settings/actions";

export function CategorySettingsCard({
  categories,
  categoryLabel,
  useCategories,
}: any) {
  const activeCategories = categories.filter((c: any) => c.is_active);

  return (
    <div className="rounded-2xl border bg-white p-5">
      <h2 className="text-lg font-semibold mb-4">
        {categoryLabel}n
      </h2>

      <div className="mb-4 text-sm text-slate-600">
        {useCategories
          ? "Im Generator aktiv"
          : "Aktuell deaktiviert"}
        {" · "}
        {activeCategories.length} aktiv
      </div>

      {/* ADD */}
      <form action={addCategoryAction} className="grid gap-3 md:grid-cols-3 mb-6">
        <input
          name="label"
          placeholder="Bezeichnung"
          className="border rounded px-3 py-2"
          required
        />
        <input
          name="key"
          placeholder="key optional"
          className="border rounded px-3 py-2"
        />
        <button className="bg-black text-white rounded px-4 py-2">
          + Add
        </button>
      </form>

      {/* LIST */}
      <div className="space-y-3">
        {categories.map((cat: any) => (
          <form
            key={cat.id}
            action={updateCategoryAction}
            className="border rounded p-3 grid md:grid-cols-4 gap-2"
          >
            <input type="hidden" name="id" value={cat.id} />

            <input
              name="label"
              defaultValue={cat.label}
              className="border px-2 py-1"
            />

            <input
              name="key"
              defaultValue={cat.key}
              className="border px-2 py-1"
            />

            <input
              name="sort_order"
              defaultValue={cat.sort_order}
              type="number"
              className="border px-2 py-1"
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={cat.is_active}
              />
              aktiv
            </label>

            <button className="col-span-full border rounded px-3 py-1">
              speichern
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}