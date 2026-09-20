import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, Instagram, Medal, Star, TrendingUp, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import WhatsNewModal from "@/components/WhatsNewModal";
import NextSessionAttendanceCard from "@/components/home/NextSessionAttendanceCard";
import HomeQuickStats from "@/components/home/HomeQuickStats";
import HomeMvpHighlightCard from "@/components/home/HomeMvpHighlightCard";
import HomeBeerCheckoutModal from "@/components/home/HomeBeerCheckoutModal";
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
  rsvp_deadline_minutes_before: number | null;
  notes: string | null;
};

type SeasonRow = {
  id: number;
  start_date: string | null;
  end_date: string | null;
};

type SeasonSessionRow = {
  id: number;
  date: string;
};

type HomeClubSettingsRow = {
  rsvp_deadline_minutes_before: number | null;
  require_rsvp_reason_on_absence: boolean | null;
  beerkasse_premium_enabled: boolean | null;
  beerkasse_enabled: boolean | null;
  beerkasse_home_enabled: boolean | null;
  beerkasse_paypal_url: string | null;
  beerkasse_price_cents: number | null;
};

type ResultSessionRow = {
  session_id: number;
};

type HomeResultRow = {
  session_id: number;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

type HomeTeamPlayerRow = {
  team_id: number;
  player_id: number;
};

type SessionPlayerCountRow = {
  session_id: number;
};

type VoteRow = {
  session_id: number;
  voted_player_id?: number;
};

type ClubPlayerStatsRow = {
  id: number;
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

type NextSessionAbsentRow = {
  player_id: number;
  reason: string | null;
  players: NextSessionParticipantRow["players"];
};

type HomeMvpHighlight = {
  notificationKey: string;
  sessionId: number;
  sessionHref: string;
  isWinner: boolean;
  winner: LeaderboardEntry;
  winners: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
  sessionDateLabel: string;
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

function isDateWithinSeason(dateIso: string, season: SeasonRow) {
  if (!season.start_date || !season.end_date) return false;
  return dateIso >= season.start_date && dateIso <= season.end_date;
}

function getCurrentSeason(seasons: SeasonRow[], today: string) {
  const current = seasons.find((season) => isDateWithinSeason(today, season));
  if (current) return current;
  return seasons[0] ?? null;
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

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ beer_error?: string; beer_saved?: string }> }) {
  const q = await searchParams;
  const clubAccess = await requireClub();
  const { clubId, membership, isPowerUser, user, player } = clubAccess;
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const isAdmin =
    isPowerUser || membership.role === "admin" || membership.role === "owner";
  const currentPlayerId = player?.id ?? null;

  const [
    featureFlags,
    { data: clubData },
    { data: homeSettingsData },
    { count: invitesCount },
    { count: sessionsCount },
    { data: seasonExistsData },
    { data: nextSessionData },
    { data: recentSessionsData },
  ] = await Promise.all([
    getFeatureFlagsForClub(clubId),
    supabase
      .from("clubs")
      .select("id, display_name, logo_path, primary_color")
      .eq("id", clubId)
      .maybeSingle<ClubRow>(),
    supabase
      .from("club_settings")
      .select(
        "rsvp_deadline_minutes_before, require_rsvp_reason_on_absence, beerkasse_premium_enabled, beerkasse_enabled, beerkasse_home_enabled, beerkasse_paypal_url, beerkasse_price_cents"
      )
      .eq("club_id", clubId)
      .maybeSingle<HomeClubSettingsRow>(),
    supabase
      .from("invites")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId),
    supabase
      .from("seasons")
      .select("id")
      .eq("club_id", clubId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("id, date, start_time, rsvp_deadline_minutes_before, notes")
      .eq("club_id", clubId)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle<SessionRow>(),
    supabase
      .from("sessions")
      .select("id, date, start_time, rsvp_deadline_minutes_before, notes")
      .eq("club_id", clubId)
      .order("date", { ascending: false })
      .limit(12),
  ]);

  const mvpVotingEnabled = featureFlags.session_mvp_voting === true;
  const homeSessionRsvpEnabled = featureFlags.home_session_rsvp === true;
  const club = (clubData ?? null) as ClubRow | null;
  const homeSettings = (homeSettingsData ?? null) as HomeClubSettingsRow | null;
  const rsvpDeadlineMinutesBefore =
    homeSettings?.rsvp_deadline_minutes_before ?? 60;
  const requireRsvpReasonOnAbsence =
    homeSettings?.require_rsvp_reason_on_absence === true;
  const bierkasseHomeEnabled =
    homeSettings?.beerkasse_premium_enabled === true &&
    homeSettings?.beerkasse_enabled === true &&
    homeSettings?.beerkasse_home_enabled === true;
  const bierkassePaypalEnabled = Boolean(homeSettings?.beerkasse_paypal_url?.trim());
  const bierkassePriceCents = Math.max(
    1,
    Number(homeSettings?.beerkasse_price_cents ?? 200),
  );
  const nextSession = (nextSessionData ?? null) as SessionRow | null;
  const recentSessions = (recentSessionsData ?? []) as SessionRow[];
  const clubName = club?.display_name?.trim() || "Dein Team";
  const userId = user?.id ?? null;
  const hasSeason = Boolean(seasonExistsData);

  const showGettingStarted =
    isAdmin &&
    !isPowerUser &&
    ((sessionsCount ?? 0) === 0 ||
      !hasSeason ||
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
          const mvpPlayer = normalizePlayerRelation(row.players);
          if (!mvpPlayer) return null;

          return {
            playerId: row.player_id,
            name: getPlayerName(mvpPlayer),
            userId: mvpPlayer.user_id,
            current: safeMvpCount(mvpPlayer.mvp_count),
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
  let nextSessionAbsentCount = 0;
  let nextSessionParticipantNames: string[] = [];
  let nextSessionAbsentPlayers: { name: string; reason: string | null }[] = [];

  if (homeSessionRsvpEnabled && nextSession) {
    const selfRsvpPromise = currentPlayerId
      ? supabase
          .from("session_rsvps")
          .select("status")
          .eq("session_id", nextSession.id)
          .eq("player_id", currentPlayerId)
          .maybeSingle()
      : Promise.resolve({ data: null as { status: string } | null, error: null });

    const [
      { data: absentRows },
      { data: participantRows },
      { data: selfRsvp },
    ] = await Promise.all([
      supabase
        .from("session_rsvps")
        .select(
          `
          player_id,
          reason,
          players (
            first_name,
            last_name
          )
        `
        )
        .eq("session_id", nextSession.id)
        .eq("club_id", clubId)
        .eq("status", "out"),
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
      selfRsvpPromise,
    ]);

    const participants = (participantRows ?? []) as NextSessionParticipantRow[];
    const absences = (absentRows ?? []) as NextSessionAbsentRow[];
    nextSessionPresentCount = participants.length;
    nextSessionAbsentCount = absences.length;

    nextSessionParticipantNames = participants
      .map((row) => getSimplePlayerName(normalizeSimplePlayerRelation(row.players)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "de"));

    nextSessionAbsentPlayers = absences
      .map((row) => ({
        name: getSimplePlayerName(normalizeSimplePlayerRelation(row.players)),
        reason: row.reason?.trim() || null,
      }))
      .filter((row) => Boolean(row.name))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));

    const selfPresence = currentPlayerId
      ? participants.some((row) => row.player_id === currentPlayerId)
      : false;

    if (selfRsvp?.status === "out") {
      nextSessionPresenceStatus = "out";
    } else if (selfRsvp?.status === "in" || selfPresence) {
      nextSessionPresenceStatus = "in";
    } else {
      nextSessionPresenceStatus = "open";
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
              {isPowerUser ? (
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
              initialAbsentCount={nextSessionAbsentCount}
              sessionDate={nextSession.date}
              startTime={nextSession.start_time}
              rsvpDeadlineMinutesBefore={rsvpDeadlineMinutesBefore}
              sessionRsvpDeadlineMinutesBefore={nextSession.rsvp_deadline_minutes_before}
              participantNames={nextSessionParticipantNames}
              absentPlayers={nextSessionAbsentPlayers}
              requireAbsenceReason={requireRsvpReasonOnAbsence}
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

          {currentPlayerId ? (
            <HomeQuickStats />
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

        {bierkasseHomeEnabled ? (
          <>
            <HomeBeerCheckoutModal
              priceCents={bierkassePriceCents}
              paypalEnabled={bierkassePaypalEnabled}
            />
            {q?.beer_saved === "cash" ? (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                🍺 Eingetragen · Barzahlung ist noch offen.
              </div>
            ) : null}
            {q?.beer_error ? (
              <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
                {q.beer_error}
              </div>
            ) : null}
          </>
        ) : null}

        <Link
          href="/about"
          className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="text-sm font-black text-slate-500">Über strikr</div>

          <h2 className="mt-1 text-lg font-black text-slate-950">
            Vom Bierdeckel zur App 🍻⚽
          </h2>

          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            Angefangen mit Strichen auf Papier, dann Excel und irgendwann die
            Frage: Warum sind Teams eigentlich immer unfair?
          </p>

          <div className="mt-3 text-sm font-black text-slate-900">
            Geschichte lesen →
          </div>
        </Link>

        <a
          href="https://www.instagram.com/getstrikr/"
          target="_blank"
          rel="noopener noreferrer"
          className="group mx-auto flex w-fit max-w-full items-center gap-2.5 rounded-full border border-slate-200 bg-white px-3.5 py-2.5 text-slate-600 shadow-sm transition hover:border-pink-200 hover:text-pink-600"
        >
          <Instagram className="h-4 w-4 shrink-0" />
          <span className="text-xs font-black">@getstrikr</span>
          <span className="hidden text-[11px] font-semibold text-slate-400 sm:inline">
            auf Instagram
          </span>
          <span className="text-xs font-black transition group-hover:translate-x-0.5">
            →
          </span>
        </a>
      </section>
    </main>
  );
}
