import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ChevronDown,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import AchievementBadgeVisual from "@/components/badges/AchievementBadgeVisual";
import PageHero from "@/components/ui/PageHero";
import { requireClub } from "@/lib/auth/guards";
import {
  BADGE_DEFINITIONS,
  getBadgeDefinition,
} from "@/lib/badges/catalog";
import { syncClubAchievements } from "@/lib/badges/engine";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import { getPlayerDisplayName } from "@/lib/player-display";
import { createAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  searchParams?: Promise<{
    player?: string;
    compare?: string;
  }>;
};

type ClubRow = {
  display_name: string | null;
  primary_color: string | null;
};

type PlayerRow = {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  is_guest: boolean | null;
  selected_badge_key: string | null;
};

type AchievementRow = {
  player_id: number;
  badge_key: string;
  season_id: number | null;
  season_ref: string;
  earned_at: string;
};

type SessionRow = {
  id: number;
  type: string | null;
};

type SessionPlayerRow = {
  session_id: number | null;
  player_id: number | null;
};

type ResultRow = {
  session_id: number | null;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

type TeamPlayerRow = {
  team_id: number | null;
  player_id: number | null;
};

type CareerStats = {
  appearances: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
};

type BadgeDefinition = (typeof BADGE_DEFINITIONS)[number];

const SECRET_BADGES = new Set([
  "curse_broken",
  "resilient",
  "lucky_charm",
  "comeback",
]);

function parsePlayerId(value?: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getAchievementMap(rows: AchievementRow[]) {
  const map = new Map<string, AchievementRow[]>();

  for (const row of rows) {
    const list = map.get(row.badge_key) ?? [];
    list.push(row);
    map.set(row.badge_key, list);
  }

  return map;
}

function getEarnedDefinitions(rows: AchievementRow[]) {
  const keys = new Set(rows.map((row) => row.badge_key));
  return BADGE_DEFINITIONS.filter((badge) => keys.has(badge.key));
}

function getOpenDefinitions(rows: AchievementRow[]) {
  const keys = new Set(rows.map((row) => row.badge_key));
  return BADGE_DEFINITIONS.filter((badge) => !keys.has(badge.key));
}

function countByScope(
  definitions: readonly BadgeDefinition[],
  scope: "season" | "career",
) {
  return definitions.filter((badge) => badge.scope === scope).length;
}

function emptyCareerStats(): CareerStats {
  return {
    appearances: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
  };
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0,0%";
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function isTrainingSession(session: SessionRow) {
  return !session.type || session.type === "training";
}

async function loadCareerStatsForPlayers(clubId: string, playerIds: number[]) {
  const stats = new Map<number, CareerStats>(
    playerIds.map((playerId) => [playerId, emptyCareerStats()]),
  );

  if (playerIds.length === 0) return stats;

  const supabase = createAdminClient();
  const { data: sessionsData, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, type")
    .eq("club_id", clubId);

  if (sessionsError) {
    throw new Error(`Sessions konnten für den Vergleich nicht geladen werden: ${sessionsError.message}`);
  }

  const trainingSessionIds = ((sessionsData ?? []) as SessionRow[])
    .filter(isTrainingSession)
    .map((session) => session.id);

  if (trainingSessionIds.length === 0) return stats;

  const [
    { data: attendanceData, error: attendanceError },
    { data: resultData, error: resultError },
  ] = await Promise.all([
    supabase
      .from("session_players")
      .select("session_id, player_id")
      .in("session_id", trainingSessionIds)
      .in("player_id", playerIds),
    supabase
      .from("results")
      .select("session_id, team_a_id, team_b_id, goals_team_a, goals_team_b")
      .eq("club_id", clubId)
      .in("session_id", trainingSessionIds),
  ]);

  if (attendanceError) {
    throw new Error(`Teilnahmen konnten für den Vergleich nicht geladen werden: ${attendanceError.message}`);
  }

  if (resultError) {
    throw new Error(`Ergebnisse konnten für den Vergleich nicht geladen werden: ${resultError.message}`);
  }

  const attendanceByPlayer = new Map<number, Set<number>>();
  for (const playerId of playerIds) attendanceByPlayer.set(playerId, new Set<number>());

  for (const row of (attendanceData ?? []) as SessionPlayerRow[]) {
    if (row.player_id == null || row.session_id == null) continue;
    attendanceByPlayer.get(row.player_id)?.add(row.session_id);
  }

  const results = (resultData ?? []) as ResultRow[];
  const teamIds = Array.from(
    new Set(
      results
        .flatMap((result) => [result.team_a_id, result.team_b_id])
        .filter((value): value is number => value != null),
    ),
  );

  const { data: teamPlayersData, error: teamPlayersError } =
    teamIds.length > 0
      ? await supabase
          .from("team_players")
          .select("team_id, player_id")
          .in("team_id", teamIds)
          .in("player_id", playerIds)
      : { data: [] as TeamPlayerRow[], error: null };

  if (teamPlayersError) {
    throw new Error(`Team-Zuordnungen konnten für den Vergleich nicht geladen werden: ${teamPlayersError.message}`);
  }

  const teamIdsByPlayer = new Map<number, Set<number>>();
  for (const playerId of playerIds) teamIdsByPlayer.set(playerId, new Set<number>());

  for (const row of (teamPlayersData ?? []) as TeamPlayerRow[]) {
    if (row.player_id == null || row.team_id == null) continue;
    teamIdsByPlayer.get(row.player_id)?.add(row.team_id);
  }

  for (const playerId of playerIds) {
    const ownTeamIds = teamIdsByPlayer.get(playerId) ?? new Set<number>();
    let wins = 0;
    let losses = 0;
    let draws = 0;

    for (const result of results) {
      const isTeamA = result.team_a_id != null && ownTeamIds.has(result.team_a_id);
      const isTeamB = result.team_b_id != null && ownTeamIds.has(result.team_b_id);
      if (!isTeamA && !isTeamB) continue;
      if (result.goals_team_a == null || result.goals_team_b == null) continue;

      if (result.goals_team_a === result.goals_team_b) {
        draws += 1;
      } else if (
        (isTeamA && result.goals_team_a > result.goals_team_b) ||
        (isTeamB && result.goals_team_b > result.goals_team_a)
      ) {
        wins += 1;
      } else {
        losses += 1;
      }
    }

    const completed = wins + losses + draws;
    stats.set(playerId, {
      appearances: attendanceByPlayer.get(playerId)?.size ?? 0,
      wins,
      losses,
      draws,
      winRate: completed > 0 ? (wins / completed) * 100 : 0,
    });
  }

  return stats;
}

function TrophyCard({
  badge,
  achievementRows,
  selected,
  canSelect,
}: {
  badge: BadgeDefinition;
  achievementRows: AchievementRow[];
  selected: boolean;
  canSelect: boolean;
}) {
  const repeatCount = achievementRows.length;

  return (
    <article
      className={[
        "relative overflow-hidden rounded-[24px] border p-4 text-white transition",
        selected
          ? "border-amber-300/60 bg-amber-400/[0.08] shadow-[0_18px_55px_rgba(245,158,11,0.14)]"
          : "border-white/10 bg-white/[0.055]",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center">
          <div className="absolute inset-1 rounded-[24px] bg-white/[0.04] blur-lg" />
          <AchievementBadgeVisual badgeKey={badge.key} size="xl" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black tracking-tight sm:text-base">{badge.title}</h3>
            {selected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-slate-950">
                <Star className="h-3 w-3 fill-current" />
                Mein Titel
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-xs font-medium leading-5 text-white/60">
            {badge.description}
          </p>

          <div className="mt-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
            {badge.scope === "career" ? "Karriere" : "Saison / Serie"}
            {repeatCount > 1 ? ` · ${repeatCount}× erreicht` : ""}
          </div>
        </div>
      </div>

      {canSelect && !selected ? (
        <form action={setFeaturedBadgeAction} className="mt-3">
          <input type="hidden" name="badge_key" value={badge.key} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold text-white/75 transition hover:bg-white hover:text-slate-950"
          >
            <Star className="h-3.5 w-3.5" />
            Als Titel wählen
          </button>
        </form>
      ) : null}
    </article>
  );
}

function LockedBadgeCard({ badge }: { badge: BadgeDefinition }) {
  const secret = SECRET_BADGES.has(badge.key);

  return (
    <article className="rounded-[20px] border border-slate-200 bg-slate-50 p-3.5">
      <div className="flex items-center gap-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center opacity-35 grayscale">
          <AchievementBadgeVisual badgeKey={badge.key} size="lg" grayscale />
          <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-50 bg-slate-700 text-white">
            <LockKeyhole className="h-2.5 w-2.5" />
          </span>
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-slate-700">
            {secret ? "Geheimes Achievement" : badge.title}
          </h3>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {secret ? "Wird erst nach der Freischaltung verraten." : badge.description}
          </p>
        </div>
      </div>
    </article>
  );
}

function ComparisonMetricRow({
  label,
  leftValue,
  rightValue,
}: {
  label: string;
  leftValue: string;
  rightValue: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3.5 sm:px-4">
      <div className="text-left text-lg font-black text-white sm:text-xl">{leftValue}</div>
      <div className="min-w-[96px] text-center text-[9px] font-black uppercase tracking-[0.14em] text-white/40 sm:min-w-[118px] sm:text-[10px]">
        {label}
      </div>
      <div className="text-right text-lg font-black text-white sm:text-xl">{rightValue}</div>
    </div>
  );
}

function PlayerBadgeCollection({
  title,
  playerId,
  badges,
  achievementMap,
  sharedKeys,
}: {
  title: string;
  playerId: number;
  badges: readonly BadgeDefinition[];
  achievementMap: Map<string, AchievementRow[]>;
  sharedKeys: Set<string>;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.17em] text-slate-400">
            Badges
          </div>
          <Link
            href={`/badges?player=${playerId}`}
            className="mt-1 block text-sm font-black text-slate-950 underline decoration-slate-200 underline-offset-4 hover:decoration-slate-500 sm:text-base"
          >
            {title}
          </Link>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {badges.length}
        </div>
      </div>

      {badges.length > 0 ? (
        <div className="mt-4 space-y-2">
          {badges.map((badge) => {
            const count = achievementMap.get(badge.key)?.length ?? 0;
            const shared = sharedKeys.has(badge.key);

            return (
              <div
                key={badge.key}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
              >
                <AchievementBadgeVisual badgeKey={badge.key} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-extrabold text-slate-900">{badge.title}</div>
                    {shared ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-emerald-700">
                        gemeinsam
                      </span>
                    ) : null}
                    {count > 1 ? (
                      <span className="text-[10px] font-bold text-slate-400">{count}×</span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs leading-5 text-slate-500">{badge.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Noch keine Badges freigeschaltet.</p>
      )}
    </section>
  );
}

async function setFeaturedBadgeAction(formData: FormData) {
  "use server";

  const { clubId, player } = await requireClub();
  if (!player) redirect("/badges");

  const badgeKey = String(formData.get("badge_key") ?? "").trim();
  if (!getBadgeDefinition(badgeKey)) throw new Error("Unbekanntes Badge.");

  const supabase = createAdminClient();
  const { data: achievement, error: achievementError } = await supabase
    .from("player_achievements")
    .select("id")
    .eq("club_id", clubId)
    .eq("player_id", player.id)
    .eq("badge_key", badgeKey)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (achievementError) {
    throw new Error(`Badge konnte nicht geprüft werden: ${achievementError.message}`);
  }
  if (!achievement) throw new Error("Dieses Badge hast du noch nicht freigeschaltet.");

  const { error: updateError } = await supabase
    .from("players")
    .update({ selected_badge_key: badgeKey })
    .eq("club_id", clubId)
    .eq("id", player.id);

  if (updateError) {
    throw new Error(`Badge konnte nicht ausgewählt werden: ${updateError.message}`);
  }

  revalidatePath("/badges");
  revalidatePath("/profile");
  revalidatePath("/stats");
}

async function clearFeaturedBadgeAction() {
  "use server";

  const { clubId, player } = await requireClub();
  if (!player) redirect("/badges");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("players")
    .update({ selected_badge_key: null })
    .eq("club_id", clubId)
    .eq("id", player.id);

  if (error) {
    throw new Error(`Badge-Auswahl konnte nicht entfernt werden: ${error.message}`);
  }

  revalidatePath("/badges");
  revalidatePath("/profile");
  revalidatePath("/stats");
}

export default async function BadgesPageV3({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const { clubId, player } = await requireClub();
  const flags = await getFeatureFlagsForClub(clubId);

  if (!flags.hall_of_fame_badges) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
          <PageHero
            eyebrow="Badges"
            title="Hall of Fame"
            description="Dieses Feature ist in deinem Club aktuell noch nicht aktiviert."
            backLabel="Zurück"
            backHref="/stats"
            compact
          />
        </section>
      </main>
    );
  }

  await syncClubAchievements(clubId);
  const supabase = createAdminClient();

  const [
    { data: clubData, error: clubError },
    { data: playersData, error: playersError },
    { data: achievementsData, error: achievementsError },
  ] = await Promise.all([
    supabase
      .from("clubs")
      .select("display_name, primary_color")
      .eq("id", clubId)
      .maybeSingle<ClubRow>(),
    supabase
      .from("players")
      .select("id, name, first_name, last_name, nickname, is_guest, selected_badge_key")
      .eq("club_id", clubId)
      .order("first_name", { ascending: true }),
    supabase
      .from("player_achievements")
      .select("player_id, badge_key, season_id, season_ref, earned_at")
      .eq("club_id", clubId)
      .order("earned_at", { ascending: false }),
  ]);

  if (clubError) throw new Error(`Club konnte nicht geladen werden: ${clubError.message}`);
  if (playersError) throw new Error(`Spieler konnten nicht geladen werden: ${playersError.message}`);
  if (achievementsError) throw new Error(`Badges konnten nicht geladen werden: ${achievementsError.message}`);

  const players = ((playersData ?? []) as PlayerRow[]).filter((item) => item.is_guest !== true);
  const achievements = (achievementsData ?? []) as AchievementRow[];
  const ownPlayer = players.find((item) => item.id === player?.id) ?? null;

  if (!ownPlayer) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
          <PageHero
            eyebrow="Badges"
            title="Hall of Fame"
            description="Dein Account ist noch keinem Spielerprofil zugeordnet."
            primaryColorKey={clubData?.primary_color}
            backLabel="Zurück zu Stats"
            backHref="/stats"
            compact
          />
        </section>
      </main>
    );
  }

  const useNicknames = flags.use_nicknames;
  const requestedPlayerId = parsePlayerId(params.player);
  const displayPlayer =
    players.find((candidate) => candidate.id === requestedPlayerId) ?? ownPlayer;
  const isOwnHall = displayPlayer.id === ownPlayer.id;

  const achievementsByPlayer = new Map<number, AchievementRow[]>();
  for (const achievement of achievements) {
    const rows = achievementsByPlayer.get(achievement.player_id) ?? [];
    rows.push(achievement);
    achievementsByPlayer.set(achievement.player_id, rows);
  }

  const displayAchievements = achievementsByPlayer.get(displayPlayer.id) ?? [];
  const displayAchievementMap = getAchievementMap(displayAchievements);
  const earnedBadges = getEarnedDefinitions(displayAchievements);
  const openBadges = getOpenDefinitions(displayAchievements);
  const displayName = getPlayerDisplayName(displayPlayer, { useNicknames });
  const selectedBadge = displayPlayer.selected_badge_key
    ? getBadgeDefinition(displayPlayer.selected_badge_key)
    : null;

  const explicitCompareId = parsePlayerId(params.compare);
  const defaultCompareId = isOwnHall ? null : displayPlayer.id;
  const comparePlayerId = explicitCompareId ?? defaultCompareId;
  const comparePlayer =
    players.find(
      (candidate) => candidate.id === comparePlayerId && candidate.id !== ownPlayer.id,
    ) ?? null;
  const compareName = comparePlayer
    ? getPlayerDisplayName(comparePlayer, { useNicknames })
    : null;

  const ownAchievements = achievementsByPlayer.get(ownPlayer.id) ?? [];
  const ownEarnedBadges = getEarnedDefinitions(ownAchievements);
  const ownAchievementMap = getAchievementMap(ownAchievements);
  const compareAchievements = comparePlayer
    ? achievementsByPlayer.get(comparePlayer.id) ?? []
    : [];
  const compareEarnedBadges = comparePlayer
    ? getEarnedDefinitions(compareAchievements)
    : [];
  const compareAchievementMap = getAchievementMap(compareAchievements);

  const sharedKeys = new Set(
    ownEarnedBadges
      .map((badge) => badge.key)
      .filter((key) => compareEarnedBadges.some((badge) => badge.key === key)),
  );

  const statsPlayerIds = [ownPlayer.id, comparePlayer?.id]
    .filter((value): value is number => value != null);
  const statsByPlayer = await loadCareerStatsForPlayers(clubId, statsPlayerIds);
  const ownStats = statsByPlayer.get(ownPlayer.id) ?? emptyCareerStats();
  const compareStats = comparePlayer
    ? statsByPlayer.get(comparePlayer.id) ?? emptyCareerStats()
    : emptyCareerStats();

  const comparisonOptions = players
    .filter((candidate) => candidate.id !== ownPlayer.id)
    .sort((a, b) =>
      getPlayerDisplayName(a, { useNicknames }).localeCompare(
        getPlayerDisplayName(b, { useNicknames }),
        "de",
      ),
    );

  return (
    <main className="min-h-screen bg-neutral-100 pb-24">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <PageHero
          eyebrow="Badges"
          title={isOwnHall ? "Meine Hall of Fame" : `${displayName} · Hall of Fame`}
          description={
            isOwnHall
              ? "Deine Erfolge als persönlicher Trophäenschrank."
              : `Trophäenschrank von ${displayName}.`
          }
          primaryColorKey={clubData?.primary_color}
          backLabel={isOwnHall ? "Zurück zu Stats" : "Meine Hall of Fame"}
          backHref={isOwnHall ? "/stats" : "/badges"}
          topRightSlot={
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/90">
              {earnedBadges.length}/{BADGE_DEFINITIONS.length}
            </span>
          }
          compact
        />

        <section className="relative overflow-hidden rounded-[32px] bg-slate-950 p-5 text-white shadow-[0_28px_70px_rgba(15,23,42,0.24)] sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/[0.08] blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-36 w-1/2 bg-amber-400/[0.045] blur-3xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/40">
                <ShieldCheck className="h-4 w-4" />
                {displayName}
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                {isOwnHall ? "Mein Trophäenschrank" : "Trophäenschrank"}
              </h2>
              <p className="mt-2 text-sm font-medium text-white/55">
                {earnedBadges.length} freigeschaltet · {countByScope(earnedBadges, "career")} Karriere · {countByScope(earnedBadges, "season")} Saison/Serie
              </p>
            </div>

            <div className="flex min-w-[210px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3">
              {selectedBadge ? (
                <AchievementBadgeVisual badgeKey={selectedBadge.key} size="lg" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/40">
                  <Star className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/35">
                  Aktueller Titel
                </div>
                <div className="mt-0.5 truncate text-sm font-extrabold">
                  {selectedBadge?.title ?? "Noch keiner gewählt"}
                </div>
                {isOwnHall && selectedBadge ? (
                  <form action={clearFeaturedBadgeAction} className="mt-1">
                    <button type="submit" className="text-[10px] font-bold text-white/40 underline underline-offset-4 hover:text-white">
                      Entfernen
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>

          {earnedBadges.length > 0 ? (
            <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {earnedBadges.map((badge) => (
                <TrophyCard
                  key={badge.key}
                  badge={badge}
                  achievementRows={displayAchievementMap.get(badge.key) ?? []}
                  selected={displayPlayer.selected_badge_key === badge.key}
                  canSelect={isOwnHall}
                />
              ))}
            </div>
          ) : (
            <div className="relative mt-6 rounded-[24px] border border-dashed border-white/15 bg-white/[0.04] p-6 text-center">
              <Sparkles className="mx-auto h-7 w-7 text-white/40" />
              <div className="mt-3 text-sm font-extrabold">Der Schrank ist noch leer.</div>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Nächste Ziele
              </div>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                Was geht noch?
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Noch nicht erreichte Badges bleiben ausgegraut. Geheime Badges verraten sich erst beim Freischalten.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
              {openBadges.length} offen
            </div>
          </div>

          {openBadges.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {openBadges.map((badge) => (
                <LockedBadgeCard key={badge.key} badge={badge} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              Alles eingesammelt. 🏆
            </div>
          )}
        </section>

        <details
          className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          open={Boolean(comparePlayer)}
        >
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  <Scale className="h-4 w-4" />
                  Vergleich
                </div>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                  Mit einem Spieler vergleichen
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Stats oben, darunter alle Badges beider Spieler.
                </p>
              </div>
              <ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" />
            </div>
          </summary>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <form method="get" action="/badges" className="flex flex-col gap-3 sm:flex-row sm:items-end">
              {isOwnHall ? null : <input type="hidden" name="player" value={displayPlayer.id} />}
              <label className="min-w-0 flex-1">
                <span className="mb-2 block text-xs font-bold text-slate-600">Spieler auswählen</span>
                <select
                  name="compare"
                  defaultValue={comparePlayer?.id ?? ""}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                >
                  <option value="">Bitte auswählen …</option>
                  {comparisonOptions.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {getPlayerDisplayName(candidate, { useNicknames })}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Vergleichen
              </button>
            </form>

            {comparePlayer && compareName ? (
              <div className="mt-6 space-y-4">
                <section className="overflow-hidden rounded-[28px] bg-slate-950 p-4 text-white shadow-[0_22px_52px_rgba(15,23,42,0.2)] sm:p-5">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-1">
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/35">Du</div>
                      <Link
                        href={`/badges?player=${ownPlayer.id}`}
                        className="mt-1 block text-xs font-black leading-tight text-white underline decoration-white/15 underline-offset-4 hover:decoration-white/60 sm:text-sm"
                      >
                        {getPlayerDisplayName(ownPlayer, { useNicknames })}
                      </Link>
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/40">
                      vs
                    </div>

                    <div className="min-w-0 text-right">
                      <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/35">Vergleich</div>
                      <Link
                        href={`/badges?player=${comparePlayer.id}`}
                        className="mt-1 block text-xs font-black leading-tight text-white underline decoration-white/15 underline-offset-4 hover:decoration-white/60 sm:text-sm"
                      >
                        {compareName}
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.045]">
                    <ComparisonMetricRow
                      label="Teilnahmen"
                      leftValue={String(ownStats.appearances)}
                      rightValue={String(compareStats.appearances)}
                    />
                    <ComparisonMetricRow
                      label="Siege"
                      leftValue={String(ownStats.wins)}
                      rightValue={String(compareStats.wins)}
                    />
                    <ComparisonMetricRow
                      label="Siegquote"
                      leftValue={formatPercent(ownStats.winRate)}
                      rightValue={formatPercent(compareStats.winRate)}
                    />
                    <ComparisonMetricRow
                      label="Badges"
                      leftValue={String(ownEarnedBadges.length)}
                      rightValue={String(compareEarnedBadges.length)}
                    />
                  </div>
                </section>

                <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                  <PlayerBadgeCollection
                    title={getPlayerDisplayName(ownPlayer, { useNicknames })}
                    playerId={ownPlayer.id}
                    badges={ownEarnedBadges}
                    achievementMap={ownAchievementMap}
                    sharedKeys={sharedKeys}
                  />
                  <PlayerBadgeCollection
                    title={compareName}
                    playerId={comparePlayer.id}
                    badges={compareEarnedBadges}
                    achievementMap={compareAchievementMap}
                    sharedKeys={sharedKeys}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </details>
      </section>
    </main>
  );
}
