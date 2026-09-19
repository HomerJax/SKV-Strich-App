import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, Medal, Star, TrendingUp, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import WhatsNewModal from "@/components/WhatsNewModal";
import NextSessionAttendanceCard from "@/components/home/NextSessionAttendanceCard";
import HomeBeerCheckoutModal from "@/components/home/HomeBeerCheckoutModal";
import PageHero from "@/components/ui/PageHero";

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

type ClubPlayerStatsRow = {
  id: number;
};

type AttendanceRow = {
  player_id: number;
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

  const clubPlayersPromise = currentPlayerId
    ? supabase
        .from("players")
        .select("id")
        .eq("club_id", clubId)
    : Promise.resolve({ data: [] as ClubPlayerStatsRow[], error: null });

  const myTeamRowsPromise = currentPlayerId
    ? supabase
        .from("team_players")
        .select("team_id, player_id")
        .eq("player_id", currentPlayerId)
    : Promise.resolve({ data: [] as HomeTeamPlayerRow[], error: null });

  const inviteExistsPromise =
    isAdmin && !isPowerUser
      ? supabase
          .from("invites")
          .select("id")
          .eq("club_id", clubId)
          .limit(1)
          .maybeSingle<{ id: string }>()
      : Promise.resolve({ data: null as { id: string } | null, error: null });

  const [
    { data: clubData },
    { data: homeSettingsData },
    { data: inviteExistsData },
    { data: sessionExistsData },
    { data: seasonsData },
    { data: nextSessionData },
    { data: clubPlayersData },
    { data: myTeamRowsData },
  ] = await Promise.all([
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
    inviteExistsPromise,
    supabase
      .from("sessions")
      .select("id")
      .eq("club_id", clubId)
      .limit(1)
      .maybeSingle<{ id: number }>(),
    supabase
      .from("seasons")
      .select("id, start_date, end_date")
      .eq("club_id", clubId)
      .order("start_date", { ascending: false }),
    supabase
      .from("sessions")
      .select("id, date, start_time, rsvp_deadline_minutes_before, notes")
      .eq("club_id", clubId)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle<SessionRow>(),
    clubPlayersPromise,
    myTeamRowsPromise,
  ]);

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
  const seasons = (seasonsData ?? []) as SeasonRow[];
  const clubName = club?.display_name?.trim() || "Dein Team";
  const userId = user?.id ?? null;

  const currentSeason = getCurrentSeason(seasons, today);
  const currentSeasonSessionsPromise = currentSeason
    ? supabase
        .from("sessions")
        .select("id, date")
        .eq("club_id", clubId)
        .eq("season_id", currentSeason.id)
        .lte("date", today)
        .order("date", { ascending: false })
    : Promise.resolve({
        data: [] as SeasonSessionRow[],
        error: null,
      });

  const nextSessionRsvpPromise = nextSession
    ? Promise.all([
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
        currentPlayerId
          ? supabase
              .from("session_rsvps")
              .select("status")
              .eq("session_id", nextSession.id)
              .eq("player_id", currentPlayerId)
              .maybeSingle()
          : Promise.resolve({
              data: null as { status: string } | null,
              error: null,
            }),
      ])
    : null;

  const { data: currentSeasonSessionsData } = await currentSeasonSessionsPromise;
  const currentSeasonSessions = (currentSeasonSessionsData ?? []) as SeasonSessionRow[];
  const currentSeasonSessionIds = currentSeasonSessions.map((session) => session.id);

  const clubPlayers = (clubPlayersData ?? []) as ClubPlayerStatsRow[];
  const clubPlayerIds = clubPlayers
    .map((clubPlayer) => Number(clubPlayer.id))
    .filter((id) => Number.isFinite(id));
  const myTeamRows = (myTeamRowsData ?? []) as HomeTeamPlayerRow[];

  const personalResultsPromise =
    currentPlayerId && currentSeasonSessionIds.length > 0
      ? supabase
          .from("results")
          .select("session_id, team_a_id, team_b_id, goals_team_a, goals_team_b")
          .eq("club_id", clubId)
          .in("session_id", currentSeasonSessionIds)
      : Promise.resolve({ data: [] as HomeResultRow[], error: null });

  const attendanceRowsPromise =
    currentPlayerId &&
    clubPlayerIds.length > 0 &&
    currentSeasonSessionIds.length > 0
      ? supabase
          .from("session_players")
          .select("player_id")
          .in("player_id", clubPlayerIds)
          .in("session_id", currentSeasonSessionIds)
      : Promise.resolve({ data: [] as AttendanceRow[], error: null });

  const [
    { data: personalResultsData },
    { data: allAttendanceRowsData },
  ] = await Promise.all([personalResultsPromise, attendanceRowsPromise]);

  let personalSuccessRate: number | null = null;

  if (currentPlayerId) {
    const results = (personalResultsData ?? []) as HomeResultRow[];
    const myTeamIds = new Set(
      myTeamRows
        .map((row) => Number(row.team_id))
        .filter((value) => Number.isFinite(value))
    );

    let wins = 0;
    let completedResults = 0;

    for (const result of results) {
      const myTeamIsA =
        result.team_a_id !== null && myTeamIds.has(result.team_a_id);
      const myTeamIsB =
        result.team_b_id !== null && myTeamIds.has(result.team_b_id);

      if (!myTeamIsA && !myTeamIsB) continue;

      const goalsA =
        typeof result.goals_team_a === "number" ? result.goals_team_a : null;
      const goalsB =
        typeof result.goals_team_b === "number" ? result.goals_team_b : null;

      if (goalsA === null || goalsB === null) continue;

      completedResults += 1;

      if ((myTeamIsA && goalsA > goalsB) || (myTeamIsB && goalsB > goalsA)) {
        wins += 1;
      }
    }

    personalSuccessRate =
      completedResults > 0 ? Math.round((wins / completedResults) * 100) : null;
  }

  let personalAttendanceCount = 0;
  let attendanceRank: number | null = null;

  if (currentPlayerId && clubPlayers.length > 0) {
    const attendanceCounts = new Map<number, number>();

    for (const row of (allAttendanceRowsData ?? []) as AttendanceRow[]) {
      const playerId = Number(row.player_id);
      attendanceCounts.set(playerId, (attendanceCounts.get(playerId) ?? 0) + 1);
    }

    personalAttendanceCount = attendanceCounts.get(currentPlayerId) ?? 0;
    attendanceRank =
      1 +
      clubPlayers.filter((clubPlayer) => {
        const count = attendanceCounts.get(clubPlayer.id) ?? 0;
        return count > personalAttendanceCount;
      }).length;
  }

  const hasSessions = Boolean(sessionExistsData);
  const showGettingStarted =
    isAdmin &&
    !isPowerUser &&
    (!hasSessions || seasons.length === 0 || !inviteExistsData);

  let clubLogoUrl: string | null = null;

  if (club?.logo_path) {
    const { data } = supabase.storage
      .from("club-logos")
      .getPublicUrl(club.logo_path);

    clubLogoUrl = data?.publicUrl ?? null;
  }

  let nextSessionPresenceStatus: "in" | "out" | "open" = "open";
  let nextSessionPresentCount = 0;
  let nextSessionAbsentCount = 0;
  let nextSessionParticipantNames: string[] = [];
  let nextSessionAbsentPlayers: { name: string; reason: string | null }[] = [];

  if (nextSession && nextSessionRsvpPromise) {
    const [
      { data: absentRows },
      { data: participantRows },
      { data: selfRsvp },
    ] = await nextSessionRsvpPromise;

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
            title="Noch kein Training geplant"
            text="Sobald ein Training angelegt ist, erscheint es hier direkt."
            href={isAdmin ? "/sessions/new" : "/sessions"}
            cta={isAdmin ? "Training anlegen" : "Sessions ansehen"}
          />
        )}

        <section className="rounded-[32px] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.09)] ring-1 ring-slate-950/5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
            Meine Kurzinfo
          </div>

          {currentPlayerId ? (
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
                  value={formatPercent(personalSuccessRate)}
                  label="Erfolgsquote"
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

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/stats"
                  className="flex min-h-[54px] items-center justify-between rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-50 via-cyan-50 to-white px-4 text-sm font-semibold text-slate-950 shadow-[0_12px_28px_rgba(37,99,235,0.08)] transition hover:from-blue-100 hover:via-cyan-50 hover:to-white"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <TrendingUp className="h-4 w-4" />
                    </span>
                    <span>Mein Fortschritt</span>
                  </span>
                  <span className="text-blue-700" aria-hidden="true">→</span>
                </Link>

                <Link
                  href="/standings"
                  className="flex min-h-[54px] items-center justify-between rounded-[24px] border border-amber-100 bg-gradient-to-br from-amber-50 via-orange-50 to-white px-4 text-sm font-semibold text-slate-950 shadow-[0_12px_28px_rgba(245,158,11,0.08)] transition hover:from-amber-100 hover:via-orange-50 hover:to-white"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                      <Trophy className="h-4 w-4" />
                    </span>
                    <span>Tabelle</span>
                  </span>
                  <span className="text-amber-600" aria-hidden="true">→</span>
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-medium text-slate-600">
              Dein Profil ist noch nicht mit einem Spieler verknüpft.
            </div>
          )}
        </section>

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
              {!hasSessions ? (
                <Link
                  href="/sessions/new"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-800"
                >
                  Erstes Training anlegen
                </Link>
              ) : null}

              {!inviteExistsData ? (
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
      </section>
    </main>
  );
}
