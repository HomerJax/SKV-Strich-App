import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { createClubAction } from "./actions";
import ClubSettingsCard from "@/components/admin/settings/ClubSettingsCard";
import SeasonSettingsCard from "@/components/admin/settings/SeasonSettingsCard";
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

function getSearchParam(
  value: string | string[] | undefined
): string | null {
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

const STEP_META: Record<
  SetupStep,
  {
    label: string;
    title: string;
    description: string;
  }
> = {
  club: {
    label: "1",
    title: "Club & Branding",
    description: "Name, Logo, Farbe und Anzeigeoptionen festlegen.",
  },
  season: {
    label: "2",
    title: "Saison",
    description: "Saison anlegen und optional Serientermine erzeugen.",
  },
  team: {
    label: "3",
    title: "Teamgenerator",
    description: "Stärke und Kategorien für faire Teams definieren.",
  },
  categories: {
    label: "4",
    title: "Kategorien",
    description: "AH, Ü32 oder eigene Gruppen pflegen.",
  },
  done: {
    label: "5",
    title: "Fertig",
    description: "Weiter zu Spielern, Dashboard oder erstem Training.",
  },
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

function getNextStep(step: SetupStep): SetupStep | null {
  const index = STEP_ORDER.indexOf(step);
  if (index < 0 || index >= STEP_ORDER.length - 1) return null;
  return STEP_ORDER[index + 1];
}

function getPreviousStep(step: SetupStep): SetupStep | null {
  const index = STEP_ORDER.indexOf(step);
  if (index <= 0) return null;
  return STEP_ORDER[index - 1];
}

function buildWizardUrl(step: SetupStep) {
  return `/club-setup?created=1&step=${step}`;
}

function StepPill({
  step,
  currentStep,
}: {
  step: SetupStep;
  currentStep: SetupStep;
}) {
  const meta = STEP_META[step];
  const isActive = step === currentStep;
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const stepIndex = STEP_ORDER.indexOf(step);
  const isCompleted = stepIndex < currentIndex;

  return (
    <Link
      href={buildWizardUrl(step)}
      className={`rounded-2xl border px-3 py-3 transition ${
        isActive
          ? "border-neutral-950 bg-neutral-950 text-white"
          : isCompleted
            ? "border-black/10 bg-white text-neutral-950"
            : "border-black/10 bg-white text-neutral-600 hover:bg-neutral-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            isActive
              ? "bg-white/15 text-white"
              : isCompleted
                ? "bg-neutral-950 text-white"
                : "bg-neutral-100 text-neutral-700"
          }`}
        >
          {isCompleted ? "✓" : meta.label}
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold">{meta.title}</div>
          <div
            className={`mt-0.5 text-xs ${
              isActive ? "text-white/75" : "text-neutral-500"
            }`}
          >
            {meta.description}
          </div>
        </div>
      </div>
    </Link>
  );
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 shadow-sm">
      {children}
    </div>
  );
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
      <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
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

  let createdClub: ClubRow | null = null;
  let sessionCount = 0;
  let memberCount = memberships.length;
  let settings: ClubSettingsRow | null = null;
  let categories: CategoryRow[] = [];

  if (activeClubId) {
    const [
      { data: clubData },
      { count: sessionsCount },
      { count: membersCount },
      { data: settingsData },
      { data: categoriesData },
    ] = await Promise.all([
      supabase
        .from("clubs")
        .select("id, display_name")
        .eq("id", activeClubId)
        .maybeSingle<ClubRow>(),
      supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("club_id", activeClubId),
      supabase
        .from("club_memberships")
        .select("*", { count: "exact", head: true })
        .eq("club_id", activeClubId),
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
    ]);

    createdClub = clubData ?? null;
    sessionCount = sessionsCount ?? 0;
    memberCount = membersCount ?? memberCount;
    settings = settingsData ?? null;
    categories = (categoriesData ?? []) as CategoryRow[];
  }

  if (!created && hasClub) {
    redirect("/");
  }

  const clubName = createdClub?.display_name?.trim() || "deinem Team";
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
  const settingsError =
    getSearchParam(resolvedSearchParams.error) ?? "";

  const categorySaved =
    getSearchParam(resolvedSearchParams.category_saved) === "1";
  const categoryError =
    getSearchParam(resolvedSearchParams.category_error) ?? "";

  const nextStep = getNextStep(currentStep);
  const previousStep = getPreviousStep(currentStep);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-neutral-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-black/10 bg-black shadow-sm">
              <Image
                src="/icon0.svg"
                alt="STRIKR"
                fill
                className="object-contain p-2"
                sizes="44px"
                priority
              />
            </div>

            <div>
              <div className="text-sm font-semibold tracking-[0.18em] text-neutral-500">
                STRIKR
              </div>
              <div className="text-sm text-neutral-600">
                {created ? "Geführtes Club-Setup" : "Team starten"}
              </div>
            </div>
          </div>

          <LogoutButton />
        </header>

        {!created ? (
          <section className="flex flex-1 items-start justify-center py-2 sm:py-4">
            <div className="w-full max-w-4xl">
              <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-5xl">
                  Dein STRIKR Start
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-600 sm:text-base">
                  Du bist eingeloggt, aber aktuell noch in keinem Team. Erstelle jetzt
                  dein eigenes Team oder warte auf eine Einladung von einem Admin.
                </p>

                {errorMessage ? (
                  <div className="mt-6">
                    <Banner tone="error">{errorMessage}</Banner>
                  </div>
                ) : null}

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <EmptyStateActionCard
                    title="Eigenes Team erstellen"
                    description="Starte mit deinem eigenen Team und richte STRIKR Schritt für Schritt für eure Trainings ein."
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
                    <div className="rounded-2xl border border-black/10 bg-[#f7f8fb] p-4 text-sm leading-6 text-neutral-600">
                      Sobald dir ein Admin einen Invite-Link schickt, kannst du dem Team
                      mit einem Klick beitreten. Danach landest du automatisch im
                      richtigen Club-Kontext.
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
            <div className="w-full max-w-6xl space-y-4">
              <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center rounded-full border border-black/10 bg-neutral-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-700">
                      Team erstellt
                    </div>

                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
                      Richte {clubName} jetzt sauber ein
                    </h1>

                    <p className="mt-3 text-sm leading-7 text-neutral-600 sm:text-base">
                      Statt dich direkt ins Dashboard zu werfen, führt STRIKR dich jetzt
                      durch die wichtigsten ersten Einstellungen. Nicht alles ist Pflicht
                      — aber je sauberer der Start, desto besser funktioniert später der
                      Flow mit Anwesenheit, Teamgenerator, Ergebnis und MVP.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <MetaPill>
                        {memberCount} {memberCount === 1 ? "Mitglied" : "Mitglieder"}
                      </MetaPill>
                      <MetaPill>
                        {sessionCount} {sessionCount === 1 ? "Training" : "Trainings"}
                      </MetaPill>
                      <MetaPill>Rolle: Admin</MetaPill>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#f7f8fb] px-4 py-3 text-sm text-neutral-600 lg:max-w-sm">
                    <div className="font-semibold text-neutral-900">
                      Schritt {STEP_ORDER.indexOf(currentStep) + 1} von {STEP_ORDER.length}
                    </div>
                    <div className="mt-1">{STEP_META[currentStep].title}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="space-y-3">
                  {STEP_ORDER.map((step) => (
                    <StepPill key={step} step={step} currentStep={currentStep} />
                  ))}
                </aside>

                <div className="space-y-4">
                  {currentStep === "club" ? (
                    <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
                      <div className="mb-5">
                        <h2 className="text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
                          Club & Branding
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                          Lege Name, Logo, Farbe und Anzeigeoptionen fest. Das ist die
                          Basis für euren Auftritt in STRIKR.
                        </p>
                      </div>

                      <ClubSettingsCard
                        saved={clubSaved}
                        error={clubError}
                        redirectTo={buildWizardUrl("season")}
                        submitLabel="Speichern & weiter"
                        removeLogoRedirectTo={buildWizardUrl("club")}
                      />

                      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <Link
                          href={buildWizardUrl("season")}
                          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                        >
                          Überspringen
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  {currentStep === "season" ? (
                    <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
                      <div className="mb-5">
                        <h2 className="text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
                          Saison einrichten
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                          Lege eure erste Saison an. Optional kannst du direkt feste
                          Trainingstage wählen, damit STRIKR die Termine automatisch
                          erzeugt.
                        </p>
                      </div>

                      <SeasonSettingsCard
                        message={seasonMessage}
                        error={seasonError}
                        redirectTo={buildWizardUrl("team")}
                        createSubmitLabel="Saison speichern & weiter"
                      />

                      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                        <Link
                          href={buildWizardUrl("club")}
                          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                        >
                          Zurück
                        </Link>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Link
                            href={buildWizardUrl("team")}
                            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                          >
                            Überspringen
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {currentStep === "team" ? (
                    <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
                      <div className="mb-5">
                        <h2 className="text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
                          Teamgenerator festlegen
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                          Entscheide, ob STRIKR bei fairen Teams Kategorien und Stärke
                          berücksichtigen soll.
                        </p>
                      </div>

                      <TeamGeneratorSettingsCard
                        useStrength={settings?.use_strength ?? false}
                        useCategories={settings?.use_categories ?? false}
                        redirectTo={buildWizardUrl("categories")}
                        submitLabel="Speichern & weiter"
                        saved={settingsSaved}
                        error={settingsError}
                      />

                      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                        <Link
                          href={buildWizardUrl("season")}
                          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                        >
                          Zurück
                        </Link>

                        <Link
                          href={buildWizardUrl("categories")}
                          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                        >
                          Überspringen
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  {currentStep === "categories" ? (
                    <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
                      <div className="mb-5">
                        <h2 className="text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
                          Kategorien pflegen
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                          Hier kannst du direkt typische Gruppen wie AH oder Ü32 anlegen.
                          Das ist optional, aber sinnvoll, wenn euer Teamgenerator danach
                          sauber balancieren soll.
                        </p>
                      </div>

                      <CategorySettingsSection
                        categories={categories}
                        useCategories={settings?.use_categories ?? false}
                        redirectTo={buildWizardUrl("categories")}
                        saved={categorySaved}
                        error={categoryError}
                      />

                      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                        <Link
                          href={buildWizardUrl("team")}
                          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                        >
                          Zurück
                        </Link>

                        <Link
                          href={buildWizardUrl("done")}
                          className="inline-flex items-center justify-center rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                        >
                          Weiter zum Abschluss
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  {currentStep === "done" ? (
                    <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
                      <div className="mb-5">
                        <h2 className="text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
                          Setup abgeschlossen
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                          Dein Verein ist jetzt startklar. Als Nächstes lohnt sich meist:
                          Team einladen, erstes Training anlegen und dann den Core Flow in
                          echt durchspielen.
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <Link
                          href="/admin/members"
                          className="rounded-3xl border border-black/10 bg-[#f7f8fb] p-5 transition hover:bg-neutral-50"
                        >
                          <div className="text-base font-semibold text-neutral-950">
                            Spieler einladen
                          </div>
                          <div className="mt-2 text-sm leading-6 text-neutral-600">
                            Hol dein Team in die App, damit Anwesenheit und Teams wirklich
                            Sinn ergeben.
                          </div>
                        </Link>

                        <Link
                          href="/"
                          className="rounded-3xl border border-black/10 bg-[#f7f8fb] p-5 transition hover:bg-neutral-50"
                        >
                          <div className="text-base font-semibold text-neutral-950">
                            Zum Dashboard
                          </div>
                          <div className="mt-2 text-sm leading-6 text-neutral-600">
                            Zurück in den normalen Club-Alltag und weiter mit euren
                            Trainings.
                          </div>
                        </Link>

                        <Link
                          href="/admin/settings"
                          className="rounded-3xl border border-black/10 bg-[#f7f8fb] p-5 transition hover:bg-neutral-50"
                        >
                          <div className="text-base font-semibold text-neutral-950">
                            Volle Einstellungen
                          </div>
                          <div className="mt-2 text-sm leading-6 text-neutral-600">
                            Öffne die komplette Expertenansicht aller Club-Einstellungen.
                          </div>
                        </Link>
                      </div>

                      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                        <Link
                          href={buildWizardUrl("categories")}
                          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                        >
                          Zurück
                        </Link>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Link
                            href="/admin/members"
                            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                          >
                            Erst Spieler einladen
                          </Link>
                          <Link
                            href="/"
                            className="inline-flex items-center justify-center rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                          >
                            Setup verlassen
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {nextStep && currentStep !== "done" ? (
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-neutral-500">
                      Du kannst jeden Schritt auch später noch in{" "}
                      <Link href="/admin/settings" className="font-semibold text-neutral-900 underline">
                        den Einstellungen
                      </Link>{" "}
                      weiter anpassen.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}