import type { BadgeKey as PlayerBadgeTier } from "@/lib/badges/helpers";

export type BadgeHistoryMode = "A" | "B" | "C";

export type BadgeVisualFamily =
  | "career"
  | "attendance"
  | "wins"
  | "losses"
  | "special";

export type BadgeVisualMotif =
  | "career-appearances"
  | "career-wins"
  | "kickoff"
  | "attendance"
  | "win-streak"
  | "loss-streak"
  | "curse-broken"
  | "resilient"
  | "lucky"
  | "comeback";

export type BadgeVisualMeta = {
  tier: PlayerBadgeTier;
  tierLabel: string;
  family: BadgeVisualFamily;
  familyLabel: string;
  motif: BadgeVisualMotif;
  motifLabel: string;
  stage: number;
  asset: string | null;
  visualLabel: string;
  historyMode: BadgeHistoryMode;
  historyLabel: string;
  secret: boolean;
  implementationNote?: string;
};

const SECRET_BADGES = new Set([
  "curse_broken",
  "resilient",
  "lucky_charm",
  "comeback",
]);

// Zentrales Prinzip: das quadratische 3D-strikr-Badge bleibt immer der Kern.
// Je schwerer ein Badge ist, desto stärker eskaliert das Motiv außen herum.
const CUSTOM_ASSET_BY_BADGE_KEY: Record<string, string> = {
  // Karriere · Einsätze: Schild / Beständigkeit / Club-Legende
  career_appearances_250: "/badges/achievements/career-appearances-250.svg",
  career_appearances_500: "/badges/achievements/career-appearances-500.svg",

  // Karriere · Siege: Jubel-Crowd als eigene visuelle Familie
  career_wins_1: "/badges/achievements/career-wins-1.svg",
  career_wins_10: "/badges/achievements/career-wins-10.svg",
  career_wins_50: "/badges/achievements/career-wins-50.svg",
  career_wins_100: "/badges/achievements/career-wins-50.svg",
  career_wins_250: "/badges/achievements/career-wins-250.svg",

  // Teilnahme & Disziplin: Läufer / Motion / Puls / Halo
  attendance_streak_5: "/badges/achievements/attendance-dauerlaeufer.svg",
  attendance_streak_20: "/badges/achievements/attendance-immer-da.svg",

  // Saisonserien / Pech / Specials
  win_streak_10: "/badges/achievements/win-streak.webp",
  loss_streak_7: "/badges/achievements/losses-dark-fun.svg",
  curse_broken: "/badges/achievements/special-curse-broken.svg",
  lucky_charm: "/badges/achievements/special-lucky-charm.svg",
  comeback: "/badges/achievements/comeback.webp",
};

function parseSuffix(key: string, prefix: string) {
  if (!key.startsWith(prefix)) return null;
  const value = Number(key.slice(prefix.length));
  return Number.isFinite(value) ? value : null;
}

function getAppearanceStage(value: number) {
  if (value >= 500) return 6;
  if (value >= 250) return 5;
  if (value >= 100) return 4;
  if (value >= 50) return 3;
  if (value >= 25) return 2;
  return 1;
}

function getCareerWinStage(value: number) {
  if (value >= 250) return 6;
  if (value >= 100) return 5;
  if (value >= 50) return 4;
  if (value >= 25) return 3;
  if (value >= 10) return 2;
  return 1;
}

function getAttendanceStage(value: number) {
  if (value >= 20) return 5;
  if (value >= 15) return 4;
  if (value >= 10) return 3;
  if (value >= 5) return 2;
  return 1;
}

function getWinStreakStage(value: number) {
  if (value >= 10) return 5;
  if (value >= 7) return 4;
  if (value >= 5) return 3;
  if (value >= 3) return 2;
  return 1;
}

function getLossStreakStage(value: number) {
  if (value >= 7) return 3;
  if (value >= 5) return 2;
  return 1;
}

export function getAchievementVisualTier(badgeKey: string): PlayerBadgeTier {
  const appearances = parseSuffix(badgeKey, "career_appearances_");
  if (appearances !== null) {
    if (appearances >= 500) return "goat";
    if (appearances >= 250) return "gold";
    if (appearances >= 100) return "gold";
    if (appearances >= 50) return "silver";
    if (appearances >= 25) return "bronze";
    return "copper";
  }

  const careerWins = parseSuffix(badgeKey, "career_wins_");
  if (careerWins !== null) {
    if (careerWins >= 100) return "goat";
    if (careerWins >= 50) return "gold";
    if (careerWins >= 25) return "silver";
    if (careerWins >= 10) return "bronze";
    return "copper";
  }

  const attendance = parseSuffix(badgeKey, "attendance_streak_");
  if (attendance !== null) {
    if (attendance >= 20) return "goat";
    if (attendance >= 15) return "gold";
    if (attendance >= 10) return "silver";
    if (attendance >= 5) return "bronze";
    return "copper";
  }

  const winStreak = parseSuffix(badgeKey, "win_streak_");
  if (winStreak !== null) {
    if (winStreak >= 10) return "goat";
    if (winStreak >= 7) return "gold";
    if (winStreak >= 5) return "silver";
    if (winStreak >= 3) return "bronze";
    return "copper";
  }

  const lossStreak = parseSuffix(badgeKey, "loss_streak_");
  if (lossStreak !== null) {
    if (lossStreak >= 7) return "gold";
    if (lossStreak >= 5) return "silver";
    return "bronze";
  }

  if (badgeKey === "season_kickoff") return "copper";
  if (badgeKey === "curse_broken") return "gold";
  if (badgeKey === "resilient") return "bronze";
  if (badgeKey === "lucky_charm") return "goat";
  if (badgeKey === "comeback") return "silver";

  return "silver";
}

export function getAchievementTierLabel(tier: PlayerBadgeTier) {
  if (tier === "copper") return "Blech";
  if (tier === "bronze") return "Bronze";
  if (tier === "silver") return "Silber";
  if (tier === "gold") return "Gold";
  if (tier === "goat") return "Legendär";
  return "–";
}

function getBadgeTierLabel(badgeKey: string, tier: PlayerBadgeTier) {
  if (badgeKey === "career_appearances_500") return "GOAT";
  if (badgeKey === "career_appearances_250") return "Legendär";
  return getAchievementTierLabel(tier);
}

function getFamily(
  badgeKey: string,
): Pick<BadgeVisualMeta, "family" | "familyLabel"> {
  if (badgeKey.startsWith("career_")) {
    return { family: "career", familyLabel: "Karriere" };
  }
  if (badgeKey.startsWith("attendance_") || badgeKey === "season_kickoff") {
    return { family: "attendance", familyLabel: "Teilnahme & Disziplin" };
  }
  if (badgeKey.startsWith("win_streak_")) {
    return { family: "wins", familyLabel: "Siege & Serien" };
  }
  if (badgeKey.startsWith("loss_streak_")) {
    return { family: "losses", familyLabel: "Pech & Niederlagen" };
  }
  return { family: "special", familyLabel: "Special / Secret" };
}

function getMotif(
  badgeKey: string,
): Pick<BadgeVisualMeta, "motif" | "motifLabel" | "stage"> {
  const appearances = parseSuffix(badgeKey, "career_appearances_");
  if (appearances !== null) {
    return {
      motif: "career-appearances",
      motifLabel:
        appearances >= 500
          ? "GOAT · Club-Legende · Rainbow-Krone + Schild + volle Aura"
          : appearances >= 250
            ? "Legendär · Gold+ · Karriere-Elite · Schild + Glow"
            : "Karriere-Einsätze · Schild / Beständigkeit",
      stage: getAppearanceStage(appearances),
    };
  }

  const careerWins = parseSuffix(badgeKey, "career_wins_");
  if (careerWins !== null) {
    return {
      motif: "career-wins",
      motifLabel:
        careerWins >= 250
          ? "Sieges-Legende · große Jubel-Crowd + Sieger-Aura"
          : careerWins >= 100
            ? "Sieges-Elite · große Jubel-Crowd + Sieger-Aura"
            : careerWins >= 50
              ? "Karrieresiege · Jubel-Crowd + Siegerlicht"
              : careerWins >= 10
                ? "Karrieresiege · Jubel-Crowd + Siegerstern"
                : "1. Karrieresieg · Blech + erste Jubel-Crowd",
      stage: getCareerWinStage(careerWins),
    };
  }

  if (badgeKey === "season_kickoff") {
    return {
      motif: "kickoff",
      motifLabel: "Saisonstart · Start-Stern",
      stage: 1,
    };
  }

  const attendance = parseSuffix(badgeKey, "attendance_streak_");
  if (attendance !== null) {
    return {
      motif: "attendance",
      motifLabel:
        attendance >= 20
          ? "Immer da · Läufer + Halo + Legendär-Aura"
          : attendance >= 15
            ? "Inventar · Läufer + stabiler Ring"
            : attendance >= 10
              ? "Unkaputtbar · Puls + Läufer"
              : attendance >= 5
                ? "Dauerläufer · Läufer + Motion + Puls"
                : "Warmgelaufen · Läufer",
      stage: getAttendanceStage(attendance),
    };
  }

  const winStreak = parseSuffix(badgeKey, "win_streak_");
  if (winStreak !== null) {
    return {
      motif: "win-streak",
      motifLabel:
        winStreak >= 10
          ? "Seriensieger · Feuer + Legendär-Aura"
          : winStreak >= 7
            ? "Nicht zu stoppen · Flamme + Krone"
            : winStreak >= 5
              ? "Auf einer Mission · Flamme + Blitz"
              : winStreak >= 3
                ? "Lauf · Blitz / Momentum"
                : "Erster Dreier · Sieg-Stern",
      stage: getWinStreakStage(winStreak),
    };
  }

  const lossStreak = parseSuffix(badgeKey, "loss_streak_");
  if (lossStreak !== null) {
    return {
      motif: "loss-streak",
      motifLabel:
        lossStreak >= 7
          ? "Schwarze Serie · Sturm + Esel-Fun + dunkle Aura"
          : lossStreak >= 5
            ? "Unglücksrabe · Sturm + Feder"
            : "Pechvogel · Regenwolke",
      stage: getLossStreakStage(lossStreak),
    };
  }

  if (badgeKey === "curse_broken") {
    return {
      motif: "curse-broken",
      motifLabel: "Fluch gebrochen · gesprengte Kette + Explosions-Aura",
      stage: 4,
    };
  }

  if (badgeKey === "resilient") {
    return {
      motif: "resilient",
      motifLabel: "Leidensfähig · Schild + Sturm",
      stage: 2,
    };
  }

  if (badgeKey === "lucky_charm") {
    return {
      motif: "lucky",
      motifLabel: "Glücksbringer · Smaragd-Klee + Gold-Sparkles",
      stage: 5,
    };
  }

  return {
    motif: "comeback",
    motifLabel: "Comeback · Rückkehrbogen + Energie",
    stage: 3,
  };
}

function getHistory(
  badgeKey: string,
): Pick<
  BadgeVisualMeta,
  "historyMode" | "historyLabel" | "implementationNote"
> {
  if (badgeKey.startsWith("career_")) {
    return {
      historyMode: "A",
      historyLabel: "Historische Daten dürfen rückwirkend freischalten.",
    };
  }

  if (badgeKey === "season_kickoff") {
    return {
      historyMode: "B",
      historyLabel: "Startet mit der nächsten Badge-Saison.",
      implementationNote:
        "Soll-Regel B; die Engine nutzt aktuell noch badges_started_at als Aktivierungsgrenze.",
    };
  }

  return {
    historyMode: "C",
    historyLabel: "Zählt erst ab Badge-Aktivierung.",
  };
}

function getVisualLabel(
  tierLabel: string,
  motifLabel: string,
  asset: string | null,
) {
  return asset
    ? `${tierLabel} · Spezialasset · ${motifLabel}`
    : `${tierLabel} · 3D-strikr-Badge · ${motifLabel}`;
}

export function getBadgeVisualMeta(badgeKey: string): BadgeVisualMeta {
  const tier = getAchievementVisualTier(badgeKey);
  const tierLabel = getBadgeTierLabel(badgeKey, tier);
  const asset = CUSTOM_ASSET_BY_BADGE_KEY[badgeKey] ?? null;
  const family = getFamily(badgeKey);
  const motif = getMotif(badgeKey);
  const history = getHistory(badgeKey);

  return {
    tier,
    tierLabel,
    ...family,
    ...motif,
    asset,
    visualLabel: getVisualLabel(tierLabel, motif.motifLabel, asset),
    ...history,
    secret: SECRET_BADGES.has(badgeKey),
  };
}

export function getAchievementCustomAsset(badgeKey: string) {
  return CUSTOM_ASSET_BY_BADGE_KEY[badgeKey] ?? null;
}
