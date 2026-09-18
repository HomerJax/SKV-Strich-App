import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Circle,
  Rocket,
  Share2,
  Sparkles,
  Trophy,
  Users,
  WandSparkles,
} from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { createClubAction } from "./actions";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import ClubSetupClubStep from "@/components/club-setup/ClubSetupClubStep";
import ClubSetupInviteActions from "@/components/club-setup/ClubSetupInviteActions";
import TeamGeneratorSettingsCard from "@/components/admin/settings/TeamGeneratorSettingsCard";
import { CategorySettingsSection } from "@/components/admin/settings/CategorySettingsSection";
import { buildAbsoluteInviteUrl } from "@/lib/invites/url";

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

async function getRequestOrigin() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const host = forwardedHost || headerStore.get("host") || "localhost:3000";
  const proto =
    forwardedProto || (host.includes("localhost") ? "http" : "https");

  return `${proto}://${host}`;
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

type SetupStep = "club" | "team" | "categories" | "done";

const STEP_ORDER: SetupStep[] = [
  "club",
  "team",
  "categories",
  "done",
];

const STEP_LABELS: Record<SetupStep, string> = {
  club: "Dein Club",
  team: "Faire Teams",
  categories: "Spielergruppen",
  done: "Team starten",
};

const STEP_COPY: Record<SetupStep, { eyebrow: string; title: string; text: string }> = {
  club: {
    eyebrow: "Dein Auftritt",
    title: "Gib deinem Team ein Gesicht.",
    text: "Name, Logo und Farben – damit sich strikr vom ersten Training an wie euer Club anfühlt.",
  },
  team: {
    eyebrow: "Das Herzstück",
    title: "So baut strikr faire Teams.",
    text: "Du legst nur fest, welche Informationen zählen. strikr kümmert sich danach automatisch um die beste Aufteilung.",
  },
  categories: {
    eyebrow: "Feinschliff",
    title: "Wer spielt bei euch?",
    text: "Mit Spielergruppen kann strikr unterschiedliche Niveaus noch besser einordnen. Nur wenn ihr sie wirklich braucht.",
  },
  done: {
    eyebrow: "Bereit",
    title: "Dein Team kann loslegen.",
    text: "Jetzt noch die Mannschaft reinholen – und aus dem nächsten Training wird eure erste strikr Session.",
  },
};

function getStep(value: string | null): SetupStep {
  if (
    value === "club" ||
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
  const stepIndex = getStepIndex(currentStep);
  const copy = STEP_COPY[currentStep];

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#070b12] p-5 text-white shadow-[0_28px_80px_rgba(2,6,23,0.28)] sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/icon-light.png"
              alt="strikr"
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-2xl"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-black tracking-tight">{clubName}</div>
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">
                strikr setup
              </div>
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[10px] font-black text-white/70">
            {stepIndex + 1}/{STEP_ORDER.length}
          </div>
        </div>

        <div className="mt-6">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-300">
            {copy.eyebrow}
          </div>
          <h1 className="mt-2 max-w-2xl text-3xl font-black leading-[1.03] tracking-[-.045em] sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/55">
            {copy.text}
          </p>
        </div>

        <div className="mt-7 grid grid-cols-4 gap-2">
          {STEP_ORDER.map((step, index) => {
            const done = index < stepIndex;
            const active = index === stepIndex;

            return (
              <div key={step} className="min-w-0">
                <div
                  className={[
                    "h-1.5 rounded-full transition",
                    done || active ? "bg-gradient-to-r from-cyan-300 to-violet-400" : "bg-white/10",
                  ].join(" ")}
                />
                <div className="mt-2 flex items-center gap-1.5">
                  {done ? (
                    <Check className="h-3 w-3 shrink-0 text-cyan-300" />
                  ) : (
                    <Circle className={`h-2.5 w-2.5 shrink-0 ${active ? "fill-white text-white" : "text-white/20"}`} />
                  )}
                  <span className={`truncate text-[9px] font-bold ${active ? "text-white" : done ? "text-white/55" : "text-white/25"}`}>
                    {STEP_LABELS[step]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default async function ClubSetupPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const error = getSearchParam(resolvedSearchParams.error);
  const created = getSearchParam(resolvedSearchParams.created) === "1";
  const currentStep = getStep(getSearchParam(resolvedSearchParams.step));
  const inviteToken = getSearchParam(resolvedSearchParams.invite_token);
  const inviteCreated =
    getSearchParam(resolvedSearchParams.invite_created) === "1";
  const inviteError = getSearchParam(resolvedSearchParams.invite_error);

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

  const origin = await getRequestOrigin();
  const clubName = club?.display_name?.trim() || "dein Team";
  const errorMessage = getErrorMessage(error);
  const inviteUrl = inviteToken
    ? buildAbsoluteInviteUrl(origin, inviteToken)
    : null;

  const clubSaved =
    getSearchParam(resolvedSearchParams.club_saved) === "1" ||
    getSearchParam(resolvedSearchParams.saved) === "1";
  const clubError =
    getSearchParam(resolvedSearchParams.club_error) ??
    getSearchParam(resolvedSearchParams.error) ??
    "";

  const settingsSaved = getSearchParam(resolvedSearchParams.saved) === "1";
  const settingsError = getSearchParam(resolvedSearchParams.error) ?? "";

  const categorySaved =
    getSearchParam(resolvedSearchParams.category_saved) === "1";
  const categoryError = getSearchParam(resolvedSearchParams.category_error) ?? "";

  const useCategories = settings?.use_categories === true;

  if (currentStep === "categories" && !useCategories) {
    redirect(buildWizardUrl("done"));
  }

  const previousStep = getPreviousStep(currentStep);

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(34,211,238,.10),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(124,58,237,.10),transparent_30%),#f5f7fb] text-neutral-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-6">
        {!created ? (
          <section className="relative flex flex-1 items-center justify-center overflow-hidden py-4 sm:py-8">
            <div className="pointer-events-none absolute left-[8%] top-[8%] h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[6%] right-[8%] h-64 w-64 rounded-full bg-violet-500/12 blur-3xl" />

            <div className="relative grid w-full max-w-5xl gap-5 lg:grid-cols-[1.02fr_.98fr]">
              <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#070b12] p-6 text-white shadow-[0_28px_90px_rgba(2,6,23,.26)] sm:p-8">
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-10 h-60 w-60 rounded-full bg-cyan-400/15 blur-3xl" />

                <div className="relative">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/icon-light.png"
                      alt="strikr"
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-2xl"
                      priority
                    />
                    <div>
                      <div className="text-lg font-black tracking-[-.04em]">strikr</div>
                      <div className="text-[9px] font-black uppercase tracking-[.2em] text-white/35">
                        Training redefined.
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    In wenigen Minuten startklar
                  </div>

                  <h1 className="mt-5 max-w-xl text-4xl font-black leading-[.98] tracking-[-.055em] sm:text-5xl">
                    Dein Team.
                    <span className="block bg-gradient-to-r from-white via-cyan-200 to-violet-300 bg-clip-text text-transparent">
                      Deine Saison.
                    </span>
                  </h1>

                  <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-white/58 sm:text-base">
                    Wir richten strikr gemeinsam ein. Danach habt ihr faire Teams, Ergebnisse,
                    Tabelle, Stats und Trophäen – aus euren ganz normalen Trainings.
                  </p>

                  <div className="mt-8 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    {[
                      ["01", "Club anlegen", "Name & Auftritt"],
                      ["02", "Faire Teams", "Generator einstellen"],
                      ["03", "Team reinholen", "Link teilen & loslegen"],
                    ].map(([number, title, text]) => (
                      <div key={number} className="rounded-[20px] border border-white/10 bg-white/5 p-3">
                        <div className="text-[9px] font-black tracking-[.18em] text-cyan-300">{number}</div>
                        <div className="mt-2 text-sm font-black">{title}</div>
                        <div className="mt-1 text-[11px] font-medium text-white/40">{text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,.10)] sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-600">
                      Los geht&apos;s
                    </div>
                    <h2 className="mt-2 text-2xl font-black tracking-[-.035em] text-slate-950 sm:text-3xl">
                      Wie heißt euer Team?
                    </h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                      Mehr brauchen wir für den Start noch nicht.
                    </p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Rocket className="h-5 w-5" />
                  </div>
                </div>

                {errorMessage ? (
                  <div className="mt-5">
                    <Banner tone="error">{errorMessage}</Banner>
                  </div>
                ) : null}

                <form action={createClubAction} className="mt-7 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[.12em] text-slate-500">
                      Teamname
                    </span>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="z. B. SKV Rutesheim AH"
                      autoFocus
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-bold text-slate-950 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    className="group flex w-full items-center justify-between rounded-2xl bg-slate-950 px-5 py-4 text-left text-white shadow-[0_12px_30px_rgba(15,23,42,.18)] transition hover:-translate-y-0.5 hover:bg-slate-900"
                  >
                    <span>
                      <span className="block text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">
                        Schritt 1 starten
                      </span>
                      <span className="mt-0.5 block text-base font-black">Team einrichten</span>
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-950 transition group-hover:translate-x-0.5">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                </form>

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Users className="h-4 w-4" />
                    Du wurdest eingeladen?
                  </div>
                  <p className="mt-2 text-xs font-medium leading-5 text-slate-400">
                    Dann brauchst du keinen eigenen Club anzulegen. Öffne einfach den Einladungslink deines Teams.
                  </p>
                  <Link
                    href="/"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-slate-700 hover:text-slate-950"
                  >
                    Zurück <ArrowRight className="h-3 w-3 rotate-180" />
                  </Link>
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
                    redirectTo={buildWizardUrl("team")}
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

              {currentStep === "team" ? (
                <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-7">
                  <div className="mb-5">
                    <div className="text-sm font-semibold text-neutral-500">
                      Schritt 2
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
                    useCategories={useCategories}
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
                      Schritt 3
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
                    useCategories={useCategories}
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
                  <div className="mx-auto max-w-xl text-center">
                    <div className="text-sm font-semibold text-neutral-500">
                      Glückwunsch
                    </div>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
                      Dein Team „{clubName}“ wurde erstellt.
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-neutral-700 sm:text-base">
                      Das Setup ist abgeschlossen. Lade jetzt deine
                      Teamkameraden ein, damit ihr gemeinsam loslegen könnt.
                    </p>
                  </div>

                  <div className="mt-7 rounded-[1.5rem] border border-black/10 bg-[#f7f8fb] p-4 sm:p-5">
                    <div className="text-sm font-bold text-neutral-950">
                      Teamkameraden einladen
                    </div>
                    <p className="mt-1 text-sm leading-6 text-neutral-600">
                      Erzeuge einen mehrfach nutzbaren Link und teile ihn direkt
                      in eurer WhatsApp- oder Mannschaftsgruppe.
                    </p>

                    <div className="mt-5">
                      {inviteError ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          Der Einladungslink konnte nicht erstellt werden.
                        </div>
                      ) : null}

                      {inviteUrl ? (
                        <ClubSetupInviteActions
                          inviteUrl={inviteUrl}
                          clubName={clubName}
                        />
                      ) : (
                        <form
                          method="post"
                          action="/admin/members/create"
                          className="space-y-3"
                        >
                          <input type="hidden" name="role" value="member" />
                          <input
                            type="hidden"
                            name="redirect_to"
                            value={buildWizardUrl("done")}
                          />

                          <button
                            type="submit"
                            className="inline-flex w-full items-center justify-center rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                          >
                            Einladungslink erzeugen
                          </button>

                          <p className="text-xs leading-5 text-neutral-500">
                            Der Link kann von mehreren Spielern genutzt werden.
                            Du kannst später im Admin-Bereich weitere Links
                            erzeugen oder Rollen anpassen.
                          </p>
                        </form>
                      )}
                    </div>
                  </div>

                  {inviteCreated ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Einladungslink wurde erstellt.
                    </div>
                  ) : null}

                  <div className="mt-8 flex justify-center">
                    <Link
                      href="/"
                      className="inline-flex items-center justify-center rounded-xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    >
                      Los geht’s
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