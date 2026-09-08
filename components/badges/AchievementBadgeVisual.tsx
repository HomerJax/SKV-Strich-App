import PlayerBadge from "@/components/badges/PlayerBadge";
import type { BadgeKey } from "@/lib/badges/helpers";

type AchievementBadgeVisualProps = {
  badgeKey: string;
  size?: "sm" | "md" | "lg" | "xl";
  grayscale?: boolean;
  className?: string;
};

function parseSuffix(key: string, prefix: string) {
  if (!key.startsWith(prefix)) return null;
  const value = Number(key.slice(prefix.length));
  return Number.isFinite(value) ? value : null;
}

export function getAchievementVisualTier(badgeKey: string): BadgeKey {
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

export default function AchievementBadgeVisual({
  badgeKey,
  size = "xl",
  grayscale = false,
  className = "",
}: AchievementBadgeVisualProps) {
  return (
    <PlayerBadge
      badgeKey={getAchievementVisualTier(badgeKey)}
      mode="hero"
      size={size}
      grayscale={grayscale}
      hideIfNone={false}
      className={className}
      title={badgeKey}
    />
  );
}
