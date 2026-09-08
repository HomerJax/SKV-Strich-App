import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Award, CheckCircle2, LockKeyhole, Star, Trophy } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import { requireClub } from "@/lib/auth/guards";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import {
  BADGE_DEFINITIONS,
  CAREER_BADGES,
  SEASON_BADGES,
  getBadgeDefinition,
} from "@/lib/badges/catalog";
import { syncClubAchievements } from "@/lib/badges/engine";
import { getPlayerDisplayName } from "@/lib/player-display";
import { createAdminClient } from "@/lib/supabase/admin";

type PageProps = {
  searchParams?: Promise<{
    player?: string;
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

function parsePlayerId(value?: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function countUniqueBadges(rows: AchievementRow[]) {
  return new Set(rows.map((row) => row.badge_key)).size;
}

function BadgeGrid({
  definitions,
  achievements,
  selectedBadgeKey,
  canSelect,
}: {
  definitions: readonly {
    key: string;
    title: string;
    description: string;
    scope: "season" | "career";
    category: string;
  }[];
  achievements: AchievementRow[];
  selectedBadgeKey: string | null;
  canSelect: boolean;
}) {
  const earnedByKey = new Map<string, AchievementRow[]>();

  for (const achievement of achievements) {
    const rows = earnedByKey.get(achievement.badge_key) ?? [];
    rows.push(achievement);
    earnedByKey.set(achievement.badge_key, rows);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {definitions.map((badge) => {
        const earnedRows = earnedByKey.get(badge.key) ?? [];
        const earned = earnedRows.length > 0;
        const selected = selectedBadgeKey === badge.key;

        return (
          <div
            key={badge.key}
            className={[
              "relative overflow-hidden rounded-[24px] border p-4 transition",
              earned
                ? "border-slate-200 bg-white shadow-sm"
                : "border-slate-200 bg-slate-100/70 text-slate-400 grayscale",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div
                className={[
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                  earned
                    ? "border-slate-200 bg-slate-950 text-white"
                    : "border-slate-200 bg-slate-200 text-slate-500",
                ].join(" ")}
              >
                {earned ? (
                  <Award className="h-6 w-6" strokeWidth={2.2} />
                ) : (
                  <LockKeyhole className="h-5 w-5" strokeWidth={2.1} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    className={[
                      "text-sm font-extrabold tracking-tight",
                      earned ? "text-slate-950" : "text-slate-500",
                    ].join(" ")}
                  >
                    {badge.title}
                  </h3>

                  {selected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      <Star className="h-3 w-3 fill-current" />
                      Ausgewählt
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {badge.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold",
                      earned
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-500",
                    ].join(" ")}
                  >
                    {earned ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <LockKeyhole className="h-3 w-3" />
                    )}
                    {earned ? "Erreicht" : "Noch offen"}
                  </span>

                  {earnedRows.length > 1 ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                      {earnedRows.length}× erreicht
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {earned && canSelect ? (
              <form action={setFeaturedBadgeAction} className="mt-4">
                <input type="hidden" name="badge_key" value={badge.key} />
                <button
                  type="submit"
                  disabled={selected}
                  className={[
                    "inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-xs font-bold transition",
                    selected
                      ? "cursor-default bg-slate-100 text-slate-400"
                      : "bg-slate-950 text-white hover:bg-slate-800",
                  ].join(" ")}
                >
                  {selected ? "Dieses Badge ist ausgewählt" : "Als mein Badge wählen"}
                </button>
              </form>
            ) : null}
          </div>
        );
      })}
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

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">
            Die Badge-Logik ist vorbereitet, aber für diesen Club per Feature Flag
            deaktiviert.
          </div>
        </section>
      </main>
    );
  }

  const syncResult = await syncClubAchievements(clubId);
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
    throw new Error(`Club konnte für die Hall of Fame nicht geladen werden: ${clubError.message}`);
  }

  if (playersError) {
    throw new Error(`Spieler konnten für die Hall of Fame nicht geladen werden: ${playersError.message}`);
  }

  if (achievementsError) {
    throw new Error(`Badges konnten nicht geladen werden: ${achievementsError.message}`);
  }

  const players = ((playersData ?? []) as PlayerRow[]).filter(
    (item) => item.is_guest !== true,
  );
  const achievements = (achievementsData ?? []) as AchievementRow[];
  const requestedPlayerId = parsePlayerId(resolvedSearchParams.player);
  const defaultPlayerId = player?.id ?? players[0]?.id ?? null;
  const selectedPlayer =
    players.find((item) => item.id === requestedPlayerId) ??
    players.find((item) => item.id === defaultPlayerId) ??
    players[0] ??
    null;

  if (!selectedPlayer) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
          <PageHero
            eyebrow="Badges"
            title="Hall of Fame"
            description="Noch keine Spieler vorhanden."
            primaryColorKey={clubData?.primary_color}
            backLabel="Zurück"
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

  const ranking = players
    .map((item) => ({
      player: item,
      count: countUniqueBadges(achievementsByPlayer.get(item.id) ?? []),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return getPlayerDisplayName(a.player, { useNicknames }).localeCompare(
        getPlayerDisplayName(b.player, { useNicknames }),
        "de",
      );
    });

  const selectedAchievements = achievementsByPlayer.get(selectedPlayer.id) ?? [];
  const selectedCount = countUniqueBadges(selectedAchievements);
  const selectedName = getPlayerDisplayName(selectedPlayer, { useNicknames });
  const ownPlayer = player?.id === selectedPlayer.id;
  const selectedBadge = selectedPlayer.selected_badge_key
    ? getBadgeDefinition(selectedPlayer.selected_badge_key)
    : null;

  return (
    <main className="min-h-screen bg-neutral-100 pb-24">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <PageHero
          eyebrow="Badges"
          title="Hall of Fame"
          description="Automatische Erfolge für Teilnahme, Serien, Siege und Karriere. Erreichte Badges bleiben sichtbar – offene siehst du ausgegraut."
          primaryColorKey={clubData?.primary_color}
          backLabel="Zurück zu Stats"
          backHref="/stats"
          topRightSlot={
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/90">
              {BADGE_DEFINITIONS.length} Badges
            </span>
          }
          compact
        />

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Hall of Fame
              </div>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-950">
                Spieler vergleichen
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Badge-Typen pro Spieler. Mehrfach erreichte Saison-Badges zählen
                hier einmal.
              </p>
            </div>

            {syncResult.badgesStartedAt ? (
              <div className="text-xs font-semibold text-slate-500">
                Saison-/Serien-Badges seit {syncResult.badgesStartedAt}
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ranking.map((entry, index) => {
              const active = entry.player.id === selectedPlayer.id;

              return (
                <Link
                  key={entry.player.id}
                  href={`/badges?player=${entry.player.id}`}
                  className={[
                    "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition",
                    active
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-white",
                  ].join(" ")}
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-60">
                      #{index + 1}
                    </div>
                    <div className="truncate text-sm font-extrabold">
                      {getPlayerDisplayName(entry.player, { useNicknames })}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 text-sm font-black">
                    <Trophy className="h-4 w-4" />
                    {entry.count}/{BADGE_DEFINITIONS.length}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {ownPlayer ? "Meine Hall of Fame" : "Spieler"}
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                {selectedName}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {selectedCount} von {BADGE_DEFINITIONS.length} Badge-Typen erreicht.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Angezeigtes Badge
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Star className="h-4 w-4" />
                {selectedBadge?.title ?? "Noch keins gewählt"}
              </div>
            </div>
          </div>

          {ownPlayer && selectedBadge ? (
            <form action={clearFeaturedBadgeAction} className="mt-4">
              <button
                type="submit"
                className="text-xs font-bold text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
              >
                Ausgewähltes Badge entfernen
              </button>
            </form>
          ) : null}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-950">
              Saison & Serien
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Diese Badges werden pro Saison erreicht und können in mehreren
              Saisons erneut gesammelt werden.
            </p>
          </div>

          <BadgeGrid
            definitions={SEASON_BADGES}
            achievements={selectedAchievements}
            selectedBadgeKey={selectedPlayer.selected_badge_key}
            canSelect={ownPlayer}
          />
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-950">
              Karriere
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Karriere-Meilensteine nutzen die bereits gespeicherte Historie des
              Clubs. Dafür wird nichts an bestehenden Stats zurückgesetzt.
            </p>
          </div>

          <BadgeGrid
            definitions={CAREER_BADGES}
            achievements={selectedAchievements}
            selectedBadgeKey={selectedPlayer.selected_badge_key}
            canSelect={ownPlayer}
          />
        </section>
      </section>
    </main>
  );
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
