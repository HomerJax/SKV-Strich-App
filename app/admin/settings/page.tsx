import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
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

function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { clubId, membership } = await requireClub();

  if (!isAdminRole(membership.role)) {
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
        <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-500">Admin</div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
            Einstellungen
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Verwalte Club, Saisons, Kategorien und Teamgenerator zentral an
            einem Ort.
          </p>
        </div>

        <ClubSettingsCard saved={clubSaved} error={clubError} />

        <SeasonSettingsCard message={seasonMessage} error={seasonError} />

        <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
          <details>
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-500">
                    Einstellungen
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-950">
                    Kategorien
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Kategorien kompakt verwalten.
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-500">
                  Öffnen
                </span>
              </div>
            </summary>

            <div className="mt-5 border-t border-black/10 pt-5">
              <CategorySettingsSection
                categories={categories}
                useCategories={settings?.use_categories ?? false}
              />
            </div>
          </details>
        </div>

        <TeamGeneratorSettingsCard
          useStrength={settings?.use_strength ?? false}
          useCategories={settings?.use_categories ?? false}
        />
      </section>
    </main>
  );
}