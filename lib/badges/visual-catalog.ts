import type { BadgeKey as PlayerBadgeTier } from "@/lib/badges/helpers";

export type BadgeHistoryMode = "A" | "B" | "C";

export type BadgeVisualMeta = {
  tier: PlayerBadgeTier;
  tierLabel: string;
  family: "career" | "attendance" | "wins" | "losses" | "special";
  familyLabel: string;
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

const CUSTOM_ASSET_BY_BADGE_KEY: Record<string, string> = {
  attendance_streak_3: "/badges/achievements/discipline.webp",
  attendance_streak_5: "/badges/achievements/discipline.webp",
  attendance_streak_10: "/badges/achievements/discipline.webp",
  attendance_streak_15: "/badges/achievements/discipline.webp",
  attendance_streak_20: "/badges/achievements/discipline.webp",
  win_streak_3: "/badges/achievements/win-streak.webp",
  win_streak_5: "/badges/achievements/win-streak.webp",
  win_streak_7: "/badges/achievements/win-streak.webp",
  win_streak_10: "/badges/achievements/win-streak.webp",
  loss_streak_3: "/badges/achievements/unlucky.webp",
  loss_streak_5: "/badges/achievements/unlucky.webp",
  loss_streak_7: "/badges/achievements/unlucky.webp",
  curse_broken: "/badges/achievements/comeback.webp",
  resilient: "/badges/achievements/unlucky.webp",
  lucky_charm: "/badges/achievements/lucky.webp",
  comeback: "/badges/achievements/comeback.webp",
};

function parseSuffix(key: string, prefix: string) {
  if (!key.startsWith(prefix)) return null;
  const value = Number(key.slice(prefix.length));
  return Number.isFinite(value) ? value : null;
}

export function getAchievementVisualTier(badgeKey: string): PlayerBadgeTier {
  const appearances = parseSuffix(badgeKey, "career_appearances_");
  if (appearances !== null) {
    if (appearances >= 250) return "goat";
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

function getFamily(badgeKey: string): Pick<BadgeVisualMeta, "family" | "familyLabel"> {
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

function getHistory(badgeKey: string): Pick<BadgeVisualMeta, "historyMode" | "historyLabel" | "implementationNote"> {
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
      implementationNote: "Soll-Regel B; die Engine nutzt aktuell noch badges_started_at als Aktivierungsgrenze.",
    };
  }

  return {
    historyMode: "C",
    historyLabel: "Zählt erst ab Badge-Aktivierung.",
  };
}

function getVisualLabel(badgeKey: string, asset: string | null) {
  if (!asset) return "3D-Tier-Badge";
  if (asset.includes("discipline")) return "3D-Badge + Läufer / Motion";
  if (asset.includes("win-streak")) return "3D-Badge + Feuer / Siegesserie";
  if (asset.includes("unlucky")) return "3D-Badge + Sturm / Pech";
  if (asset.includes("lucky")) return "3D-Badge + Glücksklee / Sparkles";
  if (asset.includes("comeback")) return "3D-Badge + Kettenbruch / Comeback";
  return "3D-Spezialbadge";
}

export function getBadgeVisualMeta(badgeKey: string): BadgeVisualMeta {
  const tier = getAchievementVisualTier(badgeKey);
  const asset = CUSTOM_ASSET_BY_BADGE_KEY[badgeKey] ?? null;
  const family = getFamily(badgeKey);
  const history = getHistory(badgeKey);

  return {
    tier,
    tierLabel: getAchievementTierLabel(tier),
    ...family,
    asset,
    visualLabel: getVisualLabel(badgeKey, asset),
    ...history,
    secret: SECRET_BADGES.has(badgeKey),
  };
}

export function getAchievementCustomAsset(badgeKey: string) {
  return CUSTOM_ASSET_BY_BADGE_KEY[badgeKey] ?? null;
}
