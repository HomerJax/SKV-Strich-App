import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import WhatsNewModal from "@/components/WhatsNewModal";

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
  primary_color: string | null;
};

type SetupState = {
  playersCount: number;
  invitesCount: number;
  sessionsCount: number;
  seasonsCount: number;
};

const COLOR_MAP: Record<string, string> = {
  black: "#020617",
  blue: "#1d4ed8",
  red: "#dc2626",
  green: "#16a34a",
};

function StepCard({
  done,
  title,
  text,
  href,
  cta,
}: {
  done: boolean;
  title: string;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-950">{title}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
        </div>

        <div
          className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold ${
            done
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {done ? "Erledigt" : "Offen"}
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const { clubId, memberships } = await requireClub();
  const supabase = await createClient();

  const [
    { data: clubData, error: clubError },
    { count: playersCount, error: playersError },
    { count: invitesCount, error: invitesError },
    { count: sessionsCount, error: sessionsError },
    { count: seasonsCount, error: seasonsError },
  ] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, display_name, logo_path, primary_color")
      .eq("id", clubId)
      .maybeSingle<ClubRow>(),
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_guest", false),
    supabase
      .from("club_invites")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_active", true),
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId),
    supabase
      .from("seasons")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId),
  ]);

  if (clubError) {
    throw new Error(
      `Aktives Team konnte nicht geladen werden: ${clubError.message}`
    );
  }

  if (playersError || invitesError || sessionsError || seasonsError) {
    throw new Error("Die Startdaten konnten nicht vollständig geladen werden.");
  }

  const club = (clubData ?? null) as ClubRow | null;
  const clubName = club?.display_name?.trim() || "Dein Team";
  const hasMultipleClubs = memberships.length > 1;
  const primaryColor =
    COLOR_MAP[club?.primary_color ?? "black"] ?? COLOR_MAP.black;

  const setupState: SetupState = {
    playersCount: playersCount ?? 0,
    invitesCount: invitesCount ?? 0,
    sessionsCount: sessionsCount ?? 0,
    seasonsCount: seasonsCount ?? 0,
  };

  const showGettingStarted =
    setupState.playersCount === 0 ||
    setupState.seasonsCount === 0 ||
    setupState.sessionsCount === 0;

  let clubLogoUrl: string | null = null;

  if (club?.logo_path) {
    const { data } = supabase.storage
      .from("club-logos")
      .getPublicUrl(club.logo_path);

    clubLogoUrl = data?.publicUrl ?? null;
  }

  const feedbackHref = "mailto:mb1607@gmx.de?subject=strikr%20Feedback";

  return (
    <main className="min-h-screen bg-neutral-100 pb-24">
      <WhatsNewModal version="v0.2" />

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div
          className="rounded-[24px] border text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.75)]"
          style={{
            borderColor: `${primaryColor}22`,
            background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 75%)`,
          }}
        >
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-5 py-7 text-center">
            <div
              className="flex items-center gap-3 rounded-full px-4 py-2"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.10)",
              }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-sm">
                {clubLogoUrl ? (
                  <Image
                    src={clubLogoUrl}
                    alt={`${clubName} Logo`}
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                ) : (
                  <Image
                    src="/icon-dark.png"
                    alt="strikr Logo"
                    width={40}
                    height={40}
                    className="h-full w-full object-contain"
                    priority
                  />
                )}
              </div>

              <span className="max-w-[200px] truncate text-sm font-semibold text-white sm:max-w-none sm:text-base">
                {clubName}
              </span>
            </div>

            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              strikr – Das System für euer Training.
            </h1>

            <p className="text-xs leading-5 text-white/80 sm:text-sm">
              faire Teams – effektives Training – echte Stats
            </p>
          </div>
        </div>

        {showGettingStarted ? (
          <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 pt-2">
            <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-500">
                Erste Schritte
              </div>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-950">
                Starte mit den Grundlagen
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Wenn Spieler, Saison und erstes Training stehen, ist dein Team
                sauber eingerichtet.
              </p>
            </div>

            <div className="grid gap-3">
              <StepCard
                done={setupState.playersCount > 0}
                title="Spieler anlegen"
                text="Pflege eure Spielerprofile mit Positionen, Stärken und weiteren Eigenschaften als Basis für Trainings und Teamaufteilungen."
                href="/admin/players"
                cta="Spieler verwalten"
              />

              <StepCard
                done={setupState.seasonsCount > 0}
                title="Saison festlegen"
                text="Lege fest, wie eure Saison heißt und wann sie beginnt und endet. Trainings innerhalb dieses Zeitraums werden automatisch der passenden Saison zugeordnet."
                href="/admin/seasons"
                cta="Saisons öffnen"
              />

              <StepCard
                done={setupState.sessionsCount > 0}
                title="Erstes Training starten"
                text="Erstelle das erste Training und beginne mit Anwesenheiten, Teams und Ergebnissen."
                href="/sessions/new"
                cta="Training erstellen"
              />

              <StepCard
                done={setupState.invitesCount > 0}
                title="Mitglieder einladen"
                text="Optional: Erstelle Einladungslinks und teile sie per WhatsApp, Mail oder Copy-Link mit deinem Team."
                href="/admin/invites"
                cta="Einladungen öffnen"
              />
            </div>

            <a
              href={feedbackHref}
              className="rounded-[24px] border border-black/10 bg-white p-5 text-sm shadow"
            >
              Feedback oder Probleme? → Mail senden
            </a>
          </section>
        ) : (
          <section className="mx-auto flex w-full max-w-2xl flex-col gap-3 pt-2">
            <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-500">
                    Start
                  </div>

                  <h2 className="mt-1 text-2xl font-extrabold text-slate-950">
                    Starte mit einer Trainingssession
                  </h2>

                  <p className="mt-2 text-sm text-slate-600">
                    Erstelle eine neue Session oder springe direkt in eure
                    Trainings und Tabellen.
                  </p>
                </div>

                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${primaryColor}12` }}
                >
                  <Image
                    src="/icon-dark.png"
                    alt="strikr Logo"
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/sessions/new"
                  className="rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Trainingssession starten
                </Link>

                <Link
                  href="/sessions"
                  className="rounded-xl border px-4 py-2.5 text-center text-sm font-semibold"
                >
                  Trainings ansehen
                </Link>

                <Link
                  href="/standings"
                  className="rounded-xl border px-4 py-2.5 text-center text-sm font-semibold"
                >
                  Tabelle ansehen
                </Link>
              </div>

              {hasMultipleClubs ? (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <Link
                    href="/select-club"
                    className="text-sm font-semibold text-slate-700 underline underline-offset-4"
                  >
                    Team wechseln
                  </Link>
                </div>
              ) : null}
            </div>

            <a
              href={feedbackHref}
              className="rounded-[24px] border border-black/10 bg-white p-5 text-sm shadow"
            >
              Feedback oder Probleme? → Mail senden
            </a>
          </section>
        )}
      </section>
    </main>
  );
}