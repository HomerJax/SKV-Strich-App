import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { createClubAction } from "./actions";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import ClubSetupClubStep from "@/components/club-setup/ClubSetupClubStep";
import ClubSetupSeasonStep from "@/components/club-setup/ClubSetupSeasonStep";
import TeamGeneratorSettingsCard from "@/components/admin/settings/TeamGeneratorSettingsCard";
import { CategorySettingsSection } from "@/components/admin/settings/CategorySettingsSection";

function getErrorMessage(error?: string | null) {
  switch (error) {
    case "missing-name":
      return "Bitte gib einen Teamnamen ein.";
    case "club-create-failed":
      return "Das Team konnte nicht erstellt werden.";
    case "membership-create-failed":
      return "Die Team-Zuordnung konnte nicht erstellt werden.";
    case "settings-create-failed":
      return "Das Team wurde erstellt, aber die Einstellungen konnten nicht vollständig angelegt werden.";
    case "membership-load-failed":
      return "Dein Account konnte nicht geladen werden.";
    case "player-link-failed":
      return "Das Team wurde erstellt, aber dein Spielerprofil konnte nicht mit dem Team verknüpft werden.";
    default:
      return null;
  }
}

function getSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
  primary_color: string | null;
  sport_type: string | null;
};

type ClubSettingsRow = {
  use_strength: boolean | null;
  use_categories: boolean | null;
};

type CategoryRow = {
  id: number;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

type SetupStep = "club" | "season" | "team" | "categories" | "done";

const STEP_ORDER: SetupStep[] = [
  "club",
  "season",
  "team",
  "categories",
  "done",
];

const STEP_LABELS: Record<SetupStep, string> = {
  club: "Sport & Club",
  season: "Saison",
  team: "Teamgenerator",
  categories: "Kategorien",
  done: "Fertig",
};

function getStep(value: string | null): SetupStep {
  if (
    value === "club" ||
    value === "season" ||
    value === "team" ||
    value === "categories" ||
    value === "done"
  ) {
    return value;
  }

  return "club";
}

function buildWizardUrl(step: SetupStep) {
  return `/club-setup?created=1&step=${step}`;
}

function getStepIndex(step: SetupStep) {
  return STEP_ORDER.indexOf(step);
}

function getPreviousStep(step: SetupStep): SetupStep | null {
  const index = getStepIndex(step);
  if (index <= 0) return null;
  return STEP_ORDER[index - 1];
}

function getRemainingSteps(step: SetupStep) {
  const index = getStepIndex(step);
  return Math.max(STEP_ORDER.length - index - 1, 0);
}

function EmptyStateActionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-6">
      <h3 className="text-lg font-semibold text-neutral-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "success" | "error" | "info";
  children: React.ReactNode;
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

function StepHero({
  clubName,
  currentStep,
}: {
  clubName: string;
  currentStep: SetupStep;
}) {
  const stepNumber = getStepIndex(currentStep) + 1;
  const remainingSteps = getRemainingSteps(currentStep);

  return (
    <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Team erstellt
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
            {clubName} startklar machen
          </h1>

          <p className="mt-2 text-sm text-neutral-600">
            Schritt {stepNumber} von {STEP_ORDER.length}
            {remainingSteps > 0 ? ` · noch ${remainingSteps} offen` : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-[#f7f8fb] px-4 py-3 text-sm font-medium text-neutral-700">
          {STEP_LABELS[currentStep]}
        </div>
      </div>
    </div>
  );
}

function BrandLockup() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-black text-sm font-extrabold uppercase tracking-[0.18em] text-white shadow-sm">
        S
      </div>

      <div>
        <div className="text-sm font-semibold tracking-[0.18em] text-neutral-500">
          strikr
        </div>
        <div className="text-sm text-neutral-600">Club-Setup</div>
      </div>
    </div>
  );
}

export default async function ClubSetupPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const error = getSearchParam(resolvedSearchParams.error);
  const created = getSearchParam(resolvedSearchParams.created) === "1";
  const currentStep = getStep(getSearchParam(resolvedSearchParams.step));

  const auth = await getAuthContext();

  if (!auth.user) {
    redirect("/login");
  }

  const memberships = auth.memberships ?? [];
  const hasClub = memberships.length > 0;

  const supabase = await createClient();
  const activeClubId = auth.activeClubId ?? memberships[0]?.club_id ?? null;

  let club: ClubRow | null = null;
  let settings: ClubSettingsRow | null = null;
  let categories: CategoryRow[] = [];
  let currentLogoUrl: string | null = null;
  let useNicknames = false;

  if (activeClubId) {
    const [
      { data: clubData },
      { data: settingsData },
      { data: categoriesData },
      featureFlags,
    ] = await Promise.all([
      supabase
        .from("clubs")
        .select("id, display_name, logo_path, primary_color, sport_type")
        .eq("id", activeClubId)
        .maybeSingle<ClubRow>(),
      supabase
        .from("club_settings")
        .select("use_strength, use_categories")
        .eq("club_id", activeClubId)
        .maybeSingle<ClubSettingsRow>(),
      supabase
        .from("club_categories")
        .select("id, key, label, sort_order, is_active")
        .eq("club_id", activeClubId)
        .order("sort_order", { ascending: true }),
      getFeatureFlagsForClub(activeClubId),
    ]);

    club = clubData ?? null;
    settings = settingsData ?? null;
    categories = (categoriesData ?? []) as CategoryRow[];
    useNicknames = featureFlags.use_nicknames ?? false;

    if (club?.logo_path) {
      const { data } = supabase.storage
        .from("club-logos")
        .getPublicUrl(club.logo_path);

      currentLogoUrl = data.publicUrl;
    }
  }

  if (!created && hasClub) {
    redirect("/");
  }

  const clubName = club?.display_name?.trim() || "dein Team";
  const errorMessage = getErrorMessage(error);

  const clubSaved =
    getSearchParam(resolvedSearchParams.club_saved) === "1" ||
    getSearchParam(resolvedSearchParams.saved) === "1";
  const clubError =
    getSearchParam(resolvedSearchParams.club_error) ??
    getSearchParam(resolvedSearchParams.error) ??
    "";

  const seasonMessage =
    getSearchParam(resolvedSearchParams.season_message) ??
    getSearchParam(resolvedSearchParams.message) ??
    "";
  const seasonError =
    getSearchParam(resolvedSearchParams.season_error) ??
    getSearchParam(resolvedSearchParams.error) ??
    "";

  const settingsSaved = getSearchParam(resolvedSearchParams.saved) === "1";
  const settingsError = getSearchParam(resolvedSearchParams.error) ?? "";

  const categorySaved =
    getSearchParam(resolvedSearchParams.category_saved) === "1";
  const categoryError = getSearchParam(resolvedSearchParams.category_error) ?? "";

  const previousStep = getPreviousStep(currentStep);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-neutral-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <BrandLockup />
          <LogoutButton />
        </header>

        {!created ? (
          <section className="flex flex-1 items-start justify-center py-2 sm:py-4">
            <div className="w-full max-w-4xl">
              <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-5xl">
                  Dein strikr Start
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-700 sm:text-base">
                  Du bist eingeloggt, aber aktuell noch in keinem Team. Erstelle
                  jetzt dein eigenes Team oder warte auf eine Einladung von
                  einem Admin.
                </p>

                {errorMessage ? (
                  <div className="mt-6">
                    <Banner tone="error">{errorMessage}</Banner>
                  </div>
                ) : null}

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <EmptyStateActionCard
                    title="Eigenes Team erstellen"
                    description="Starte mit deinem eigenen Team und richte strikr Schritt für Schritt für eure Trainings ein."
                  >
                    <form action={createClubAction} className="space-y-4">
                      <div>
                        <label
                          htmlFor="name"
                          className="mb-2 block text-sm font-medium text-neutral-700"
                        >
                          Teamname
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          placeholder="z. B. AH Ditzingen"
                          className="w-full rounded-2xl border border-black/10 bg-[#f7f8fb] px-4 py-3 text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-300"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                      >
                        Team erstellen
                      </button>
                    </form>
                  </EmptyStateActionCard>

                  <EmptyStateActionCard
                    title="Auf Einladung warten"
                    description="Du wurdest schon eingeladen? Dann musst du jetzt nichts weiter tun. Öffne einfach den Einladungslink deines Teams."
                  >
                    <div className="rounded-2xl border border-black/10 bg-[#f7f8fb] p-4 text-sm leading-6 text-neutral-700">
                      Sobald dir ein Admin einen Invite-Link schickt, kannst du
                      dem Team mit einem Klick beitreten. Danach landest du
                      automatisch im richtigen Club-Kontext.
                    </div>

                    <div className="mt-4">
                      <Link
                        href="/"
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-50"
                      >
                        Zurück zur Startseite
                      </Link>
                    </div>
                  </EmptyStateActionCard>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="flex flex-1 items-start justify-center py-2 sm:py-4">
            <div className="w-full max-w-3xl space-y-4">
              <StepHero clubName={clubName} currentStep={currentStep} />

              {currentStep === "club" ? (
                <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
                  <div className="mb-5">
                    <div className="text-sm font-semibold text-neutral-500">
                      Schritt 1
                    </div>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
                      Sport & Club
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-neutral-700">
                      Sportart, Name, Logo, Farbe und Anzeigeoptionen festlegen.
                    </p>
                  </div>

                  <ClubSetupClubStep
                    saved={clubSaved}
                    error={clubError}
                    redirectTo={buildWizardUrl("season")}
                    submitLabel="Weiter"
                    removeLogoRedirectTo={buildWizardUrl("club")}
                    initialDisplayName={club?.display_name ?? ""}
                    initialPrimaryColor={club?.primary_color ?? "black"}
                    initialSportType={club?.sport_type ?? "football"}
                    initialLogoUrl={currentLogoUrl}
                    useNicknames={useNicknames}
                  />
                </div>
              ) : null}

              {currentStep === "season" ? (
                <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
                  <div className="mb-5">
                    <div className="text-sm font-semibold text-neutral-500">
                      Schritt 2
                    </div>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
                      Saison
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-neutral-700">
                      Lege direkt eure erste Saison an.
                    </p>
                  </div>

                  <ClubSetupSeasonStep
                    message={seasonMessage}
                    error={seasonError}
                    redirectTo={buildWizardUrl("team")}
                    submitLabel="Weiter"
                  />

                  {previousStep ? (
                    <div className="mt-6 flex justify-start">
                      <Link
                        href={buildWizardUrl(previousStep)}
                        className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                      >
                        Zurück
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {currentStep === "team" ? (
                <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
                  <div className="mb-5">
                    <div className="text-sm font-semibold text-neutral-500">
                      Schritt 3
                    </div>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
                      Teamgenerator
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-neutral-700">
                      Stärke und Kategorien für faire Teams definieren.
                    </p>
                  </div>

                  <TeamGeneratorSettingsCard
                    useStrength={settings?.use_strength ?? false}
                    useCategories={settings?.use_categories ?? false}
                    redirectTo={buildWizardUrl("categories")}
                    submitLabel="Weiter"
                    saved={settingsSaved}
                    error={settingsError}
                  />

                  {previousStep ? (
                    <div className="mt-6 flex justify-start">
                      <Link
                        href={buildWizardUrl(previousStep)}
                        className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                      >
                        Zurück
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {currentStep === "categories" ? (
                <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
                  <div className="mb-5">
                    <div className="text-sm font-semibold text-neutral-500">
                      Schritt 4
                    </div>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
                      Kategorien
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-neutral-700">
                      AH, Ü32 oder eigene Gruppen pflegen.
                    </p>
                  </div>

                  <CategorySettingsSection
                    categories={categories}
                    useCategories={settings?.use_categories ?? false}
                    redirectTo={buildWizardUrl("categories")}
                    saved={categorySaved}
                    error={categoryError}
                  />

                  <div className="mt-6 flex items-center justify-between">
                    {previousStep ? (
                      <Link
                        href={buildWizardUrl(previousStep)}
                        className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                      >
                        Zurück
                      </Link>
                    ) : (
                      <div />
                    )}

                    <Link
                      href={buildWizardUrl("done")}
                      className="inline-flex items-center justify-center rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    >
                      Weiter
                    </Link>
                  </div>
                </div>
              ) : null}

              {currentStep === "done" ? (
                <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-neutral-500">
                      Glückwunsch
                    </div>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
                      {clubName} ist eingerichtet
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-neutral-700 sm:text-base">
                      Das Setup ist abgeschlossen.
                    </p>
                  </div>

                  <div className="mt-8 flex justify-center">
                    <Link
                      href="/"
                      className="inline-flex items-center justify-center rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    >
                      Setup abschließen
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}