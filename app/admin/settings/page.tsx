import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { CategorySettingsSection } from "@/components/admin/settings/CategorySettingsSection";

type Club = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
  primary_color: string | null;
};

function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}

function Card({ title, children }: any) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function formatDate(date: string | null) {
  if (!date) return "nicht gesetzt";
  return new Date(date).toLocaleDateString("de-DE");
}

export default async function Page() {
  const { clubId, membership } = await requireClub();

  if (!isAdminRole(membership.role)) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const [{ data: clubData }, { data: seasonsData }, { data: categoriesData }] =
    await Promise.all([
      supabase
        .from("clubs")
        .select("id, display_name, logo_path, primary_color")
        .eq("id", clubId)
        .maybeSingle(),

      supabase
        .from("seasons")
        .select("id, name, start_date, end_date")
        .eq("club_id", clubId)
        .order("start_date", { ascending: false }),

      supabase
        .from("club_categories")
        .select("id, key, label, sort_order, is_active")
        .eq("club_id", clubId)
        .order("sort_order", { ascending: true }),
    ]);

  const club = clubData as Club | null;
  const seasons = seasonsData ?? [];
  const categories = categoriesData ?? [];

  let logoUrl: string | null = null;

  if (club?.logo_path) {
    const { data } = supabase.storage
      .from("club-logos")
      .getPublicUrl(club.logo_path);

    logoUrl = data.publicUrl;
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        {/* HEADER */}
        <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold">
            Einstellungen
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Verwalte deinen Club, Saisons und Einstellungen zentral.
          </p>
        </div>

        {/* CLUB */}
        <Card title="Club & Branding">
          <form
            method="post"
            action="/api/admin/club"
            encType="multipart/form-data"
            className="space-y-4"
          >
            {logoUrl && (
              <Image
                src={logoUrl}
                alt="Logo"
                width={80}
                height={80}
                className="rounded-xl border"
              />
            )}

            <input
              name="display_name"
              defaultValue={club?.display_name ?? ""}
              placeholder="Vereinsname"
              className="w-full rounded-xl border p-2"
            />

            <input type="file" name="logo" />

            <button className="rounded-xl bg-black text-white px-4 py-2">
              Speichern
            </button>
          </form>
        </Card>

        {/* SAISON */}
        <Card title="Saison">
          {/* CREATE */}
          <form
            method="post"
            action="/api/admin/seasons"
            className="space-y-3 border rounded-xl p-3"
          >
            <input type="hidden" name="intent" value="create" />

            <input
              name="name"
              placeholder="Saison 2025/26"
              className="w-full border rounded p-2"
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <input type="date" name="start_date" required />
              <input type="date" name="end_date" required />
            </div>

            <button className="bg-black text-white px-4 py-2 rounded">
              Anlegen
            </button>
          </form>

          {/* LIST */}
          <div className="space-y-2">
            {seasons.map((s: any) => (
              <div
                key={s.id}
                className="flex justify-between border rounded p-3"
              >
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {formatDate(s.start_date)} → {formatDate(s.end_date)}
                  </div>
                </div>

                <form method="post" action="/api/admin/seasons">
                  <input type="hidden" name="intent" value="delete" />
                  <input type="hidden" name="season_id" value={s.id} />
                  <button className="text-red-600 text-sm">
                    Löschen
                  </button>
                </form>
              </div>
            ))}
          </div>
        </Card>

        {/* KATEGORIEN */}
        <Card title="Kategorien">
          <CategorySettingsSection
            categories={categories}
            useCategories={true}
          />
        </Card>
      </section>
    </main>
  );
}