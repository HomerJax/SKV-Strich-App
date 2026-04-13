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
};

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
      .select("use_strength, use_categories")
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
        <div className="rounded-[24px] border border-black/10 bg-white px-5 py-5 shadow-sm">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
            Einstellungen
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Verwalte Club, Saisons, Kategorien und Teamgenerator zentral an
            einem Ort.
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
          description="Saisons anlegen, bearbeiten und löschen."
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
      </section>
    </main>
  );
}