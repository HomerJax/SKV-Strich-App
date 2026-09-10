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

// Nur fertige, zusammenhaengende Premium-Artworks. Keine aufgesetzten CSS-Icons.
const PREMIUM_ASSET_BY_BADGE_KEY: Record<string, string> = {
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

export { getAchievementVisualTier } from "@/lib/badges/visual-catalog";

function AppearanceLoop({ stage, px }: { stage: number; px: number }) {
  if (px < SIZE.lg) return null;

  const primary =
    stage >= 6
      ? "rgba(255,255,255,.92)"
      : stage >= 5
        ? "rgba(240,171,252,.82)"
        : stage >= 4
          ? "rgba(253,230,138,.76)"
          : stage >= 3
            ? "rgba(226,232,240,.72)"
            : stage >= 2
              ? "rgba(251,146,60,.66)"
              : "rgba(212,212,216,.5)";

  const secondary =
    stage >= 6
      ? "rgba(34,211,238,.9)"
      : stage >= 5
        ? "rgba(103,232,249,.72)"
        : primary;

  const tertiary = stage >= 6 ? "rgba(244,114,182,.7)" : primary;

  return (
    <svg
      className="pointer-events-none absolute z-0 overflow-visible"
      style={{ width: px * 1.52, height: px * 1.52 }}
      viewBox="0 0 140 140"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="70"
        cy="70"
        rx="54"
        ry="43"
        transform="rotate(-9 70 70)"
        stroke={primary}
        strokeWidth={stage >= 5 ? 2.2 : 1.65}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 ${stage >= 5 ? 4 : 2}px ${primary})` }}
      />

      {stage >= 5 ? (
        <ellipse
          cx="70"
          cy="70"
          rx={stage >= 6 ? 58 : 56}
          ry={stage >= 6 ? 38 : 40}
          transform="rotate(13 70 70)"
          stroke={secondary}
          strokeWidth={stage >= 6 ? 2 : 1.45}
          strokeLinecap="round"
          opacity={stage >= 6 ? 0.86 : 0.66}
          style={{ filter: `drop-shadow(0 0 ${stage >= 6 ? 5 : 3}px ${secondary})` }}
        />
      ) : null}

      {stage >= 6 ? (
        <ellipse
          cx="70"
          cy="70"
          rx="61"
          ry="48"
          transform="rotate(-18 70 70)"
          stroke={tertiary}
          strokeWidth="1.35"
          strokeLinecap="round"
          opacity="0.58"
          style={{ filter: `drop-shadow(0 0 4px ${tertiary})` }}
        />
      ) : null}
    </svg>
  );
}

export default function AchievementBadgeVisual({
  badgeKey,
  size = "xl",
  grayscale = false,
  className = "",
}: AchievementBadgeVisualProps) {
  const px = SIZE[size];
  const visual = getBadgeVisualMeta(badgeKey);
  const isCareerAppearance = badgeKey.startsWith("career_appearances_");
  const premiumAsset = isCareerAppearance
    ? null
    : PREMIUM_ASSET_BY_BADGE_KEY[badgeKey] ?? null;
  const usePremiumArtwork = Boolean(premiumAsset) && px >= SIZE.lg;
  const coreScale =
    badgeKey === "career_appearances_500" && px >= SIZE.lg
      ? 1.16
      : badgeKey === "career_appearances_250" && px >= SIZE.lg
        ? 1.08
        : 1;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-visible ${
        grayscale ? "grayscale opacity-45" : ""
      } ${className}`}
      style={{ width: px, height: px }}
      title={badgeKey}
      aria-label={badgeKey}
    >
      {isCareerAppearance ? (
        <AppearanceLoop stage={visual.stage} px={px} />
      ) : null}

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
        <span
          className="relative z-10 inline-flex h-full w-full items-center justify-center"
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
