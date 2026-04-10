import Link from "next/link";
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

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
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

function SettingsSection({
  title,
  children,
  defaultOpen = false,
}: SettingsSectionProps) {
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

  const [{ data: settingsData }, { data: categoriesData }] = await Promise.all([
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
  ]);

  const settings = (settingsData as ClubSettingsRow | null) ?? null;
  const categories = categoriesData ?? [];

  const useCategories = settings?.use_categories ?? false;
  const useStrength = settings?.use_strength ?? false;

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center">
        <Link
          href="/admin"
          className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold"
        >
          ← Zurück
        </Link>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-5">
        <h1 className="text-2xl font-bold text-slate-950">Einstellungen</h1>
        <p className="mt-2 text-sm text-slate-600">
          Zentrale Verwaltung deines Clubs.
        </p>
      </div>

      {/* CLUB */}
      <SettingsSection title="Club & Branding" defaultOpen>
        <p className="text-sm text-slate-600">
          Name, Logo und Farbe deines Clubs verwaltest du hier.
        </p>

        <Link
          href="/admin/club"
          className="inline-block rounded-lg border px-4 py-2 text-sm"
        >
          Club bearbeiten
        </Link>
      </SettingsSection>

      {/* SAISON */}
      <SettingsSection title="Saison" defaultOpen>
        {/* LOGIK */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Saison-Zeitraum
          </h3>

          <p className="text-sm text-slate-600">
            Definiert, wann eine Saison beginnt und endet. Darauf basieren alle
            Statistiken und Auswertungen.
          </p>

          <form method="post" action="/api/admin/settings" className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">
                Saisonstart
              </p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  name="season_start_day"
                  defaultValue={String(settings?.season_start_day ?? 1)}
                  className="rounded-lg border p-2"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>

                <select
                  name="season_start_month"
                  defaultValue={String(settings?.season_start_month ?? 1)}
                  className="rounded-lg border p-2"
                >
                  {[
                    "Januar",
                    "Februar",
                    "März",
                    "April",
                    "Mai",
                    "Juni",
                    "Juli",
                    "August",
                    "September",
                    "Oktober",
                    "November",
                    "Dezember",
                  ].map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">
                Saisonende
              </p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  name="season_end_day"
                  defaultValue={String(settings?.season_end_day ?? 31)}
                  className="rounded-lg border p-2"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>

                <select
                  name="season_end_month"
                  defaultValue={String(settings?.season_end_month ?? 12)}
                  className="rounded-lg border p-2"
                >
                  {[
                    "Januar",
                    "Februar",
                    "März",
                    "April",
                    "Mai",
                    "Juni",
                    "Juli",
                    "August",
                    "September",
                    "Oktober",
                    "November",
                    "Dezember",
                  ].map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
              Zeitraum speichern
            </button>
          </form>
        </div>

        {/* VERWALTUNG (future ready) */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Saisonverwaltung
          </h3>

          <p className="text-sm text-slate-600">
            Hier kannst du später mehrere Saisons verwalten (z. B. 2024/25,
            2025/26). Aktuell wird automatisch eine Saison basierend auf dem
            Zeitraum verwendet.
          </p>
        </div>
      </SettingsSection>

      {/* KATEGORIEN */}
      <SettingsSection title="Kategorien">
        <CategorySettingsSection
          categories={categories}
          useCategories={useCategories}
        />
      </SettingsSection>

      {/* TEAMGENERATOR */}
      <SettingsSection title="Teamgenerator" defaultOpen>
        <details className="rounded-xl border border-black/10 p-3">
          <summary className="cursor-pointer font-semibold">
            Wie funktioniert der Teamgenerator?
          </summary>

          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>
              Der Generator erstellt automatisch faire Teams basierend auf euren
              Einstellungen.
            </p>

            <p>
              Kategorien wie <strong>AH</strong> oder <strong>Ü32</strong> werden
              gleichmäßig verteilt.
            </p>

            <p>
              Wenn Stärke aktiv ist, werden die Teams zusätzlich nach
              Spielstärke ausgeglichen.
            </p>

            <p>
              Wenn beides aus ist, werden Teams zufällig erstellt.
            </p>

            <p className="font-medium text-slate-800">
              Beispiel:
            </p>

            <p>
              10 Spieler: 4 AH, 6 Ü32 → beide Teams haben ähnliche Verteilung und
              Stärke.
            </p>

            <p>Ziel: faire Teams ohne Diskussion.</p>
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

          <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
            Speichern
          </button>
        </form>
      </SettingsSection>
    </main>
  );
}