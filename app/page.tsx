import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { getAuthContext } from "@/lib/auth/context";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import WhatsNewModal from "@/components/WhatsNewModal";

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
  primary_color: string | null;
};

type SessionRow = {
  id: number;
  date: string;
  notes: string | null;
};

const COLOR_MAP: Record<string, string> = {
  black: "#020617",
  blue: "#1d4ed8",
  red: "#dc2626",
  green: "#16a34a",
};

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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

function QuickActionCard({
  title,
  text,
  href,
}: {
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition hover:bg-slate-50"
    >
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs leading-5 text-slate-600">{text}</div>
    </Link>
  );
}

function MainActionCard({
  eyebrow,
  title,
  text,
  href,
  cta,
}: {
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <section className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-500">{eyebrow}</div>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>

      <div className="mt-5">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {cta}
        </Link>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [{ clubId }, ctx] = await Promise.all([requireClub(), getAuthContext()]);
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const featureFlags = await getFeatureFlagsForClub(clubId);
  const mvpVotingEnabled = featureFlags.session_mvp_voting === true;

  const [
    { data: clubData },
    { count: invitesCount },
    { count: sessionsCount },
    { count: seasonsCount },
    { data: nextSessionData },
    { data: recentSessionsData },
  ] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, display_name, logo_path, primary_color")
      .eq("id", clubId)
      .maybeSingle<ClubRow>(),
    supabase
      .from("invites")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId),
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId),
    supabase
      .from("seasons")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId),
    supabase
      .from("sessions")
      .select("id, date, notes")
      .eq("club_id", clubId)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle<SessionRow>(),
    supabase
      .from("sessions")
      .select("id, date, notes")
      .eq("club_id", clubId)
      .order("date", { ascending: false })
      .limit(12),
  ]);

  const club = (clubData ?? null) as ClubRow | null;
  const nextSession = (nextSessionData ?? null) as SessionRow | null;
  const recentSessions = (recentSessionsData ?? []) as SessionRow[];

  const clubName = club?.display_name?.trim() || "Dein Team";

  const selectedColor = club?.primary_color ?? "black";
  const primaryColor = COLOR_MAP[selectedColor] ?? COLOR_MAP.black;

  const heroGradient =
    selectedColor === "black"
      ? "linear-gradient(135deg, #020617 0%, #111827 55%, #374151 100%)"
      : `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 78%)`;

  const showGettingStarted =
    !ctx.isPowerUser &&
    ((sessionsCount ?? 0) === 0 ||
      (seasonsCount ?? 0) === 0 ||
      (invitesCount ?? 0) === 0);

  let clubLogoUrl: string | null = null;

  if (club?.logo_path) {
    const { data } = supabase.storage.from("club-logos").getPublicUrl(club.logo_path);
    clubLogoUrl = data?.publicUrl ?? null;
  }

  const feedbackHref = "mailto:mb1607@gmx.de?subject=strikr%20Feedback";
  const hasSessions = (sessionsCount ?? 0) > 0;

  let activeVotingSession: SessionRow | null = null;

  if (mvpVotingEnabled) {
    activeVotingSession =
      recentSessions.find((session) => {
        const sessionDate = new Date(session.date);
        const now = new Date();
        const diffMs = now.getTime() - sessionDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours >= 0 && diffHours <= 48;
      }) ?? null;
  }

  return (
    <main className="min-h-screen bg-neutral-100 pb-24">
      <WhatsNewModal version="v0.2" />

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div
          className="rounded-[24px] border text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.75)]"
          style={{
            borderColor: `${primaryColor}22`,
            background: heroGradient,
          }}
        >
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-5 py-7 text-center">
            <div className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-2">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">
                {clubLogoUrl ? (
                  <Image
                    src={clubLogoUrl}
                    alt={`${clubName} Logo`}
                    width={48}
                    height={48}
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <Image
                    src="/icon-dark.png"
                    alt="strikr"
                    width={40}
                    height={40}
                  />
                )}
              </div>

              <span className="text-sm font-semibold">{clubName}</span>
            </div>

            <h1 className="text-xl font-extrabold">
              strikr – Das System für euer Training.
            </h1>

            <p className="text-sm text-white/80">
              faire Teams – effektives Training – echte Stats
            </p>

            {ctx.isPowerUser ? (
              <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/90">
                Power User Ansicht
              </div>
            ) : null}
          </div>
        </div>

        {nextSession ? (
          <MainActionCard
            eyebrow="Nächstes Training"
            title={fmtDateLong(nextSession.date)}
            text={
              nextSession.notes?.trim()
                ? nextSession.notes.trim()
                : "Dein nächstes Training ist bereits angelegt."
            }
            href={`/sessions/${nextSession.id}`}
            cta="Zur Session"
          />
        ) : (
          <MainActionCard
            eyebrow="Nächstes Training"
            title="Noch kein Training geplant"
            text="Lege direkt eine neue Session an, damit euer nächstes Training vorbereitet ist."
            href="/sessions/new"
            cta="Training anlegen"
          />
        )}

        {activeVotingSession ? (
          <section className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  MVP Voting läuft
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Stimme jetzt direkt in der Session ab
                </div>
              </div>

              <Link
                href={`/sessions/${activeVotingSession.id}`}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Zum Voting
              </Link>
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <div className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Schnellzugriff
          </div>

          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard
              title="Training anlegen"
              text="Neue Session starten"
              href="/sessions/new"
            />

            <QuickActionCard
              title={hasSessions ? "Sessions" : "Stats & Sessions"}
              text={hasSessions ? "Verlauf ansehen" : "Stats ansehen"}
              href={hasSessions ? "/sessions" : "/stats"}
            />
          </div>
        </section>

        {showGettingStarted ? (
          <section className="flex flex-col gap-3">
            <StepCard
              done={(sessionsCount ?? 0) > 0}
              title="Training starten"
              text="Erstes Training erstellen"
              href="/sessions/new"
              cta="Training starten"
            />

            <StepCard
              done={(invitesCount ?? 0) > 0}
              title="Mitglieder einladen"
              text="Team reinholen"
              href="/admin/invites"
              cta="Einladen"
            />

            <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
              <a
                href={feedbackHref}
                className="text-sm font-medium text-slate-900"
              >
                Feedback senden
              </a>
              <br />
              <Link
                href="/about"
                className="mt-2 inline-block text-sm font-medium text-slate-900"
              >
                Über Strikr ansehen
              </Link>
            </div>
          </section>
        ) : (
          <Link
            href="/about"
            className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-500">Über Strikr</div>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Vom Bierdeckel zur Web-App 🍻⚽
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Angefangen mit Strichen auf Papier, dann Excel und irgendwann die
              Frage: Warum sind Teams eigentlich immer unfair?
              <br />
              Daraus entstand Strikr – mit dem Ziel, Training besser, fairer und
              spannender zu machen.
            </p>

            <div className="mt-3 text-sm font-semibold text-slate-900">
              Geschichte lesen →
            </div>
          </Link>
        )}
      </section>
    </main>
  );
}