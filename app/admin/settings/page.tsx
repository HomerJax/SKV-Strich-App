import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { CategorySettingsSection } from "@/components/admin/settings/CategorySettingsSection";

type ClubSettingsRow = {
  use_strength: boolean | null;
  use_categories: boolean | null;
  season_start_day: number | null;
  season_start_month: number | null;
};

function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}

async function getAdminContext() {
  const { clubId, membership } = await requireClub();

  if (!isAdminRole(membership.role)) {
    redirect("/admin");
  }

  const supabase = await createClient();
  return { supabase, clubId };
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

export default async function AdminSettingsPage() {
  const { supabase, clubId } = await getAdminContext();

  const [{ data: settingsData }, { data: categoriesData }, { data: seasonsData }] =
    await Promise.all([
      supabase
        .from("club_settings")
        .select(
          "use_strength, use_categories, season_start_day, season_start_month"
        )
        .eq("club_id", clubId)
        .maybeSingle(),

      supabase
        .from("club_categories")
        .select("id, key, label, sort_order, is_active")
        .eq("club_id", clubId)
        .order("sort_order", { ascending: true }),

      supabase
        .from("seasons")
        .select("id, name, start_date, end_date, is_active")
        .eq("club_id", clubId)
        .order("start_date", { ascending: false }),
    ]);

  const settings = (settingsData as ClubSettingsRow | null) ?? null;
  const categories = categoriesData ?? [];
  const seasons = seasonsData ?? [];

  const activeSeason = seasons.find((s) => s.is_active);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        {/* HEADER */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Einstellungen
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Verwalte deinen Club, Saisons und Team-Logik.
          </p>
        </div>

        {/* CLUB */}
        <Card title="Club & Branding">
          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer font-medium">
              Club bearbeiten
            </summary>

            <div className="mt-3 text-sm text-slate-600">
              ⚠️ Hier fehlt aktuell dein Formular.
              <br />
              → nächster Schritt: Name + Logo + Farbe
            </div>
          </details>
        </Card>

        {/* SAISON */}
        <Card title="Saison">
          {/* AKTIVE */}
          <div>
            <p className="text-sm font-medium text-slate-700">
              Aktuelle Saison
            </p>

            {activeSeason ? (
              <div className="mt-2 rounded-lg border p-3 text-sm">
                <div className="font-semibold">{activeSeason.name}</div>
                <div className="text-slate-500">
                  {activeSeason.start_date} → {activeSeason.end_date}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 mt-1">
                Keine aktive Saison
              </p>
            )}
          </div>

          {/* LISTE */}
          <div>
            <p className="text-sm font-medium text-slate-700">
              Alle Saisons
            </p>

            <div className="mt-2 space-y-2">
              {seasons.map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-slate-500">
                      {s.start_date} → {s.end_date}
                    </div>
                  </div>

                  {s.is_active && (
                    <span className="text-xs text-green-600 font-semibold">
                      aktiv
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AUTO LOGIK */}
          <div>
            <p className="text-sm font-medium text-slate-700">
              Automatische Saison
            </p>

            <form
              method="post"
              action="/api/admin/settings"
              className="mt-2 grid grid-cols-2 gap-2"
            >
              <select
                name="season_start_day"
                defaultValue={String(settings?.season_start_day ?? 1)}
                className="rounded-lg border p-2"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                name="season_start_month"
                defaultValue={String(settings?.season_start_month ?? 1)}
                className="rounded-lg border p-2"
              >
                {[
                  "Jan",
                  "Feb",
                  "Mär",
                  "Apr",
                  "Mai",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Okt",
                  "Nov",
                  "Dez",
                ].map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <button className="col-span-2 mt-2 rounded-lg bg-black px-4 py-2 text-sm text-white">
                Speichern
              </button>
            </form>
          </div>
        </Card>

        {/* KATEGORIEN */}
        <Card title="Kategorien">
          <CategorySettingsSection
            categories={categories}
            useCategories={settings?.use_categories ?? false}
          />
        </Card>
      </div>
    </main>
  );
}