import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import ClubSettingsCard from "@/components/admin/settings/ClubSettingsCard";
import SeasonSettingsCard from "@/components/admin/settings/SeasonSettingsCard";
import TeamGeneratorSettingsCard from "@/components/admin/settings/TeamGeneratorSettingsCard";
import { CategorySettingsSection } from "@/components/admin/settings/CategorySettingsSection";

type PageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
    message?: string;
    club_saved?: string;
    club_error?: string;
    season_message?: string;
    season_error?: string;
  }>;
};

type ClubSettingsRow = {
  use_strength: boolean | null;
  use_categories: boolean | null;
  awards_started_at: string | null;
};

function AwardsSettingsCard({
  awardsStartedAt,
  saved,
  error,
}: {
  awardsStartedAt: string | null;
  saved: boolean;
  error: string;
}) {
  const dateValue = awardsStartedAt ?? "";

  return (
    <div className="space-y-5">
      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Award-Einstellungen gespeichert.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === "invalid_awards_started_at"
            ? "Das Startdatum für Awards ist ungültig."
            : "Award-Einstellungen konnten nicht gespeichert werden."}
        </div>
      ) : null}

      <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm font-black text-amber-950">
          Awards sind aktuell Preview
        </div>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          Alte Trainingsdaten dürfen zum Testen sichtbar sein. Offiziell zählen
          Serien, Awards und spätere Trophäen aber erst ab dem Go-Datum.
        </p>
      </div>

      <form method="post" action="/api/admin/settings" className="space-y-4">
        <input type="hidden" name="redirect_to" value="/admin/settings" />

        <label className="block rounded-[20px] border border-black/10 bg-neutral-50 p-4">
          <div className="text-sm font-semibold text-slate-950">
            Offizieller Award-Start
          </div>
          <div className="mt-1 text-sm leading-6 text-slate-600">
            Ab diesem Datum zählen Trainings-Awards offiziell. Leer lassen,
            wenn Awards noch nur Preview/Test sein sollen.
          </div>

          <input
            type="date"
            name="awards_started_at"
            defaultValue={dateValue}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Award-Start speichern
          </button>

          {awardsStartedAt ? (
            <button
              type="submit"
              name="awards_started_at"
              value=""
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Zurück auf Preview
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function SettingsShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-[24px] border border-black/10 bg-white shadow-sm">
      <summary className="list-none cursor-pointer px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>

          <div className="mt-0.5 shrink-0 rounded-full border border-black/10 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 transition group-open:rotate-180">
            ⌄
          </div>
        </div>
      </summary>

      <div className="border-t border-black/10 px-5 py-5">{children}</div>
    </details>
  );
}

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { clubId, membership, isPowerUser } = await requireClub();

  const hasAdminAccess = canManageClub({
    isPowerUser,
    role: membership.role,
  });

  if (!hasAdminAccess) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const [{ data: settingsData }, { data: categoriesData }] = await Promise.all([
    supabase
      .from("club_settings")
      .select("use_strength, use_categories, awards_started_at")
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

  const clubSaved =
    resolvedSearchParams?.club_saved === "1" ||
    resolvedSearchParams?.saved === "1";
  const clubError =
    resolvedSearchParams?.club_error ?? resolvedSearchParams?.error ?? "";

  const seasonMessage =
    resolvedSearchParams?.season_message ?? resolvedSearchParams?.message ?? "";
  const seasonError =
    resolvedSearchParams?.season_error ?? resolvedSearchParams?.error ?? "";

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
        
        {/* 🔙 BACK BUTTON */}
        <div className="flex items-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Adminbereich
          </Link>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white px-5 py-5 shadow-sm">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
            Einstellungen
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Verwalte Club, Saisons und weitere Einstellungen zentral an einem
            Ort.
          </p>

          {isPowerUser ? (
            <div className="mt-4 inline-flex rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900">
              Power User Modus: Du prüfst diesen Verein ohne echte Mitgliedschaft.
            </div>
          ) : null}
        </div>

        <SettingsShell
          title="Club & Branding"
          description="Name, Logo, Farbe und Anzeigeoptionen verwalten."
        >
          <ClubSettingsCard saved={clubSaved} error={clubError} />
        </SettingsShell>

        <SettingsShell
          title="Saisons"
          description="Saisons anlegen, bearbeiten und Serientrainings erzeugen."
        >
          <SeasonSettingsCard message={seasonMessage} error={seasonError} />
        </SettingsShell>

        <SettingsShell
          title="Kategorien"
          description="Kategorien kompakt verwalten."
        >
          <CategorySettingsSection
            categories={categories}
            useCategories={settings?.use_categories ?? false}
          />
        </SettingsShell>

        <SettingsShell
          title="Teamgenerator"
          description="Regeln und Erklärung für automatische Teams."
        >
          <TeamGeneratorSettingsCard
            useStrength={settings?.use_strength ?? false}
            useCategories={settings?.use_categories ?? false}
          />
        </SettingsShell>

        <SettingsShell
          title="Awards"
          description="Offiziellen Start für Trainings-Awards festlegen."
        >
          <AwardsSettingsCard
            awardsStartedAt={settings?.awards_started_at ?? null}
            saved={clubSaved}
            error={clubError}
          />
        </SettingsShell>
      </section>
    </main>
  );
}