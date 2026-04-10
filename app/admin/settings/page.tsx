import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { CategorySettingsSection } from "@/components/admin/settings/CategorySettingsSection";

type ClubSettingsRow = {
  use_strength: boolean | null;
  use_categories: boolean | null;
  season_start_day: number | null;
  season_start_month: number | null;
  season_end_day: number | null;
  season_end_month: number | null;
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

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="rounded-2xl border bg-white">
      <summary className="cursor-pointer px-4 py-3 font-semibold">
        {title}
      </summary>
      <div className="border-t p-4 space-y-5">{children}</div>
    </details>
  );
}

export default async function AdminSettingsPage() {
  const { supabase, clubId } = await getAdminContext();

  const [
    { data: settingsData },
    { data: categoriesData },
    { data: seasonsData },
  ] = await Promise.all([
    supabase
      .from("club_settings")
      .select(
        "use_strength, use_categories, season_start_day, season_start_month, season_end_day, season_end_month"
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

  const useCategories = settings?.use_categories ?? false;
  const useStrength = settings?.use_strength ?? false;

  const activeSeason = seasons.find((s) => s.is_active);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        {/* HEADER */}
        <div className="rounded-2xl border bg-white p-5">
          <h1 className="text-2xl font-bold text-slate-950">
            Einstellungen
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Zentrale Verwaltung deines Clubs.
          </p>
        </div>

        {/* CLUB */}
        <Section title="Club & Branding" defaultOpen>
          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer font-semibold">
              Club bearbeiten
            </summary>

            <div className="mt-3 text-sm text-slate-600">
              (Hier kommt dein Club-Formular rein – aktuell bewusst inline
              vorbereitet)
            </div>
          </details>
        </Section>

        {/* SAISON */}
        <Section title="Saison" defaultOpen>
          {/* AKTIVE SAISON */}
          <div>
            <h3 className="text-sm font-semibold">Aktuelle Saison</h3>

            {activeSeason ? (
              <div className="mt-2 rounded-lg border p-3 text-sm">
                <div className="font-medium">{activeSeason.name}</div>
                <div className="text-slate-500">
                  {activeSeason.start_date} → {activeSeason.end_date}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 mt-2">
                Keine aktive Saison gesetzt
              </p>
            )}
          </div>

          {/* ALLE SAISONS */}
          <div>
            <h3 className="text-sm font-semibold">Alle Saisons</h3>

            <div className="mt-2 space-y-2">
              {seasons.map((season) => (
                <div
                  key={season.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{season.name}</div>
                    <div className="text-slate-500">
                      {season.start_date} → {season.end_date}
                    </div>
                  </div>

                  {season.is_active && (
                    <span className="text-xs font-semibold text-green-600">
                      aktiv
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* LOGIK */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold">Automatische Saison</h3>

            <p className="text-sm text-slate-600">
              Neue Saisons können automatisch basierend auf diesem Zeitraum
              berechnet werden.
            </p>

            <form method="post" action="/api/admin/settings">
              <div className="grid grid-cols-2 gap-2">
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
              </div>

              <button className="mt-3 rounded-lg bg-black px-4 py-2 text-sm text-white">
                Speichern
              </button>
            </form>
          </div>
        </Section>

        {/* KATEGORIEN */}
        <Section title="Kategorien">
          <CategorySettingsSection
            categories={categories}
            useCategories={useCategories}
          />
        </Section>

        {/* TEAMGENERATOR */}
        <Section title="Teamgenerator" defaultOpen>
          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer font-semibold">
              Wie funktioniert das?
            </summary>

            <div className="mt-3 text-sm text-slate-600 space-y-2">
              <p>Teams werden automatisch fair verteilt.</p>
              <p>Kategorien → gleichmäßig verteilt</p>
              <p>Stärke → ausgeglichen</p>
              <p>Beides aus → zufällig</p>

              <p className="font-medium">Beispiel:</p>
              <p>10 Spieler: 4 AH / 6 Ü32 → faire Verteilung</p>
            </div>
          </details>

          <form
            method="post"
            action="/api/admin/settings"
            className="mt-4 space-y-3"
          >
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                name="use_categories"
                value="1"
                defaultChecked={useCategories}
              />
              Kategorien nutzen
            </label>

            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                name="use_strength"
                value="1"
                defaultChecked={useStrength}
              />
              Stärke nutzen
            </label>

            <button className="rounded-lg bg-black px-4 py-2 text-sm text-white">
              Speichern
            </button>
          </form>
        </Section>
      </div>
    </main>
  );
}