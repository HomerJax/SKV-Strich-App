import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    }
  );
}

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership || membership.role !== "admin") {
    redirect("/");
  }

  return { supabase, clubId: membership.club_id };
}

function slugifyKey(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

async function addCategoryAction(formData: FormData) {
  "use server";

  const { supabase, clubId } = await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  const keyInput = String(formData.get("key") ?? "").trim();

  if (!label) {
    redirect("/admin/categories?error=Bitte Bezeichnung eingeben");
  }

  const key = slugifyKey(keyInput || label);

  if (!key) {
    redirect("/admin/categories?error=Ungültiger Schlüssel");
  }

  const { data: maxRow } = await supabase
    .from("club_categories")
    .select("sort_order")
    .eq("club_id", clubId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("club_categories").insert({
    club_id: clubId,
    key,
    label,
    sort_order: nextSortOrder,
    is_active: true,
  });

  if (error) {
    redirect(`/admin/categories?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/categories");
  revalidatePath("/onboarding");
  redirect("/admin/categories?saved=1");
}

async function updateCategoryAction(formData: FormData) {
  "use server";

  const { supabase, clubId } = await requireAdmin();

  const id = Number(String(formData.get("id") ?? ""));
  const label = String(formData.get("label") ?? "").trim();
  const keyInput = String(formData.get("key") ?? "").trim();
  const sortOrder = Number(String(formData.get("sort_order") ?? "0"));
  const isActive = formData.get("is_active") === "on";

  if (!id || !label) {
    redirect("/admin/categories?error=Ungültige Kategorie");
  }

  const key = slugifyKey(keyInput || label);

  if (!key) {
    redirect("/admin/categories?error=Ungültiger Schlüssel");
  }

  const safeSortOrder = Number.isFinite(sortOrder) ? sortOrder : 0;

  const { error } = await supabase
    .from("club_categories")
    .update({
      label,
      key,
      sort_order: safeSortOrder,
      is_active: isActive,
    })
    .eq("id", id)
    .eq("club_id", clubId);

  if (error) {
    redirect(`/admin/categories?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/categories");
  revalidatePath("/onboarding");
  redirect("/admin/categories?saved=1");
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const saved = resolvedSearchParams.saved;
  const error = resolvedSearchParams.error;

  const { supabase, clubId } = await requireAdmin();

  const { data: settings } = await supabase
    .from("club_settings")
    .select("use_categories, category_label")
    .eq("club_id", clubId)
    .maybeSingle();

  const { data: categories } = await supabase
    .from("club_categories")
    .select("id, key, label, sort_order, is_active")
    .eq("club_id", clubId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  const categoryLabel = settings?.category_label ?? "Kategorie";

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{categoryLabel}n verwalten</h1>
        <p className="mt-1 text-sm text-slate-600">
          Hier legst du die auswählbaren Kategorien deines Clubs fest.
        </p>
        {settings?.use_categories === false ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Kategorien sind in den Club-Einstellungen aktuell deaktiviert. Du kannst sie hier trotzdem vorbereiten.
          </div>
        ) : null}
      </div>

      {saved ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Änderungen gespeichert.
        </div>
      ) : null}

      {typeof error === "string" && error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="mb-8 rounded-2xl border bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Neue Kategorie anlegen</h2>

        <form action={addCategoryAction} className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Bezeichnung</label>
            <input
              name="label"
              required
              placeholder="z. B. AH"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Schlüssel (optional)</label>
            <input
              name="key"
              placeholder="z. B. ah"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Wird leer automatisch aus der Bezeichnung erzeugt.
            </p>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Kategorie anlegen
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Bestehende Kategorien</h2>

        {!categories || categories.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Noch keine Kategorien vorhanden.
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <form
                key={category.id}
                action={updateCategoryAction}
                className="rounded-xl border border-slate-200 p-4"
              >
                <input type="hidden" name="id" value={category.id} />

                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Bezeichnung</label>
                    <input
                      name="label"
                      defaultValue={category.label}
                      required
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Schlüssel</label>
                    <input
                      name="key"
                      defaultValue={category.key}
                      required
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Reihenfolge</label>
                    <input
                      type="number"
                      name="sort_order"
                      defaultValue={category.sort_order}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={category.is_active}
                      />
                      Aktiv
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-lg border px-4 py-2 text-sm font-semibold"
                  >
                    Speichern
                  </button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}