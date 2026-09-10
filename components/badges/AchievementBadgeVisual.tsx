import CareerAppearanceArtwork from "@/components/badges/CareerAppearanceArtwork";
import CareerWinArtwork from "@/components/badges/CareerWinArtwork";
import PlayerBadge from "@/components/badges/PlayerBadge";
import { getBadgeVisualMeta } from "@/lib/badges/visual-catalog";

type AchievementBadgeVisualProps = {
  badgeKey: string;
  size?: "sm" | "md" | "lg" | "xl";
  grayscale?: boolean;
  className?: string;
};

const SIZE = {
  sm: 20,
  md: 24,
  lg: 36,
  xl: 72,
} as const;

const PREMIUM_ASSET_BY_BADGE_KEY: Record<string, string> = {
  attendance_streak_5: "/badges/achievements/attendance-dauerlaeufer.svg",
  attendance_streak_20: "/badges/achievements/attendance-immer-da.svg",
  win_streak_10: "/badges/achievements/win-streak.webp",
  loss_streak_7: "/badges/achievements/losses-dark-fun.svg",
  curse_broken: "/badges/achievements/special-curse-broken.svg",
  lucky_charm: "/badges/achievements/special-lucky-charm.svg",
  comeback: "/badges/achievements/comeback.webp",
};

export { getAchievementVisualTier } from "@/lib/badges/visual-catalog";

export default function AchievementBadgeVisual({
  badgeKey,
  size = "xl",
  grayscale = false,
  className = "",
}: AchievementBadgeVisualProps) {
  const px = SIZE[size];
  const visual = getBadgeVisualMeta(badgeKey);
  const isCareerAppearance = badgeKey.startsWith("career_appearances_");
  const isCareerWin = badgeKey.startsWith("career_wins_");

  if (isCareerAppearance && px >= SIZE.lg) {
    return (
      <CareerAppearanceArtwork
        badgeKey={badgeKey}
        px={px}
        grayscale={grayscale}
        className={className}
      />
    );
  }

  if (isCareerWin && px >= SIZE.lg) {
    return (
      <CareerWinArtwork
        badgeKey={badgeKey}
        px={px}
        grayscale={grayscale}
        className={className}
      />
    );
  }

  const premiumAsset = PREMIUM_ASSET_BY_BADGE_KEY[badgeKey] ?? null;
  const usePremiumArtwork = Boolean(premiumAsset) && px >= SIZE.lg;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-visible ${
        grayscale ? "grayscale opacity-45" : ""
      } ${className}`}
      style={{ width: px, height: px }}
      title={badgeKey}
      aria-label={badgeKey}
    >
      {usePremiumArtwork && premiumAsset ? (
        <img
          src={premiumAsset}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none relative z-10 block max-w-none select-none object-contain"
          style={{ width: px * 1.34, height: px * 1.34 }}
        />
      ) : (
        <PlayerBadge
          badgeKey={visual.tier}
          mode="hero"
          size={size}
          grayscale={grayscale}
          hideIfNone={false}
          className="h-full w-full"
          title={badgeKey}
        />
      )}
    </span>
  );
}
