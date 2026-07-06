import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, Medal, Star, TrendingUp, Trophy } from "lucide-react";
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
  start_time: string | null;
  notes: string | null;
};

type HomeClubSettingsRow = {
  rsvp_deadline_minutes_before: number | null;
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
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
  mvp_count: number | null;
};

type ClubPlayerStatsRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  mvp_count: number | null;
};

type AttendanceRow = {
  player_id: number;
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

type NextSessionParticipantRow = {
  player_id: number;
  players:
    | {
        first_name: string | null;
        last_name: string | null;
      }
    | {
        first_name: string | null;
        last_name: string | null;
      }[]
    | null;
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


function fmtDateCompact(iso: string) {
  return new Date(iso)
    .toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    })
    .replace(/\.$/, "");
}

function formatSessionTitle(iso: string, startTime: string | null) {
  const dateLabel = fmtDateCompact(iso);
  const timeLabel = startTime?.slice(0, 5);

  return timeLabel ? `${dateLabel} · ${timeLabel} Uhr` : dateLabel;
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

function getSimplePlayerName(
  player:
    | { first_name: string | null; last_name: string | null }
    | null
    | undefined
) {
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

function normalizeSimplePlayerRelation(
  player: NextSessionParticipantRow["players"]
): { first_name: string | null; last_name: string | null } | null {
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

function formatPercent(value: number | null) {
  if (value === null) return "–";
  return `${value}%`;
}

function formatRank(value: number | null) {
  if (!value) return "–";
  return `#${value}`;
}

function getNextStreakTarget(currentStreak: number) {
  if (currentStreak < 5) return 5;
  if (currentStreak < 10) return 10;
  if (currentStreak < 15) return 15;
  return Math.ceil((currentStreak + 1) / 5) * 5;
}

function getNextMvpTarget(currentMvpCount: number) {
  if (currentMvpCount < 3) return 3;
  if (currentMvpCount < 5) return 5;
  if (currentMvpCount < 7) return 7;
  if (currentMvpCount < 10) return 10;
  return Math.ceil((currentMvpCount + 1) / 5) * 5;
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
      <div className="text-sm font-black text-slate-950">{title}</div>
      <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        {text}
      </div>
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
    <section className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{text}</p>

      <div className="mt-4">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
        >
          {cta}
        </Link>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        {hint}
      </div>
    </div>
  );
}

function SeasonSummaryCard({
  attendanceCount,
  attendanceRate,
  currentStreak,
  mvpCount,
  hasLinkedPlayer,
}: {
  attendanceCount: number;
  attendanceRate: number | null;
  currentStreak: number;
  mvpCount: number;
  hasLinkedPlayer: boolean;
}) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Meine Saison
          </div>
          <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">
            Dein aktueller Stand
          </h2>
        </div>

        <Link
          href="/stats"
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700"
        >
          Stats
        </Link>
      </div>

      {hasLinkedPlayer ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MetricCard
            label="Teilnahmen"
            value={String(attendanceCount)}
            hint="bisher dabei"
          />
          <MetricCard
            label="Siegquote"
            value={formatPercent(attendanceRate)}
            hint="Anwesenheit"
          />
          <MetricCard
            label="Serie"
            value={String(currentStreak)}
            hint="Trainings in Folge"
          />
          <MetricCard
            label="Awards"
            value={String(mvpCount)}
            hint="Badges & Votes"
          />
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
          Dein Benutzer ist noch nicht eindeutig mit einem Spielerprofil
          verknüpft. Danach werden hier deine persönlichen Stats angezeigt.
        </div>
      )}
    </section>
  );
}

function RankingSummaryCard({
  attendanceRank,
  mvpRank,
  playerCount,
}: {
  attendanceRank: number | null;
  mvpRank: number | null;
  playerCount: number;
}) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
        Mein Ranking
      </div>
      <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">
        Wo stehe ich?
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MetricCard
          label="Teilnahmen"
          value={formatRank(attendanceRank)}
          hint={playerCount > 0 ? `von ${playerCount} Spielern` : "noch offen"}
        />
        <MetricCard
          label="Awards"
          value={formatRank(mvpRank)}
          hint={playerCount > 0 ? `von ${playerCount} Spielern` : "noch offen"}
        />
      </div>
    </section>
  );
}

function HighlightsCard({
  currentStreak,
  mvpCount,
  hasLinkedPlayer,
}: {
  currentStreak: number;
  mvpCount: number;
  hasLinkedPlayer: boolean;
}) {
  const nextStreakTarget = getNextStreakTarget(currentStreak);
  const streakMissing = Math.max(0, nextStreakTarget - currentStreak);

  const nextMvpTarget = getNextMvpTarget(mvpCount);
  const mvpMissing = Math.max(0, nextMvpTarget - mvpCount);

  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
        Nächste Highlights
      </div>
      <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">
        Was kommt als nächstes?
      </h2>

      {hasLinkedPlayer ? (
        <div className="mt-4 space-y-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-black text-slate-950">
              {streakMissing === 0
                ? `Serie ${nextStreakTarget} erreicht`
                : `Noch ${streakMissing} bis zur ${nextStreakTarget}er-Serie`}
            </div>
            <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Aktuelle Serie: {currentStreak} Trainings in Folge.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-black text-slate-950">
              {mvpMissing === 0
                ? `MVP-Ziel ${nextMvpTarget} erreicht`
                : `Noch ${mvpMissing} MVP bis zum nächsten Badge-Ziel`}
            </div>
            <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Aktuell: {mvpCount} MVP-Auszeichnungen.
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-500">
          Highlights erscheinen, sobald dein Spielerprofil verknüpft ist.
        </div>
      )}
    </section>
  );
}


function MiniStatCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  tone: "blue" | "emerald" | "violet" | "amber";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    amber: "bg-amber-50 text-amber-500 ring-amber-100",
  }[tone];

  return (
    <div className="min-w-0 rounded-[22px] border border-slate-200 bg-white px-2 py-3 text-center shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-xl ring-1 ${toneClass}`}>
        {icon}
      </div>
      <div className="mt-2 truncate text-base font-semibold tracking-[-0.03em] text-slate-950">
        {value}
      </div>
      <div className="whitespace-nowrap text-[9px] font-medium leading-tight text-slate-500">
        {label}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const [clubAccess, ctx] = await Promise.all([requireClub(), getAuthContext()]);
  const { clubId, membership, isPowerUser } = clubAccess;
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const featureFlags = await getFeatureFlagsForClub(clubId);
  const mvpVotingEnabled = featureFlags.session_mvp_voting === true;
  const homeSessionRsvpEnabled = featureFlags.home_session_rsvp === true;
  const isAdmin =
    isPowerUser || membership.role === "admin" || membership.role === "owner";

  const [
    { data: clubData },
    { data: homeSettingsData },
    { count: invitesCount },
    { count: sessionsCount },
    { count: pastSessionsCount },
    { count: seasonsCount },
    { data: nextSessionData },
    { data: recentSessionsData },
    { data: pastSessionsData },
    authResult,
  ] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, display_name, logo_path, primary_color")
      .eq("id", clubId)
      .maybeSingle<ClubRow>(),
    supabase
      .from("club_settings")
      .select("rsvp_deadline_minutes_before")
      .eq("club_id", clubId)
      .maybeSingle<HomeClubSettingsRow>(),
    supabase
      .from("invites")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId),
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId),
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .lte("date", today),
    supabase
      .from("seasons")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId),
    supabase
      .from("sessions")
      .select("id, date, start_time, notes")
      .eq("club_id", clubId)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle<SessionRow>(),
    supabase
      .from("sessions")
      .select("id, date, start_time, notes")
      .eq("club_id", clubId)
      .order("date", { ascending: false })
      .limit(12),
    supabase
      .from("sessions")
      .select("id, date, start_time, notes")
      .eq("club_id", clubId)
      .lte("date", today)
      .order("date", { ascending: false })
      .limit(20),
    supabase.auth.getUser(),
  ]);

  const club = (clubData ?? null) as ClubRow | null;
  const homeSettings = (homeSettingsData ?? null) as HomeClubSettingsRow | null;
  const rsvpDeadlineMinutesBefore =
    homeSettings?.rsvp_deadline_minutes_before ?? 30;
  const nextSession = (nextSessionData ?? null) as SessionRow | null;
  const recentSessions = (recentSessionsData ?? []) as SessionRow[];
  const pastSessions = (pastSessionsData ?? []) as SessionRow[];

  const clubName = club?.display_name?.trim() || "Dein Team";
  const userId = authResult.data.user?.id ?? null;
  const userEmail = authResult.data.user?.email?.trim().toLowerCase() ?? null;

  let currentPlayer: PlayerRow | null = null;

  if (userId) {
    const { data } = await supabase
      .from("players")
      .select("id, email, first_name, last_name, user_id, mvp_count")
      .eq("club_id", clubId)
      .eq("user_id", userId)
      .maybeSingle<PlayerRow>();

    currentPlayer = data ?? null;
  }

  if (!currentPlayer && userEmail) {
    const { data } = await supabase
      .from("players")
      .select("id, email, first_name, last_name, user_id, mvp_count")
      .eq("club_id", clubId)
      .eq("email", userEmail)
      .maybeSingle<PlayerRow>();

    currentPlayer = data ?? null;
  }

  const showGettingStarted =
    isAdmin &&
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
      const winners =
        topVotes > 0
          ? leaderboard.filter((entry) => entry.votes === topVotes)
          : [];

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
  let nextSessionParticipantNames: string[] = [];

  if (homeSessionRsvpEnabled && nextSession) {
    const [{ count: nextSessionPresentCountValue }, { data: participantRows }] =
      await Promise.all([
        supabase
          .from("session_players")
          .select("*", { count: "exact", head: true })
          .eq("session_id", nextSession.id),
        supabase
          .from("session_players")
          .select(
            `
            player_id,
            players (
              first_name,
              last_name
            )
          `
          )
          .eq("session_id", nextSession.id),
      ]);

    nextSessionPresentCount = nextSessionPresentCountValue ?? 0;

    nextSessionParticipantNames = ((participantRows ?? []) as NextSessionParticipantRow[])
      .map((row) => getSimplePlayerName(normalizeSimplePlayerRelation(row.players)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "de"));

    if (currentPlayer?.id) {
      const { data: selfPresence } = await supabase
        .from("session_players")
        .select("player_id")
        .eq("session_id", nextSession.id)
        .eq("player_id", currentPlayer.id)
        .maybeSingle();

      nextSessionPresenceStatus = selfPresence ? "in" : "open";
    }
  }

  let personalAttendanceCount = 0;
  let attendanceRate: number | null = null;
  let currentStreak = 0;
  let attendanceRank: number | null = null;
  let mvpRank: number | null = null;
  let clubPlayerCount = 0;
  const currentMvpCount = safeMvpCount(currentPlayer?.mvp_count);

  if (currentPlayer?.id) {
    const { count: personalAttendanceCountValue } = await supabase
      .from("session_players")
      .select("*", { count: "exact", head: true })
      .eq("player_id", currentPlayer.id);

    personalAttendanceCount = personalAttendanceCountValue ?? 0;

    const pastCount = pastSessionsCount ?? 0;
    attendanceRate =
      pastCount > 0 ? Math.round((personalAttendanceCount / pastCount) * 100) : null;

    const { data: clubPlayersData } = await supabase
      .from("players")
      .select("id, first_name, last_name, mvp_count")
      .eq("club_id", clubId);

    const clubPlayers = (clubPlayersData ?? []) as ClubPlayerStatsRow[];
    clubPlayerCount = clubPlayers.length;

    const clubPlayerIds = clubPlayers
      .map((player) => Number(player.id))
      .filter((id) => Number.isFinite(id));

    if (clubPlayerIds.length > 0) {
      const { data: allAttendanceRows } = await supabase
        .from("session_players")
        .select("player_id")
        .in("player_id", clubPlayerIds);

      const attendanceCounts = new Map<number, number>();

      for (const row of (allAttendanceRows ?? []) as AttendanceRow[]) {
        const playerId = Number(row.player_id);
        attendanceCounts.set(playerId, (attendanceCounts.get(playerId) ?? 0) + 1);
      }

      const currentAttendance = attendanceCounts.get(currentPlayer.id) ?? 0;
      attendanceRank =
        1 +
        clubPlayers.filter((player) => {
          const count = attendanceCounts.get(player.id) ?? 0;
          return count > currentAttendance;
        }).length;

      mvpRank =
        1 +
        clubPlayers.filter(
          (player) => safeMvpCount(player.mvp_count) > currentMvpCount
        ).length;
    }

    const pastSessionIds = pastSessions.map((session) => session.id);

    if (pastSessionIds.length > 0) {
      const { data: recentPresenceRows } = await supabase
        .from("session_players")
        .select("session_id")
        .eq("player_id", currentPlayer.id)
        .in("session_id", pastSessionIds);

      const presentSessionIds = new Set(
        ((recentPresenceRows ?? []) as { session_id: number }[]).map((row) =>
          Number(row.session_id)
        )
      );

      for (const session of pastSessions) {
        if (presentSessionIds.has(session.id)) {
          currentStreak += 1;
        } else {
          break;
        }
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
          description="Training checken. Stats ansehen. Fertig."
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
                Zu-/Absagen
              </div>
              <div className="inline-flex min-h-7 items-center justify-center rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/90">
                Stats
              </div>
              {ctx.isPowerUser ? (
                <div className="inline-flex min-h-7 items-center justify-center rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/90">
                  Power User
                </div>
              ) : null}
            </>
          }
          compact
        />

        {nextSession ? (
          homeSessionRsvpEnabled ? (
            <NextSessionAttendanceCard
              sessionId={nextSession.id}
              title={formatSessionTitle(nextSession.date, nextSession.start_time)}
              text={
                nextSession.notes?.trim()
                  ? nextSession.notes.trim()
                  : "Check kurz deine Teilnahme und wer dabei ist."
              }
              href={`/sessions/${nextSession.id}`}
              initialStatus={nextSessionPresenceStatus}
              initialPresentCount={nextSessionPresentCount}
              sessionDate={nextSession.date}
              startTime={nextSession.start_time}
              rsvpDeadlineMinutesBefore={rsvpDeadlineMinutesBefore}
              participantNames={nextSessionParticipantNames}
            />
          ) : (
            <MainActionCard
              eyebrow="Nächstes Training"
              title={formatSessionTitle(nextSession.date, nextSession.start_time)}
              text={
                nextSession.notes?.trim()
                  ? nextSession.notes.trim()
                  : "Dein nächstes Training ist bereits angelegt."
              }
              href={`/sessions/${nextSession.id}`}
              cta="Training ansehen"
            />
          )
        ) : (
          <MainActionCard
            eyebrow="Nächstes Training"
            title="Noch kein Training geplant"
            text={
              isAdmin
                ? "Lege direkt ein neues Training an, damit dein Team planen kann."
                : "Sobald ein Admin das nächste Training anlegt, kannst du hier zu- oder absagen."
            }
            href={isAdmin ? "/sessions/new" : "/sessions"}
            cta={isAdmin ? "Training anlegen" : "Sessions ansehen"}
          />
        )}

        <section className="rounded-[32px] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.09)] ring-1 ring-slate-950/5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
            Meine Kurzinfo
          </div>

          {currentPlayer ? (
            <>
              <div className="mt-4 grid grid-cols-4 gap-2.5">
                <MiniStatCard
                  icon={<CalendarDays className="h-4 w-4" />}
                  value={String(personalAttendanceCount)}
                  label="Teilnahmen"
                  tone="blue"
                />

                <MiniStatCard
                  icon={<TrendingUp className="h-4 w-4" />}
                  value="?"
                  label="Siegquote"
                  tone="emerald"
                />

                <MiniStatCard
                  icon={<Medal className="h-4 w-4" />}
                  value={formatRank(attendanceRank)}
                  label="Tabelle"
                  tone="violet"
                />

                <MiniStatCard
                  icon={<Star className="h-4 w-4" />}
                  value="?"
                  label="Awards"
                  tone="amber"
                />
              </div>

              {currentStreak > 0 ? (
                <div className="mt-3 rounded-[22px] bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
                  Noch {Math.max(0, getNextStreakTarget(currentStreak) - currentStreak)} bis zur {getNextStreakTarget(currentStreak)}er-Serie
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/stats"
                  className="flex min-h-10 items-center justify-between rounded-2xl bg-slate-950 px-3 text-[13px] font-semibold text-white transition hover:bg-slate-800"
                >
                  <span>Mein Fortschritt</span>
                  <span aria-hidden="true">→</span>
                </Link>

                <Link
                  href="/standings"
                  className="flex min-h-10 items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  <span>Tabelle</span>
                  <Trophy className="h-4 w-4 text-slate-500" />
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-medium text-slate-600">
              Dein Profil ist noch nicht mit einem Spieler verknüpft.
            </div>
          )}
        </section>

        {activeVotingSession ? (
          <section className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-800">
                  MVP Voting läuft
                </div>
                <div className="mt-1 text-sm font-black text-slate-950">
                  Abstimmung offen
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-600">
                  {activeVotingSession.voteCount}/
                  {activeVotingSession.eligibleVoterCount} Stimmen
                </div>
              </div>

              <Link
                href={`/sessions/${activeVotingSession.id}`}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-3 py-2 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Abstimmen
              </Link>
            </div>
          </section>
        ) : null}

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

        <section className="space-y-2">
          <div className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Mehr
          </div>

          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard
              title="Stats komplett"
              text="Alle Zahlen ansehen"
              href="/stats"
            />

            <QuickActionCard
              title={hasSessions ? "Sessions" : "Archiv"}
              text={hasSessions ? "Trainingsverlauf" : "Noch leer"}
              href="/sessions"
            />

            {isAdmin ? (
              <>
                <QuickActionCard
                  title="Training anlegen"
                  text="Admin-Aktion"
                  href="/sessions/new"
                />

                <QuickActionCard
                  title="Admin"
                  text="Club verwalten"
                  href="/admin"
                />
              </>
            ) : null}
          </div>
        </section>

        {showGettingStarted ? (
          <section className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Admin Setup
            </div>
            <h2 className="mt-1 text-lg font-black text-slate-950">
              Club fertig einrichten
            </h2>
            <div className="mt-3 grid gap-2">
              {(sessionsCount ?? 0) === 0 ? (
                <Link
                  href="/sessions/new"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-800"
                >
                  Erstes Training anlegen
                </Link>
              ) : null}

              {(invitesCount ?? 0) === 0 ? (
                <Link
                  href="/admin/invites"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-800"
                >
                  Mitglieder einladen
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

        <Link
          href="/about"
          className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="text-sm font-black text-slate-500">Über strikr</div>

          <h2 className="mt-1 text-lg font-black text-slate-950">
            Vom Bierdeckel zur Web-App 🍻⚽
          </h2>

          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            Angefangen mit Strichen auf Papier, dann Excel und irgendwann die
            Frage: Warum sind Teams eigentlich immer unfair?
          </p>

          <div className="mt-3 text-sm font-black text-slate-900">
            Geschichte lesen →
          </div>
        </Link>
      </section>
    </main>
  );
}
