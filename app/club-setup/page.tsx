import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { createClubAction } from "./actions";

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
  value: string | string[] | undefined,
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

type SessionCountRow = {
  count: number | null;
};

type MemberCountRow = {
  count: number | null;
};

function SetupStepCard({
  step,
  title,
  description,
  href,
  cta,
}: {
  step: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.18)] backdrop-blur-sm">
      <div className="mb-3 inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
        {step}
      </div>

      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/70">{description}</p>

      <Link
        href={href}
        className="mt-5 inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:scale-[0.99] hover:bg-white/90"
      >
        {cta}
      </Link>
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
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.18)] backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/70">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export default async function ClubSetupPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const error = getSearchParam(resolvedSearchParams.error);
  const created = getSearchParam(resolvedSearchParams.created) === "1";

  const auth = await getAuthContext();

  if (!auth.user) {
    redirect("/login");
  }

  const memberships = auth.memberships ?? [];
  const hasClub = memberships.length > 0;

  const supabase = await createClient();

  const activeClubId =
    auth.activeClubId ??
    memberships[0]?.club_id ??
    null;

  let createdClub: ClubRow | null = null;
  let sessionCount = 0;
  let memberCount = memberships.length;

  if (activeClubId) {
    const [{ data: clubData }, { count: sessionsCount }, { count: membersCount }] =
      await Promise.all([
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
      ]);

    createdClub = clubData ?? null;
    sessionCount = sessionsCount ?? 0;
    memberCount = membersCount ?? memberCount;
  }

  if (created && hasClub && sessionCount > 0) {
    redirect("/");
  }

  if (!created && hasClub) {
    redirect("/");
  }

  const clubName = createdClub?.display_name?.trim() || "deinem Team";
  const errorMessage = getErrorMessage(error);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <Image
                src="/icon0.svg"
                alt="STRIKR"
                fill
                className="object-contain p-2"
                sizes="40px"
                priority
              />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.2em] text-white/50">
                STRIKR
              </div>
              <div className="text-sm text-white/70">
                {created ? "Setup & nächste Schritte" : "Team starten"}
              </div>
            </div>
          </div>

          <LogoutButton />
        </header>

        {created ? (
          <section className="flex flex-1 items-start justify-center py-4 sm:py-8">
            <div className="w-full max-w-4xl">
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-emerald-500/15 via-white/5 to-white/0 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] sm:p-8">
                <div className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  Team erstellt
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
                  Willkommen bei {clubName}
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                  Stark — dein Team ist angelegt. Jetzt fehlen nur noch die ersten
                  Schritte, damit STRIKR direkt Sinn ergibt und nicht wie ein leeres
                  Dashboard wirkt.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                    {memberCount} {memberCount === 1 ? "Mitglied" : "Mitglieder"}
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                    {sessionCount} {sessionCount === 1 ? "Training" : "Trainings"}
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                    Rolle: Admin
                  </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <SetupStepCard
                    step="Schritt 1"
                    title="Erstes Training anlegen"
                    description="Lege direkt den ersten Termin an. Damit gibst du deinem Team sofort einen klaren Einstieg in den Core Flow."
                    href="/"
                    cta="Zum Dashboard"
                  />

                  <SetupStepCard
                    step="Schritt 2"
                    title="Spieler einladen"
                    description="Hol dein Team rein, damit Anwesenheit, Teamgenerator, Ergebnis und MVP später wirklich funktionieren."
                    href="/admin/members"
                    cta="Spieler einladen"
                  />

                  <SetupStepCard
                    step="Schritt 3"
                    title="Einstellungen prüfen"
                    description="Passe Farben, Saisondaten, Kategorien und weitere Vereins-Einstellungen sauber an dein Team an."
                    href="/admin/settings"
                    cta="Zu den Einstellungen"
                  />
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-neutral-950 transition hover:scale-[0.99] hover:bg-white/90"
                  >
                    Jetzt loslegen
                  </Link>

                  <Link
                    href="/admin/members"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Erst Spieler einladen
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="flex flex-1 items-start justify-center py-4 sm:py-8">
            <div className="w-full max-w-4xl">
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/8 via-white/5 to-white/0 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] sm:p-8">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
                  Dein STRIKR Start
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                  Du bist eingeloggt, aber aktuell noch in keinem Team. Erstelle jetzt
                  dein eigenes Team oder warte auf eine Einladung von einem Admin.
                </p>

                {errorMessage ? (
                  <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                    {errorMessage}
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
                          className="mb-2 block text-sm font-medium text-white/80"
                        >
                          Teamname
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          placeholder="z. B. AH Ditzingen"
                          className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/25"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-neutral-950 transition hover:scale-[0.99] hover:bg-white/90"
                      >
                        Team erstellen
                      </button>
                    </form>
                  </EmptyStateActionCard>

                  <EmptyStateActionCard
                    title="Auf Einladung warten"
                    description="Du wurdest schon eingeladen? Dann musst du jetzt nichts weiter tun. Öffne einfach den Einladungslink deines Teams."
                  >
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/70">
                      Sobald dir ein Admin einen Invite-Link schickt, kannst du dem Team
                      mit einem Klick beitreten. Danach landest du automatisch im
                      richtigen Club-Kontext.
                    </div>

                    <div className="mt-4">
                      <Link
                        href="/"
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        Zurück zur Startseite
                      </Link>
                    </div>
                  </EmptyStateActionCard>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}