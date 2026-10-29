import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, Medal, Star, TrendingUp, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCashboxPilotClub } from "@/lib/cashbox/pilot-structure";
import { requireClub } from "@/lib/auth/guards";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import WhatsNewModal from "@/components/WhatsNewModal";
import NextSessionAttendanceCard from "@/components/home/NextSessionAttendanceCard";
import HomeQuickStats from "@/components/home/HomeQuickStats";
import UpcomingHomeAccordion from "@/components/home/UpcomingHomeAccordion";
import HomeMvpHighlightCard from "@/components/home/HomeMvpHighlightCard";
import HomeBeerCheckoutModal from "@/components/home/HomeBeerCheckoutModal";
import HomePullToRefresh from "@/components/home/HomePullToRefresh";
import HomeTeamFeedPreview from "@/components/home/HomeTeamFeedPreview";
import PenaltyFunWheel from "@/components/cashbox/PenaltyFunWheel";
import InsideStrikrChannelModal from "@/components/home/InsideStrikrChannelModal";
import AppStoreReviewPrompt from "@/components/home/AppStoreReviewPrompt";
import AdminActivationChecklist from "@/components/home/AdminActivationChecklist";
import PageHero from "@/components/ui/PageHero";
import type { LeaderboardEntry } from "@/components/share/mvp-share/mvp-share.types";
import { getTeamFeedItems } from "@/lib/team-feed";
import { getServerI18n } from "@/lib/i18n/server";
import type { AppLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
  primary_color: string | null;
  created_at: string | null;
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
  beerkasse_enabled: boolean | null;
  beerkasse_home_enabled: boolean | null;
  beerkasse_paypal_url: string | null;
  beerkasse_paypal_me_url: string | null;
  beerkasse_sumup_url: string | null;
  beerkasse_cash_enabled: boolean | null;
  beerkasse_price_cents: number | null;
  home_team_feed_enabled: boolean | null;
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

type NextSessionPlayer = {
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_path: string | null;
  photo_position_x: number | null;
  photo_position_y: number | null;
  photo_zoom: number | null;
};

type NextSessionParticipantRow = {
  player_id: number;
  players: NextSessionPlayer | NextSessionPlayer[] | null;
};

type NextSessionRsvpCommentRow = {
  player_id: number;
  reason: string | null;
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

function fmtDateLong(iso: string, locale: AppLocale) {
  return new Date(iso).toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateCompact(iso: string, locale: AppLocale) {
  return new Date(iso)
    .toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    })
    .replace(/\.$/, "");
}

function formatSessionTitle(
  iso: string,
  startTime: string | null,
  locale: AppLocale,
) {
  const dateLabel = fmtDateCompact(iso, locale);
  const timeLabel = startTime?.slice(0, 5);

  return timeLabel
    ? locale === "de"
      ? `${dateLabel} · ${timeLabel} Uhr`
      : `${dateLabel} · ${timeLabel}`
    : dateLabel;
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

function getPlayerName(player: MvpPlayerRow | null | undefined, locale: AppLocale) {
  if (!player) return translate(locale, "home.playerFallback");

  const name = [player.first_name, player.last_name]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || translate(locale, "home.playerFallback");
}

function getSimplePlayerName(
  player:
    | { name: string | null; first_name: string | null; last_name: string | null }
    | null
    | undefined,
  locale: AppLocale,
) {
  if (!player) return translate(locale, "home.playerFallback");

  const name = [player.first_name, player.last_name]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || player.name?.trim() || translate(locale, "home.playerFallback");
}

// Resolve attendee names from the club roster itself. RSVP-to-player nested
// relations may be null even when the referenced player still exists.
async function loadAttendancePlayers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clubId: string,
  playerIds: number[],
): Promise<Map<number, NextSessionPlayer>> {
  const ids = [...new Set(playerIds)].filter((id) => Number.isSafeInteger(id) && id > 0);
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("players")
    .select("id,name,first_name,last_name,photo_path,photo_position_x,photo_position_y,photo_zoom")
    .eq("club_id", clubId)
    .in("id", ids);

  if (error) {
    console.error("Could not load club player names for attendance:", error.message);
    return new Map();
  }

  return new Map((data ?? []).map((player) => [player.id, player]));
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
): NextSessionPlayer | null {
  if (!player) return null;
  if (Array.isArray(player)) return player[0] ?? null;
  return player;
}

function safeMvpCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getBadgeLabel(count: number, locale: AppLocale) {
  if (count >= 10) return translate(locale, "badge.goat");
  if (count >= 7) return translate(locale, "badge.gold");
  if (count >= 5) return translate(locale, "badge.silver");
  if (count >= 3) return translate(locale, "badge.bronze");
  return translate(locale, "badge.copper");
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
  locale: AppLocale;
}): LeaderboardEntry {
  const { playerId, name, votes, current, locale } = params;
  const previous = Math.max(current - 1, 0);
  const badgeLabel = getBadgeLabel(current, locale);

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
  const { locale, t } = await getServerI18n();
  const q = await searchParams;
  const clubAccess = await requireClub();
  const {
    clubId,
    membership,
    isPowerUser,
    user,
    player,
    supportViewPlayer,
    supportViewLabel,
    isSupportView,
  } = clubAccess;
  const supabase = await createClient();
  const { data: pilotParentClub } = isCashboxPilotClub(clubId) && !isSupportView
    ? await createAdminClient().from("pilot_parent_clubs")
      .select("name,admin_user_ids").eq("owner_club_id", clubId).maybeSingle()
    : { data: null };
  const isParentClubAdmin = pilotParentClub?.admin_user_ids?.includes(user.id) === true;

  const today = getPartsInBerlin(new Date()).dateKey;
  const isHomeRsvpPilot = true;
  const isAdmin =
    isPowerUser || membership.role === "admin" || membership.role === "owner";
  const viewPlayer = player ?? supportViewPlayer;
  const currentPlayerId = viewPlayer?.id ?? null;

  const [
    featureFlags,
    { data: clubData },
    { data: homeSettingsData },
    { count: invitesCount },
    { count: sessionsCount },
    { data: nextSessionData },
    { data: recentSessionsData },
  ] = await Promise.all([
    getFeatureFlagsForClub(clubId),
    supabase
      .from("clubs")
      .select("id, display_name, logo_path, primary_color, created_at")
      .eq("id", clubId)
      .maybeSingle<ClubRow>(),
    supabase
      .from("club_settings")
      .select(
        "rsvp_deadline_minutes_before, require_rsvp_reason_on_absence, beerkasse_enabled, beerkasse_home_enabled, beerkasse_paypal_url, beerkasse_paypal_me_url, beerkasse_sumup_url, beerkasse_cash_enabled, beerkasse_price_cents, home_team_feed_enabled"
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
  const teamFeedEnabled = homeSettings?.home_team_feed_enabled === true;
  const bierkasseHomeEnabled =
    homeSettings?.beerkasse_enabled === true &&
    homeSettings?.beerkasse_home_enabled === true;
  const bierkassePaypalUrl = homeSettings?.beerkasse_paypal_url?.trim() ?? "";
  const bierkassePaypalEnabled = Boolean(bierkassePaypalUrl);
  const bierkassePaypalPool = /paypal\.com\/pools?\//i.test(bierkassePaypalUrl);
  const bierkassePaypalMeEnabled = Boolean(homeSettings?.beerkasse_paypal_me_url?.trim());
  const bierkasseSumupEnabled = Boolean(homeSettings?.beerkasse_sumup_url?.trim());
  const bierkasseCashEnabled = homeSettings?.beerkasse_cash_enabled !== false;
  const bierkassePriceCents = Math.max(
    1,
    Number(homeSettings?.beerkasse_price_cents ?? 200),
  );
  let canManageCashbox = isAdmin;
  if (!canManageCashbox && user?.id) {
    const { data: managerRow } = await supabase.from("cashbox_managers").select("user_id").eq("club_id", clubId).eq("user_id", user.id).maybeSingle();
    canManageCashbox = Boolean(managerRow);
  }

  const teamFeedPageSize = 8;
  // These independent requests can run in parallel after club permissions/settings are known.
  const [pendingBeerResult, teamFeedItems, myPenaltiesResult] = await Promise.all([
    canManageCashbox && homeSettings?.beerkasse_enabled === true
      ? supabase.from("beer_consumptions").select("total_cents").eq("club_id", clubId).eq("payment_status", "pending")
      : Promise.resolve({ data: [] as { total_cents: number | null }[] }),
    teamFeedEnabled ? getTeamFeedItems(clubId, teamFeedPageSize) : Promise.resolve([]),
    player?.id && !isSupportView
      ? supabase.from("penalties")
          .select("id,reason,type,value,source_key")
          .eq("club_id", clubId).eq("player_id", player.id).is("resolved_at", null)
          .order("created_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [] as { id: number; reason: string | null; type: string; value: string | null; source_key: string | null }[] }),
  ]);
  const myOpenPenalties = myPenaltiesResult.data ?? [];
  const pendingBeerRows = pendingBeerResult.data ?? [];
  const pendingBeerCount = pendingBeerRows.length;
  const pendingBeerTotalCents = pendingBeerRows.reduce(
    (sum, row) => sum + Number(row.total_cents ?? 0), 0
  );

  const nextSession = (nextSessionData ?? null) as SessionRow | null;

  let upcomingHomeSessions: (SessionRow & { status: "in"|"out"|"open"; comment:string|null; presentCount:number; absentCount:number; participants: {id:number;name:string;comment:string|null;photoUrl:string|null;photoPositionX:number|null;photoPositionY:number|null;photoZoom:number|null}[]; absentPlayers:{id:number;name:string;reason:string|null;photoUrl:string|null;photoPositionX:number|null;photoPositionY:number|null;photoZoom:number|null}[] })[] = [];
  if (isHomeRsvpPilot && homeSessionRsvpEnabled && nextSession) {
    const {data: futureRows} = await supabase.from("sessions")
      .select("id,date,start_time,notes,rsvp_deadline_minutes_before")
      .eq("club_id",clubId).gte("date",today).neq("id",nextSession.id)
      .order("date",{ascending:true}).order("start_time",{ascending:true}).limit(10);
    const future=(futureRows??[]) as SessionRow[];
    if(future.length){
      const ids=future.map(s=>s.id);
      const [{data:rsvps},{data:participants}] = await Promise.all([
        supabase.from("session_rsvps").select("session_id,player_id,status,reason").eq("club_id",clubId).in("session_id",ids),
        supabase.from("session_players").select("session_id,player_id,players(name,first_name,last_name,photo_path,photo_position_x,photo_position_y,photo_zoom)").in("session_id",ids)
      ]);
      const allRsvps=rsvps??[];
      const allParticipants=(participants??[]) as unknown as (NextSessionParticipantRow & {session_id:number})[];
      const participantsBySession=new Map<number,typeof allParticipants>();
      const rsvpsBySession=new Map<number,typeof allRsvps>();
      const playerInfoById = await loadAttendancePlayers(
        supabase,
        clubId,
        [...allParticipants.map((p) => p.player_id), ...allRsvps.map((r) => r.player_id)],
      );
      for(const participant of allParticipants){
        const group=participantsBySession.get(participant.session_id)??[];
        group.push(participant);
        participantsBySession.set(participant.session_id,group);
        if(!playerInfoById.has(participant.player_id)){
          const nestedPlayer = normalizeSimplePlayerRelation(participant.players);
          if (nestedPlayer) playerInfoById.set(participant.player_id, nestedPlayer);
        }
      }
      for(const rsvp of allRsvps){
        const group=rsvpsBySession.get(rsvp.session_id)??[];
        group.push(rsvp);
        rsvpsBySession.set(rsvp.session_id,group);
      }
      const playerInfo=(playerId:number)=>playerInfoById.get(playerId)??null;
      const photo=(p:NextSessionPlayer|null)=>p?.photo_path?supabase.storage.from("player-photos").getPublicUrl(p.photo_path).data.publicUrl:null;
      upcomingHomeSessions=future.map(s=>{
        const sessionParticipants=participantsBySession.get(s.id)??[];
        const sessionRsvps=rsvpsBySession.get(s.id)??[];
        const rsvpByPlayer=new Map(sessionRsvps.map(r=>[r.player_id,r]));
        const own=currentPlayerId?rsvpByPlayer.get(currentPlayerId):undefined;
        const status:"in"|"out"|"open"=own?.status==="in"?"in":own?.status==="out"?"out":sessionParticipants.some(p=>p.player_id===currentPlayerId)?"in":"open";
        const attending=sessionParticipants.map(p=>{
          const info=playerInfoById.get(p.player_id) ?? normalizeSimplePlayerRelation(p.players);
          return {id:p.player_id,name:getSimplePlayerName(info,locale),comment:rsvpByPlayer.get(p.player_id)?.status==="in"?rsvpByPlayer.get(p.player_id)?.reason??null:null,photoUrl:photo(info),photoPositionX:info?.photo_position_x??null,photoPositionY:info?.photo_position_y??null,photoZoom:info?.photo_zoom??null};
        });
        const absent=sessionRsvps.filter(r=>r.status==="out").map(r=>{
          const info=playerInfo(r.player_id);
          return {id:r.player_id,name:getSimplePlayerName(info,locale),reason:r.reason??null,photoUrl:photo(info),photoPositionX:info?.photo_position_x??null,photoPositionY:info?.photo_position_y??null,photoZoom:info?.photo_zoom??null};
        });
        return {...s,status,comment:own?.status==="in"?own.reason??null:null,presentCount:attending.length,absentCount:absent.length,participants:attending,absentPlayers:absent};
      });
    }
  }
  const recentSessions = (recentSessionsData ?? []) as SessionRow[];
  const clubName = club?.display_name?.trim() || t("home.yourTeam");
  const userId = user?.id ?? null;
  // Keep the guided first-training journey visible for new clubs, not for
  // long-standing teams that already manage regular sessions.
  const clubCreatedAt = club?.created_at ? Date.parse(club.created_at) : NaN;
  const clubIsNew = Number.isFinite(clubCreatedAt)
    && clubCreatedAt <= Date.now()
    && Date.now() - clubCreatedAt < 60 * 24 * 60 * 60 * 1000;
  const canShowActivation = isAdmin && !isPowerUser && !isSupportView
    && (clubIsNew || (sessionsCount ?? 0) === 0);
  const activationChecks = canShowActivation ? await Promise.all([
    supabase.from("club_memberships").select("user_id", { count: "exact", head: true }).eq("club_id", clubId),
    supabase.from("results").select("id", { count: "exact", head: true }).eq("club_id", clubId)
      .not("goals_team_a", "is", null).not("goals_team_b", "is", null),
    supabase.from("sessions").select("id", { count: "exact", head: true }).eq("club_id", clubId)
      .eq("type", "training").not("tournament_completed_at", "is", null),
    supabase.from("players").select("id", { count: "exact", head: true }).eq("club_id", clubId)
      .eq("can_lead_training", true).eq("is_guest", false),
  ]) : null;
  const hasCompletedFirstTraining = (activationChecks?.[1].count ?? 0) > 0
    || (activationChecks?.[2].count ?? 0) > 0;
  const showGettingStarted = canShowActivation && Boolean(activationChecks)
    && !activationChecks?.[1].error && !activationChecks?.[2].error
    && !hasCompletedFirstTraining;

  let clubLogoUrl: string | null = null;

  if (club?.logo_path) {
    const { data } = supabase.storage
      .from("club-logos")
      .getPublicUrl(club.logo_path);

    clubLogoUrl = data?.publicUrl ?? null;
  }

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
            name: getPlayerName(mvpPlayer, locale),
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
            name: participant?.name ?? t("home.playerFallback"),
            current: Math.max(participant?.current ?? 1, 1),
            locale,
          });
        })
        .sort((a, b) =>
          b.votes !== a.votes
            ? b.votes - a.votes
            : a.name.localeCompare(b.name, locale === "de" ? "de" : "en")
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
          sessionDateLabel: fmtDateLong(latestRevealedSession.date, locale),
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
  let nextSessionPresenceComment: string | null = null;
  let nextSessionPresentCount = 0;
  let nextSessionAbsentCount = 0;
  let nextSessionParticipants: { id: number; name: string; comment: string | null; photoUrl: string | null; photoPositionX: number | null; photoPositionY: number | null; photoZoom: number | null }[] = [];
  let nextSessionAbsentPlayers: { id: number; name: string; reason: string | null; photoUrl: string | null; photoPositionX: number | null; photoPositionY: number | null; photoZoom: number | null }[] = [];

  if (homeSessionRsvpEnabled && nextSession) {
    const selfRsvpPromise = currentPlayerId
      ? supabase
          .from("session_rsvps")
          .select("status, reason")
          .eq("session_id", nextSession.id)
          .eq("player_id", currentPlayerId)
          .maybeSingle()
      : Promise.resolve({ data: null as { status: string; reason: string | null } | null, error: null });

    const [
      { data: absentRows },
      { data: participantRows },
      { data: participantCommentRows },
      { data: selfRsvp },
    ] = await Promise.all([
      supabase
        .from("session_rsvps")
        .select(
          `
          player_id,
          reason,
          players (
            name,
            first_name,
            last_name,
            photo_path,
            photo_position_x,
            photo_position_y,
            photo_zoom
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
            name,
            first_name,
            last_name,
            photo_path,
            photo_position_x,
            photo_position_y,
            photo_zoom
          )
        `
        )
        .eq("session_id", nextSession.id),
      supabase
        .from("session_rsvps")
        .select("player_id, reason")
        .eq("session_id", nextSession.id)
        .eq("club_id", clubId)
        .eq("status", "in"),
      selfRsvpPromise,
    ]);

    const participants = (participantRows ?? []) as NextSessionParticipantRow[];
    const participantComments = (participantCommentRows ?? []) as NextSessionRsvpCommentRow[];
    const participantCommentByPlayerId = new Map(
      participantComments.map((row) => [row.player_id, row.reason?.trim() || null]),
    );
    const absences = (absentRows ?? []) as NextSessionAbsentRow[];
    const attendancePlayerById = await loadAttendancePlayers(
      supabase,
      clubId,
      [...participants.map((row) => row.player_id), ...absences.map((row) => row.player_id)],
    );
    nextSessionPresentCount = participants.length;
    nextSessionAbsentCount = absences.length;

    nextSessionParticipants = participants
      .map((row) => {
        const player = attendancePlayerById.get(row.player_id) ?? normalizeSimplePlayerRelation(row.players);
        return {
          id: row.player_id,
          name: getSimplePlayerName(player, locale),
          comment: participantCommentByPlayerId.get(row.player_id) ?? null,
          photoUrl: player?.photo_path
            ? supabase.storage.from("player-photos").getPublicUrl(player.photo_path).data.publicUrl
            : null,
          photoPositionX: player?.photo_position_x ?? null,
          photoPositionY: player?.photo_position_y ?? null,
          photoZoom: player?.photo_zoom ?? null,
        };
      })
      .filter((row) => Boolean(row.name))
      .sort((a, b) => a.name.localeCompare(b.name, locale === "de" ? "de" : "en"));

    nextSessionAbsentPlayers = absences
      .map((row) => {
        const player = attendancePlayerById.get(row.player_id) ?? normalizeSimplePlayerRelation(row.players);
        return {
          id: row.player_id,
          name: getSimplePlayerName(player, locale),
          reason: row.reason?.trim() || null,
          photoUrl: player?.photo_path
            ? supabase.storage.from("player-photos").getPublicUrl(player.photo_path).data.publicUrl
            : null,
          photoPositionX: player?.photo_position_x ?? null,
          photoPositionY: player?.photo_position_y ?? null,
          photoZoom: player?.photo_zoom ?? null,
        };
      })
      .filter((row) => Boolean(row.name))
      .sort((a, b) => a.name.localeCompare(b.name, locale === "de" ? "de" : "en"));

    const selfPresence = currentPlayerId
      ? participants.some((row) => row.player_id === currentPlayerId)
      : false;

    if (selfRsvp?.status === "out") {
      nextSessionPresenceStatus = "out";
    } else if (selfRsvp?.status === "in" || selfPresence) {
      nextSessionPresenceStatus = "in";
      nextSessionPresenceComment =
        selfRsvp?.status === "in" ? selfRsvp.reason?.trim() || null : null;
    } else {
      nextSessionPresenceStatus = "open";
    }
  }


  return (
    <HomePullToRefresh>
      <main className="min-h-screen bg-slate-50 pb-24">
      <WhatsNewModal version="v0.2" />
      <InsideStrikrChannelModal />
      <AppStoreReviewPrompt />

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <PageHero
          primaryColorKey={club?.primary_color ?? "black"}
          title={clubName}
          description={t("home.heroDescription")}
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
                {t("home.rsvp")}
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

        {showGettingStarted ? (
          <AdminActivationChecklist
            locale={locale}
            teamInvited={(invitesCount ?? 0) > 0 || (activationChecks?.[0].count ?? 0) > 1}
            trainingCreated={(sessionsCount ?? 0) > 0}
            firstTrainingCompleted={hasCompletedFirstTraining}
            hasTrainingLeader={(activationChecks?.[3].count ?? 0) > 0}
            trainingHref={recentSessions.length > 0 ? `/sessions/${recentSessions[0].id}` : "/sessions"}
          />
        ) : null}

        {isParentClubAdmin ? (
          <Link href="/admin/organization" className="flex items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-950">
            <span>🏛️ {locale === "en" ? "Manage parent club" : "Dachverein verwalten"} · {pilotParentClub?.name}</span>
            <span aria-hidden>→</span>
          </Link>
        ) : null}

        {isCashboxPilotClub(clubId) ? (
          <Link href="/mannschaftskasse/strafen" className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
            <span>⚖️ {locale==="en"?"Penalties: report, review & confirm":"Strafen: melden, prüfen & bestätigen"}</span>
            <span aria-hidden>→</span>
          </Link>
        ) : null}

        {myOpenPenalties.length > 0 ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-amber-700">
                  💸 Meine offenen Strafen
                </div>
                <div className="mt-1 text-sm font-black text-slate-950">
                  {myOpenPenalties.length === 1
                    ? "Du hast 1 offene Strafe"
                    : `Du hast ${myOpenPenalties.length} offene Strafen`}
                </div>
                <div className="text-[11px] font-medium text-amber-900/70">
                  Nur für dich sichtbar · Schicksalsrad direkt hier ausprobieren
                </div>
              </div>
              <Link href="/mannschaftskasse" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">
                Mannschaftskasse →
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {myOpenPenalties.slice(0, 2).map((penalty) => (
                <div key={penalty.id} className="rounded-xl border border-amber-100 bg-white px-3 py-3">
                  <div className="text-sm font-bold text-slate-900">{penalty.reason || "Offene Strafe"}</div>
                  <div className="mt-0.5 text-sm font-semibold text-amber-800">{penalty.value || "Betrag offen"}</div>
                  {penalty.source_key?.startsWith("test:") ? (
                    <div className="mt-1 text-[10px] font-bold text-cyan-700">Test – keine echte Zahlung</div>
                  ) : null}
                  <PenaltyFunWheel penaltyId={penalty.id}/>
                </div>
              ))}
              {myOpenPenalties.length > 2 ? (
                <Link href="/mannschaftskasse" className="inline-flex text-xs font-bold text-cyan-700">
                  + {myOpenPenalties.length - 2} weitere Strafen ansehen →
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

        {canManageCashbox && homeSettings?.beerkasse_enabled === true ? (
          <section className={"rounded-2xl border px-4 py-4 " + (pendingBeerCount > 0 ? "border-amber-400 bg-amber-100 shadow-[0_8px_24px_rgba(245,158,11,0.18)] ring-2 ring-amber-300/40" : "border-slate-200 bg-white")}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className={"text-[10px] font-bold uppercase tracking-[0.18em] " + (pendingBeerCount > 0 ? "text-amber-700" : "text-cyan-700")}>{pendingBeerCount > 0 ? "⚠️ Aktion nötig · Kassenwart" : "Kassenwart"}</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-950">
                  {pendingBeerCount > 0
                    ? pendingBeerCount + " ZAHLUNG" + (pendingBeerCount === 1 ? "" : "EN") + " WART" + (pendingBeerCount === 1 ? "ET" : "EN") + " AUF DICH · " + new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", { style: "currency", currency: "EUR" }).format(pendingBeerTotalCents / 100)
                    : "Keine offenen Bierzahlungen"}
                </div>
              </div>
              <Link href="/mannschaftskasse/bier?review=1#offen" className="shrink-0 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm">
                {pendingBeerCount > 0 ? "Jetzt prüfen →" : "Bierkasse"}
              </Link>
            </div>
            {bierkassePaypalUrl ? (
              <a href={bierkassePaypalUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-xs font-semibold text-cyan-700">
                PayPal-Pool öffnen →
              </a>
            ) : null}
          </section>
        ) : null}

        {nextSession ? (
          homeSessionRsvpEnabled ? (
            <NextSessionAttendanceCard
              sessionId={nextSession.id}
              title={formatSessionTitle(nextSession.date, nextSession.start_time, locale)}
              text={
                nextSession.notes?.trim()
                  ? nextSession.notes.trim()
                  : t("home.checkAttendance")
              }
              href={`/sessions/${nextSession.id}`}
              initialStatus={nextSessionPresenceStatus}
              initialComment={nextSessionPresenceComment}
              initialPresentCount={nextSessionPresentCount}
              initialAbsentCount={nextSessionAbsentCount}
              sessionDate={nextSession.date}
              startTime={nextSession.start_time}
              rsvpDeadlineMinutesBefore={rsvpDeadlineMinutesBefore}
              sessionRsvpDeadlineMinutesBefore={nextSession.rsvp_deadline_minutes_before}
              participants={nextSessionParticipants}
              absentPlayers={nextSessionAbsentPlayers}
              requireAbsenceReason={requireRsvpReasonOnAbsence}
              readOnly={isSupportView}
              supportViewLabel={supportViewLabel}
            />
          ) : (
            <MainActionCard
              eyebrow={t("home.nextTraining")}
              title={formatSessionTitle(nextSession.date, nextSession.start_time, locale)}
              text={
                nextSession.notes?.trim()
                  ? nextSession.notes.trim()
                  : t("home.trainingExists")
              }
              href={`/sessions/${nextSession.id}`}
              cta={t("home.viewTraining")}
            />
          )
        ) : (
          <MainActionCard
            eyebrow={t("home.nextTraining")}
            title={t("home.noTraining")}
            text={
              isAdmin
                ? t("home.createTrainingHint")
                : t("home.waitForTrainingHint")
            }
            href={isAdmin ? "/sessions/new" : "/sessions"}
            cta={isAdmin ? t("home.createTraining") : t("home.viewSessions")}
          />
        )}

        {isHomeRsvpPilot && homeSessionRsvpEnabled && upcomingHomeSessions.length > 0 ? (
          <UpcomingHomeAccordion items={upcomingHomeSessions.slice(0,2)} locale={locale} clubDeadline={rsvpDeadlineMinutesBefore} requireAbsenceReason={requireRsvpReasonOnAbsence} readOnly={isSupportView} supportViewLabel={supportViewLabel}/>
        ) : null}

        {currentPlayerId || !isPowerUser ? (
          <section data-home-quick-info="true" className="rounded-[26px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            {isSupportView && supportViewLabel ? (
              <div className="mb-3 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-bold text-violet-800">
                {t("home.supportView", { name: supportViewLabel })}
              </div>
            ) : null}
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-600">
              {t("home.quickInfo")}
            </div>

            {currentPlayerId ? (
              <HomeQuickStats />
            ) : (
              <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm font-medium text-slate-600">
                {t("home.profileUnlinked")}
              </div>
            )}
          </section>
        ) : null}

        {bierkasseHomeEnabled ? (
          <>
            <HomeBeerCheckoutModal
              priceCents={bierkassePriceCents}
              paypalEnabled={bierkassePaypalEnabled}
              paypalPool={bierkassePaypalPool}
              paypalUrl={bierkassePaypalUrl}
              paypalMeEnabled={bierkassePaypalMeEnabled}
              sumupEnabled={bierkasseSumupEnabled}
              cashEnabled={bierkasseCashEnabled}
            />
            {q?.beer_saved === "cash" ? (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                {t("home.beerPending")}
              </div>
            ) : null}
            {q?.beer_error ? (
              <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
                {q.beer_error}
              </div>
            ) : null}
          </>
        ) : null}

        {teamFeedEnabled ? (
          <HomeTeamFeedPreview
            items={teamFeedItems}
            initialOffset={teamFeedItems.length}
            initialHasMore={teamFeedItems.length === teamFeedPageSize}
          />
        ) : null}

        {activeVotingSession ? (
          <section className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-800">
                  {t("home.mvpVotingRunning")}
                </div>
                <div className="mt-1 text-sm font-black text-slate-950">
                  {t("home.voteOpen")}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-600">
                  {t("home.voteCount", {
                    count: activeVotingSession.voteCount,
                    total: activeVotingSession.eligibleVoterCount,
                  })}
                </div>
              </div>

              <Link
                href={`/sessions/${activeVotingSession.id}`}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-3 py-2 text-sm font-black text-white transition hover:bg-slate-800"
              >
                {t("home.vote")}
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


      </section>
      </main>
    </HomePullToRefresh>
  );
}
