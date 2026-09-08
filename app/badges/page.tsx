import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ChevronDown,
  LockKeyhole,
  Medal,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import { requireClub } from "@/lib/auth/guards";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import {
  BADGE_DEFINITIONS,
  getBadgeDefinition,
} from "@/lib/badges/catalog";
import { syncClubAchievements } from "@/lib/badges/engine";
import { getPlayerDisplayName } from "@/lib/player-display";
import { createAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  searchParams?: Promise<{
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

type TeamPlayerRow = {
  team_id: number;
  player_id: number;
};

type TeamRow = {
  id: number;
  session_id: number;
};

type ResultRow = {
  session_id: number;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

type CareerStats = {
  appearances: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
};

type BadgeDefinition = (typeof BADGE_DEFINITIONS)[number];

const CAREER_APPEARANCE_PREFIX = "career_appearances_";
const CAREER_WIN_PREFIX = "career_wins_";

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

function isCareerMilestone(badge: BadgeDefinition) {
  return (
    badge.key.startsWith(CAREER_APPEARANCE_PREFIX) ||
    badge.key.startsWith(CAREER_WIN_PREFIX)
  );
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0,0%";
  return `${value.toFixed(1).replace(".", ",")}%`;
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

async function loadCareerStatsForPlayers(
  clubId: string,
  playerIds: number[],
) {
  const supabase = createAdminClient();
  const stats = new Map<number, CareerStats>(
    playerIds.map((playerId) => [playerId, emptyCareerStats()]),
  );

  if (playerIds.length === 0) return stats;

  const { data: teamPlayerData, error: teamPlayerError } = await supabase
    .from("team_players")
    .select("team_id, player_id")
    .in("player_id", playerIds);

  if (teamPlayerError) {
    throw new Error(
      `Vergleichs-Teams konnten nicht geladen werden: ${teamPlayerError.message}`,
    );
  }

  const teamPlayerRows = (teamPlayerData ?? []) as TeamPlayerRow[];
  const teamIds = Array.from(
    new Set(teamPlayerRows.map((row) => row.team_id).filter(Number.isFinite)),
  );

  if (teamIds.length === 0) return stats;

  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .select("id, session_id")
    .in("id", teamIds);

  if (teamError) {
    throw new Error(
      `Vergleichs-Sessions konnten nicht geladen werden: ${teamError.message}`,
    );
  }

  const teams = (teamData ?? []) as TeamRow[];
  const sessionIds = Array.from(
    new Set(teams.map((team) => team.session_id).filter(Number.isFinite)),
  );

  if (sessionIds.length === 0) return stats;

  const { data: resultData, error: resultError } = await supabase
    .from("results")
    .select("session_id, team_a_id, team_b_id, goals_team_a, goals_team_b")
    .eq("club_id", clubId)
    .in("session_id", sessionIds);

  if (resultError) {
    throw new Error(
      `Vergleichs-Ergebnisse konnten nicht geladen werden: ${resultError.message}`,
    );
  }

  const results = (resultData ?? []) as ResultRow[];
  const teamIdsByPlayer = new Map<number, Set<number>>();

  for (const playerId of playerIds) {
    teamIdsByPlayer.set(playerId, new Set<number>());
  }

  for (const row of teamPlayerRows) {
    teamIdsByPlayer.get(row.player_id)?.add(row.team_id);
  }

  for (const playerId of playerIds) {
    const ownTeamIds = teamIdsByPlayer.get(playerId) ?? new Set<number>();
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let appearances = 0;

    for (const result of results) {
      const teamA = result.team_a_id;
      const teamB = result.team_b_id;
      const isTeamA = teamA !== null && ownTeamIds.has(teamA);
      const isTeamB = teamB !== null && ownTeamIds.has(teamB);

      if (!isTeamA && !isTeamB) continue;

      appearances += 1;
      const goalsA = result.goals_team_a ?? 0;
      const goalsB = result.goals_team_b ?? 0;

      if (goalsA === goalsB) {
        draws += 1;
      } else if ((isTeamA && goalsA > goalsB) || (isTeamB && goalsB > goalsA)) {
        wins += 1;
      } else {
        losses += 1;
      }
    }

    const completedResults = wins + losses + draws;
    stats.set(playerId, {
      appearances,
      wins,
      losses,
      draws,
      winRate: completedResults > 0 ? (wins / completedResults) * 100 : 0,
    });
  }

  return stats;
}

function TrophyCard({
  badge,
  achievementRows,
  selected,
}: {
  badge: BadgeDefinition;
  achievementRows: AchievementRow[];
  selected: boolean;
}) {
  const repeatCount = achievementRows.length;

  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.07] p-4 text-white shadow-[0_16px_40px_rgba(0,0,0,0.2)] backdrop-blur-sm">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner">
          {badge.scope === "career" ? (
            <Trophy className="h-7 w-7" strokeWidth={1.8} />
          ) : (
            <Medal className="h-7 w-7" strokeWidth={1.8} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black tracking-tight">{badge.title}</h3>
            {selected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-950">
                <Star className="h-3 w-3 fill-current" />
                Mein Titel
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-xs font-medium leading-5 text-white/65">
            {badge.description}
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/50">
            <span>{badge.scope === "career" ? "Karriere" : "Saison"}</span>
            {repeatCount > 1 ? <span>· {repeatCount}× erreicht</span> : null}
          </div>
        </div>
      </div>

      {!selected ? (
        <form action={setFeaturedBadgeAction} className="relative mt-4">
          <input type="hidden" name="badge_key" value={badge.key} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/80 transition hover:bg-white hover:text-slate-950"
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
  return (
    <article className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
          <LockKeyhole className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-slate-700">{badge.title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{badge.description}</p>
        </div>
      </div>
    </article>
  );
}

function ComparisonBadgeList({
  title,
  badges,
  emptyLabel,
}: {
  title: string;
  badges: readonly BadgeDefinition[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
        {title}
      </div>
      {badges.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge.key}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm"
            >
              {badge.title}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{emptyLabel}</p>
      )}
    </div>
  );
}

function ComparisonMetricRow({
  label,
  leftValue,
  rightValue,
  hint,
}: {
  label: string;
  leftValue: string;
  rightValue: string;
  hint?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
      <div className="text-left text-lg font-black tracking-tight text-white sm:text-xl">
        {leftValue}
      </div>
      <div className="min-w-[104px] text-center sm:min-w-[118px]">
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/45 sm:text-[10px]">
          {label}
        </div>
        {hint ? (
          <div className="mt-0.5 text-[9px] font-semibold text-white/30 sm:text-[10px]">
            {hint}
          </div>
        ) : null}
      </div>
      <div className="text-right text-lg font-black tracking-tight text-white sm:text-xl">
        {rightValue}
      </div>
    </div>
  );
}

async function setFeaturedBadgeAction(formData: FormData) {
  "use server";

  const { clubId, player } = await requireClub();
  if (!player) redirect("/badges");

  const badgeKey = String(formData.get("badge_key") ?? "").trim();
  if (!getBadgeDefinition(badgeKey)) {
    throw new Error("Unbekanntes Badge.");
  }

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

  if (!achievement) {
    throw new Error("Dieses Badge hast du noch nicht freigeschaltet.");
  }

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

export default async function BadgesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
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
      .select(
        "id, name, first_name, last_name, nickname, is_guest, selected_badge_key",
      )
      .eq("club_id", clubId)
      .order("first_name", { ascending: true }),
    supabase
      .from("player_achievements")
      .select("player_id, badge_key, season_id, season_ref, earned_at")
      .eq("club_id", clubId)
      .order("earned_at", { ascending: false }),
  ]);

  if (clubError) {
    throw new Error(
      `Club konnte für die Hall of Fame nicht geladen werden: ${clubError.message}`,
    );
  }
  if (playersError) {
    throw new Error(
      `Spieler konnten für die Hall of Fame nicht geladen werden: ${playersError.message}`,
    );
  }
  if (achievementsError) {
    throw new Error(`Badges konnten nicht geladen werden: ${achievementsError.message}`);
  }

  const players = ((playersData ?? []) as PlayerRow[]).filter(
    (item) => item.is_guest !== true,
  );
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
  const achievementsByPlayer = new Map<number, AchievementRow[]>();

  for (const achievement of achievements) {
    const rows = achievementsByPlayer.get(achievement.player_id) ?? [];
    rows.push(achievement);
    achievementsByPlayer.set(achievement.player_id, rows);
  }

  const ownAchievements = achievementsByPlayer.get(ownPlayer.id) ?? [];
  const ownAchievementMap = getAchievementMap(ownAchievements);
  const earnedBadges = getEarnedDefinitions(ownAchievements);
  const openBadges = getOpenDefinitions(ownAchievements);
  const ownName = getPlayerDisplayName(ownPlayer, { useNicknames });
  const selectedBadge = ownPlayer.selected_badge_key
    ? getBadgeDefinition(ownPlayer.selected_badge_key)
    : null;

  const comparePlayerId = parsePlayerId(resolvedSearchParams.compare);
  const comparePlayer =
    players.find(
      (candidate) => candidate.id === comparePlayerId && candidate.id !== ownPlayer.id,
    ) ?? null;
  const compareAchievements = comparePlayer
    ? achievementsByPlayer.get(comparePlayer.id) ?? []
    : [];
  const compareEarnedBadges = comparePlayer
    ? getEarnedDefinitions(compareAchievements)
    : [];
  const compareName = comparePlayer
    ? getPlayerDisplayName(comparePlayer, { useNicknames })
    : null;

  const ownKeys = new Set(earnedBadges.map((badge) => badge.key));
  const compareKeys = new Set(compareEarnedBadges.map((badge) => badge.key));
  const sharedBadges = earnedBadges.filter((badge) => compareKeys.has(badge.key));
  const onlyMine = earnedBadges.filter((badge) => !compareKeys.has(badge.key));
  const onlyTheirs = compareEarnedBadges.filter((badge) => !ownKeys.has(badge.key));
  const sharedSpecialBadges = sharedBadges.filter((badge) => !isCareerMilestone(badge));
  const onlyMineSpecialBadges = onlyMine.filter((badge) => !isCareerMilestone(badge));
  const onlyTheirsSpecialBadges = onlyTheirs.filter((badge) => !isCareerMilestone(badge));

  const comparisonOptions = players
    .filter((candidate) => candidate.id !== ownPlayer.id)
    .sort((a, b) =>
      getPlayerDisplayName(a, { useNicknames }).localeCompare(
        getPlayerDisplayName(b, { useNicknames }),
        "de",
      ),
    );

  const careerStats = comparePlayer
    ? await loadCareerStatsForPlayers(clubId, [ownPlayer.id, comparePlayer.id])
    : new Map<number, CareerStats>();
  const ownCareerStats = careerStats.get(ownPlayer.id) ?? emptyCareerStats();
  const compareCareerStats = comparePlayer
    ? careerStats.get(comparePlayer.id) ?? emptyCareerStats()
    : emptyCareerStats();

  return (
    <main className="min-h-screen bg-neutral-100 pb-24">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <PageHero
          eyebrow="Badges"
          title="Meine Hall of Fame"
          description="Deine Erfolge auf einen Blick – wie ein persönlicher Trophäenschrank."
          primaryColorKey={clubData?.primary_color}
          backLabel="Zurück zu Stats"
          backHref="/stats"
          topRightSlot={
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/90">
              {earnedBadges.length}/{BADGE_DEFINITIONS.length}
            </span>
          }
          compact
        />

        <section className="relative overflow-hidden rounded-[32px] bg-slate-950 p-5 text-white shadow-[0_28px_70px_rgba(15,23,42,0.22)] sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 h-28 w-1/2 bg-white/[0.04] blur-3xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                <ShieldCheck className="h-4 w-4" />
                {ownName}
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                Mein Trophäenschrank
              </h2>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-white/60">
                {earnedBadges.length} Badges freigeschaltet · {countByScope(earnedBadges, "career")} Karriere · {countByScope(earnedBadges, "season")} Saison/Serie
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">
                Aktueller Titel
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm font-extrabold">
                <Star className="h-4 w-4" />
                {selectedBadge?.title ?? "Noch keiner gewählt"}
              </div>
              {selectedBadge ? (
                <form action={clearFeaturedBadgeAction} className="mt-2">
                  <button
                    type="submit"
                    className="text-[11px] font-bold text-white/45 underline underline-offset-4 hover:text-white"
                  >
                    Titel entfernen
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          {earnedBadges.length > 0 ? (
            <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {earnedBadges.map((badge) => (
                <TrophyCard
                  key={badge.key}
                  badge={badge}
                  achievementRows={ownAchievementMap.get(badge.key) ?? []}
                  selected={ownPlayer.selected_badge_key === badge.key}
                />
              ))}
            </div>
          ) : (
            <div className="relative mt-6 rounded-[24px] border border-dashed border-white/15 bg-white/[0.04] p-6 text-center">
              <Sparkles className="mx-auto h-7 w-7 text-white/40" />
              <div className="mt-3 text-sm font-extrabold">Der Schrank ist noch leer.</div>
              <p className="mt-1 text-xs leading-5 text-white/50">
                Deine ersten Badges landen hier automatisch.
              </p>
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
                Diese Badges fehlen dir aktuell noch.
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
              Alles eingesammelt. Stark. 🏆
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
                  Erst wenn du vergleichen willst, erscheint die Spielerauswahl.
                </p>
              </div>
              <ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" />
            </div>
          </summary>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <form
              method="get"
              action="/badges"
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <label className="min-w-0 flex-1">
                <span className="mb-2 block text-xs font-bold text-slate-600">
                  Spieler auswählen
                </span>
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
                  <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-1 sm:gap-3">
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/40 sm:text-[10px]">
                        Du
                      </div>
                      <div className="mt-1 break-words text-xs font-black leading-snug sm:text-sm">
                        {ownName}
                      </div>
                    </div>

                    <div className="mt-1 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/45 sm:px-3 sm:text-[10px]">
                      vs
                    </div>

                    <div className="min-w-0 text-right">
                      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/40 sm:text-[10px]">
                        Vergleich
                      </div>
                      <div className="mt-1 break-words text-xs font-black leading-snug sm:text-sm">
                        {compareName}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.05]">
                    <ComparisonMetricRow
                      label="Badges"
                      leftValue={String(earnedBadges.length)}
                      rightValue={String(compareEarnedBadges.length)}
                      hint="freigeschaltet"
                    />
                    <ComparisonMetricRow
                      label="Teilnahmen"
                      leftValue={String(ownCareerStats.appearances)}
                      rightValue={String(compareCareerStats.appearances)}
                      hint="mit Ergebnis"
                    />
                    <ComparisonMetricRow
                      label="Siege"
                      leftValue={String(ownCareerStats.wins)}
                      rightValue={String(compareCareerStats.wins)}
                    />
                    <ComparisonMetricRow
                      label="Siegquote"
                      leftValue={formatPercent(ownCareerStats.winRate)}
                      rightValue={formatPercent(compareCareerStats.winRate)}
                      hint="Siege / Ergebnisse"
                    />
                  </div>
                </section>

                <ComparisonBadgeList
                  title={`Gemeinsame Specials · ${sharedSpecialBadges.length}`}
                  badges={sharedSpecialBadges}
                  emptyLabel="Neben den Karriere-Meilensteinen habt ihr aktuell noch keine gemeinsamen Specials."
                />

                <div className="grid gap-3 lg:grid-cols-2">
                  <ComparisonBadgeList
                    title={`Nur du · ${onlyMineSpecialBadges.length}`}
                    badges={onlyMineSpecialBadges}
                    emptyLabel="Aktuell keine zusätzlichen Specials nur auf deiner Seite."
                  />
                  <ComparisonBadgeList
                    title={`Nur ${compareName} · ${onlyTheirsSpecialBadges.length}`}
                    badges={onlyTheirsSpecialBadges}
                    emptyLabel="Aktuell keine zusätzlichen Specials nur auf dieser Seite."
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
