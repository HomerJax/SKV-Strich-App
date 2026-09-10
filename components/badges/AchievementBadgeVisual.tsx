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

// Nur fertige, zusammenhängende Premium-Artworks. Keine aufgesetzten CSS-Rahmen.
const PREMIUM_ASSET_BY_BADGE_KEY: Record<string, string> = {
  career_appearances_250: "/badges/achievements/career-appearances-250.svg",
  career_wins_1: "/badges/achievements/career-wins-1.svg",
  career_wins_10: "/badges/achievements/career-wins-10.svg",
  career_wins_50: "/badges/achievements/career-wins-50.svg",
  career_wins_100: "/badges/achievements/career-wins-50.svg",
  career_wins_250: "/badges/achievements/career-wins-250.svg",
  attendance_streak_5: "/badges/achievements/attendance-dauerlaeufer.svg",
  attendance_streak_20: "/badges/achievements/attendance-immer-da.svg",
  win_streak_10: "/badges/achievements/win-streak.webp",
  loss_streak_7: "/badges/achievements/losses-dark-fun.svg",
  curse_broken: "/badges/achievements/special-curse-broken.svg",
  lucky_charm: "/badges/achievements/special-lucky-charm.svg",
  comeback: "/badges/achievements/comeback.webp",
};

const PREMIUM_SCALE_BY_BADGE_KEY: Record<string, number> = {
  // Das Gold-Legenden-Artwork hat viel transparente Außenfläche und wirkte
  // dadurch kleiner als das normale Gold-Badge. Im Katalog bewusst größer.
  career_appearances_250: 1.72,
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
  const premiumAsset = PREMIUM_ASSET_BY_BADGE_KEY[badgeKey] ?? null;
  const usePremiumArtwork = Boolean(premiumAsset) && px >= SIZE.lg;
  const premiumScale = PREMIUM_SCALE_BY_BADGE_KEY[badgeKey] ?? 1.34;
  const coreScale = badgeKey === "career_appearances_500" && px >= SIZE.lg ? 1.2 : 1;

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
          className="pointer-events-none block max-w-none select-none object-contain"
          style={{ width: px * premiumScale, height: px * premiumScale }}
        />
      ) : (
        <span
          className="relative inline-flex h-full w-full items-center justify-center"
          style={{ transform: `scale(${coreScale})` }}
        >
          <PlayerBadge
            badgeKey={visual.tier}
            mode="hero"
            size={size}
            grayscale={grayscale}
            hideIfNone={false}
            className="h-full w-full"
            title={badgeKey}
          />
        </span>
      )}
    </span>
  );
}
