import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { getAuthContext } from "@/lib/auth/context";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import WhatsNewModal from "@/components/WhatsNewModal";
import NextSessionAttendanceCard from "@/components/home/NextSessionAttendanceCard";
import HomeMvpHighlightCard from "@/components/home/HomeMvpHighlightCard";
import PageHero from "@/components/ui/PageHero";
import type { LeaderboardEntry } from "@/components/share/mvp-share/mvp-share.types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type ResultSessionRow = {
  session_id: number;
};

type SessionPlayerCountRow = {
  session_id: number;
};

type VoteRow = {
  session_id: number;
  voted_player_id?: number;
};

type PlayerRow = {
  id: number;
  email: string | null;
};

type MvpPlayerRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
  mvp_count: number | null;
};

type MvpSessionPlayerRow = {
  player_id: number;
  players: MvpPlayerRow | MvpPlayerRow[] | null;
};

type MvpVoteRow = {
  voted_player_id: number;
};

type HomeMvpHighlight = {
  notificationKey: string;
  sessionId: number;
  sessionHref: string;
  sessionDateLabel: string;
  isWinner: boolean;
  winner: LeaderboardEntry;
  winners: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
  badgeImageUrl: string;
};

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getPartsInBerlin(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    timeKey: `${map.hour}:${map.minute}`,
  };
}

function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);

  if (!year || !month || !day) {
    return dateString;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + days);

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function isVotingOpen(sessionDate: string) {
  const revealDate = addDays(sessionDate, 2);
  const now = getPartsInBerlin(new Date());

  return (
    now.dateKey < revealDate ||
    (now.dateKey === revealDate && now.timeKey < "18:00")
  );
}

function getPlayerName(player: MvpPlayerRow | null | undefined) {
  if (!player) return "Spieler";

  const name = [player.first_name, player.last_name]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Spieler";
}

function normalizePlayerRelation(
  player: MvpSessionPlayerRow["players"]
): MvpPlayerRow | null {
  if (!player) return null;
  if (Array.isArray(player)) return player[0] ?? null;
  return player;
}

function safeMvpCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getBadgeLabel(count: number) {
  if (count >= 10) return "GOAT";
  if (count >= 7) return "Gold";
  if (count >= 5) return "Silber";
  if (count >= 3) return "Bronze";
  return "Blech";
}

function getBadgeKey(count: number) {
  if (count >= 10) return "goat";
  if (count >= 7) return "gold";
  if (count >= 5) return "silber";
  if (count >= 3) return "bronze";
  return "blech";
}

function toLeaderboardEntry(params: {
  playerId: number;
  name: string;
  votes: number;
  current: number;
}): LeaderboardEntry {
  const { playerId, name, votes, current } = params;
  const previous = Math.max(current - 1, 0);
  const badgeLabel = getBadgeLabel(current);

  return {
    playerId,
    name,
    votes,
    previous,
    current,
    badgeLabel,
    earnedBadgeText: `${badgeLabel} strikr badge`,
  };
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
    <div className="rounded-[20px] border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">{title}</div>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">{text}</p>
        </div>

        <div
          className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-semibold ${
            done
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {done ? "Erledigt" : "Offen"}
        </div>
      </div>

      <div className="mt-3">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
      className="rounded-2xl border border-black/10 bg-white p-3.5 shadow-sm transition hover:bg-slate-50"
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
    <section className="rounded-[22px] border border-black/10 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>

      <div className="mt-4">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
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
  const homeSessionRsvpEnabled = featureFlags.home_session_rsvp === true;

  const [
    { data: clubData },
    { count: invitesCount },
    { count: sessionsCount },
    { count: seasonsCount },
    { data: nextSessionData },
    { data: recentSessionsData },
    authResult,
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
    supabase.auth.getUser(),
  ]);

  const club = (clubData ?? null) as ClubRow | null;
  const nextSession = (nextSessionData ?? null) as SessionRow | null;
  const recentSessions = (recentSessionsData ?? []) as SessionRow[];

  const clubName = club?.display_name?.trim() || "Dein Team";
  const showGettingStarted =
    !ctx.isPowerUser &&
    ((sessionsCount ?? 0) === 0 ||
      (seasonsCount ?? 0) === 0 ||
      (invitesCount ?? 0) === 0);

  let clubLogoUrl: string | null = null;

  if (club?.logo_path) {
    const { data } = supabase.storage
      .from("club-logos")
      .getPublicUrl(club.logo_path);

    clubLogoUrl = data?.publicUrl ?? null;
  }

  const feedbackHref = "mailto:mb1607@gmx.de?subject=strikr%20Feedback";
  const hasSessions = (sessionsCount ?? 0) > 0;
  const recentSessionIds = recentSessions.map((session) => session.id);

  let activeVotingSession:
    | (SessionRow & { voteCount: number; eligibleVoterCount: number })
    | null = null;

  let mvpHighlight: HomeMvpHighlight | null = null;

  if (mvpVotingEnabled && recentSessionIds.length > 0) {
    const [{ data: resultsData }, { data: sessionPlayersData }, { data: votesData }] =
      await Promise.all([
        supabase
          .from("results")
          .select("session_id")
          .in("session_id", recentSessionIds),
        supabase
          .from("session_players")
          .select("session_id")
          .in("session_id", recentSessionIds),
        supabase
          .from("session_mvp_votes")
          .select("session_id, voted_player_id")
          .in("session_id", recentSessionIds),
      ]);

    const resultSessionIds = new Set(
      ((resultsData ?? []) as ResultSessionRow[]).map((row) =>
        Number(row.session_id)
      )
    );

    const eligibleCountBySession = new Map<number, number>();
    for (const row of (sessionPlayersData ?? []) as SessionPlayerCountRow[]) {
      const sessionId = Number(row.session_id);
      eligibleCountBySession.set(
        sessionId,
        (eligibleCountBySession.get(sessionId) ?? 0) + 1
      );
    }

    const voteCountBySession = new Map<number, number>();
    for (const row of (votesData ?? []) as VoteRow[]) {
      const sessionId = Number(row.session_id);
      voteCountBySession.set(
        sessionId,
        (voteCountBySession.get(sessionId) ?? 0) + 1
      );
    }

    const found =
      recentSessions.find(
        (session) =>
          resultSessionIds.has(session.id) && isVotingOpen(session.date)
      ) ?? null;

    activeVotingSession = found
      ? {
          ...found,
          voteCount: voteCountBySession.get(found.id) ?? 0,
          eligibleVoterCount: eligibleCountBySession.get(found.id) ?? 0,
        }
      : null;

    const latestRevealedSession =
      recentSessions.find(
        (session) =>
          resultSessionIds.has(session.id) && !isVotingOpen(session.date)
      ) ?? null;

    if (latestRevealedSession) {
      const [{ data: mvpPlayersData }, { data: mvpVotesData }] =
        await Promise.all([
          supabase
            .from("session_players")
            .select(
              `
              player_id,
              players (
                id,
                first_name,
                last_name,
                user_id,
                mvp_count
              )
            `
            )
            .eq("session_id", latestRevealedSession.id),
          supabase
            .from("session_mvp_votes")
            .select("voted_player_id")
            .eq("session_id", latestRevealedSession.id),
        ]);

      const participants = ((mvpPlayersData ?? []) as MvpSessionPlayerRow[])
        .map((row) => {
          const player = normalizePlayerRelation(row.players);
          if (!player) return null;

          return {
            playerId: row.player_id,
            name: getPlayerName(player),
            userId: player.user_id,
            current: safeMvpCount(player.mvp_count),
          };
        })
        .filter(
          (
            value
          ): value is {
            playerId: number;
            name: string;
            userId: string | null;
            current: number;
          } => value !== null
        );

      const participantByPlayerId = new Map(
        participants.map((participant) => [participant.playerId, participant])
      );

      const counts = new Map<number, number>();
      for (const vote of (mvpVotesData ?? []) as MvpVoteRow[]) {
        const playerId = Number(vote.voted_player_id);
        counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
      }

      const leaderboard = [...counts.entries()]
        .map(([playerId, votes]) => {
          const participant = participantByPlayerId.get(playerId);
          return toLeaderboardEntry({
            playerId,
            votes,
            name: participant?.name ?? "Spieler",
            current: Math.max(participant?.current ?? 1, 1),
          });
        })
        .sort((a, b) =>
          b.votes !== a.votes
            ? b.votes - a.votes
            : a.name.localeCompare(b.name, "de")
        );

      const winner = leaderboard[0] ?? null;
      const topVotes = winner?.votes ?? 0;
      const winners = topVotes > 0
        ? leaderboard.filter((entry) => entry.votes === topVotes)
        : [];
      const userId = authResult.data.user?.id ?? null;

      if (winner) {
        const currentUserWinner =
          userId
            ? winners.find((entry) => {
                const participant = participantByPlayerId.get(entry.playerId);
                return participant?.userId === userId;
              }) ?? null
            : null;

        const displayWinner = currentUserWinner ?? winner;
        const isWinner = Boolean(currentUserWinner);

        const badgeKey = getBadgeKey(displayWinner.current);

        mvpHighlight = {
          notificationKey: `home:mvp-highlight:${clubId}:${latestRevealedSession.id}`,
          sessionId: latestRevealedSession.id,
          sessionHref: `/sessions/${latestRevealedSession.id}`,
          sessionDateLabel: fmtDateLong(latestRevealedSession.date),
          isWinner,
          winner: displayWinner,
          winners,
          leaderboard,
          badgeImageUrl: `/badges/hero/${badgeKey}.webp`,
        };
      }
    }
  }

  let nextSessionPresenceStatus: "in" | "out" | "open" = "open";
  let nextSessionPresentCount = 0;

  if (homeSessionRsvpEnabled && nextSession) {
    const [{ count: nextSessionPresentCountValue }, authUserResult] =
      await Promise.all([
        supabase
          .from("session_players")
          .select("*", { count: "exact", head: true })
          .eq("session_id", nextSession.id),
        Promise.resolve(authResult),
      ]);

    nextSessionPresentCount = nextSessionPresentCountValue ?? 0;

    const userEmail =
      authUserResult.data.user?.email?.trim().toLowerCase() ?? null;

    if (userEmail) {
      const { data: playerData } = await supabase
        .from("players")
        .select("id, email")
        .eq("club_id", clubId)
        .eq("email", userEmail)
        .maybeSingle<PlayerRow>();

      const playerId = playerData?.id ?? null;

      if (playerId) {
        const { data: selfPresence } = await supabase
          .from("session_players")
          .select("player_id")
          .eq("session_id", nextSession.id)
          .eq("player_id", playerId)
          .maybeSingle();

        nextSessionPresenceStatus = selfPresence ? "in" : "open";
      }
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100 pb-24">
      <WhatsNewModal version="v0.2" />

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <PageHero
          primaryColorKey={club?.primary_color ?? "black"}
          title={clubName}
          description="strikr – Das System für euer Training."
          align="center"
          centerSlot={
            clubLogoUrl ? (
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm">
                <Image
                  src={clubLogoUrl}
                  alt={`${clubName} Logo`}
                  width={56}
                  height={56}
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm">
                <Image
                  src="/icon-dark.png"
                  alt="strikr"
                  width={40}
                  height={40}
                />
              </div>
            )
          }
          actionsSlot={
            <>
              <div className="inline-flex min-h-7 items-center justify-center rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/90">
                faire Teams
              </div>
              <div className="inline-flex min-h-7 items-center justify-center rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/90">
                effektives Training
              </div>
              <div className="inline-flex min-h-7 items-center justify-center rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/90">
                echte Stats
              </div>
              {ctx.isPowerUser ? (
                <div className="inline-flex min-h-7 items-center justify-center rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/90">
                  Power User Ansicht
                </div>
              ) : null}
            </>
          }
          compact
        />

        {mvpHighlight ? (
          <HomeMvpHighlightCard
            notificationKey={mvpHighlight.notificationKey}
            sessionId={mvpHighlight.sessionId}
            sessionHref={mvpHighlight.sessionHref}
            clubName={clubName}
            clubLogoUrl={clubLogoUrl}
            strikrLogoUrl="/brand/strikr-mark.png"
            sessionDateLabel={mvpHighlight.sessionDateLabel}
            isWinner={mvpHighlight.isWinner}
            winner={mvpHighlight.winner}
            winners={mvpHighlight.winners}
            leaderboard={mvpHighlight.leaderboard}
            badgeImageUrl={mvpHighlight.badgeImageUrl}
          />
        ) : null}

        {nextSession ? (
          homeSessionRsvpEnabled ? (
            <NextSessionAttendanceCard
              sessionId={nextSession.id}
              title={fmtDateLong(nextSession.date)}
              text={
                nextSession.notes?.trim()
                  ? nextSession.notes.trim()
                  : "Dein nächstes Training ist bereits angelegt."
              }
              href={`/sessions/${nextSession.id}`}
              initialStatus={nextSessionPresenceStatus}
              initialPresentCount={nextSessionPresentCount}
            />
          ) : (
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
          )
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
          <section className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                  MVP Voting läuft
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Stimme jetzt direkt in der Session ab
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {activeVotingSession.voteCount}/
                  {activeVotingSession.eligibleVoterCount} Stimmen
                </div>
              </div>

              <Link
                href={`/sessions/${activeVotingSession.id}`}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Zum Voting
              </Link>
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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

            <div className="rounded-[20px] border border-black/10 bg-white p-4 shadow-sm">
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
                Über strikr ansehen
              </Link>
            </div>
          </section>
        ) : (
          <Link
            href="/about"
            className="rounded-[20px] border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-500">
              Über strikr
            </div>

            <h2 className="mt-1 text-lg font-bold text-slate-950">
              Vom Bierdeckel zur Web-App 🍻⚽
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Angefangen mit Strichen auf Papier, dann Excel und irgendwann die
              Frage: Warum sind Teams eigentlich immer unfair?
              <br />
              Daraus entstand strikr – mit dem Ziel, Training besser, fairer und
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