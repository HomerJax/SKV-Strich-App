import CareerAppearanceArtwork from "@/components/badges/CareerAppearanceArtwork";
import CareerWinArtwork from "@/components/badges/CareerWinArtwork";
import PlayerBadge from "@/components/badges/PlayerBadge";
import { getBadgeVisualMeta } from "@/lib/badges/visual-catalog";

type AchievementBadgeVisualProps = {
  badgeKey: string;
  size?: "sm" | "md" | "lg" | "xl";
  grayscale?: boolean;
  className?: string;
  interactive?: boolean;
  seasonYear?: string | null;
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
  interactive = true,
  seasonYear = null,
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
        interactive={interactive}
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
        interactive={interactive}
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
      {seasonYear && !badgeKey.startsWith("career_") && px >= SIZE.lg ? (
        <span className="pointer-events-none absolute -bottom-[12px] left-1/2 z-20 flex h-[20px] w-[76%] -translate-x-1/2 items-center justify-center" aria-label={`Saison ${seasonYear}`}>
          <span className="absolute -top-[3px] h-[5px] w-[83%] rounded-[50%] border border-slate-400/40 bg-gradient-to-b from-slate-400/65 to-slate-900 shadow-[0_2px_4px_rgba(0,0,0,.5)]" />
          <span className="absolute inset-x-0 top-[2px] bottom-0 rounded-b-[7px] rounded-t-[3px] border border-slate-500/70 bg-gradient-to-b from-[#777d87] via-[#323946] to-[#151b27] shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_4px_6px_rgba(0,0,0,.5)]" />
          <span className="relative z-10 text-[10px] font-black tracking-[0.06em] text-slate-100 [text-shadow:0_1px_1px_rgba(0,0,0,.9)]">{seasonYear}</span>
        </span>
      ) : null}
    </span>
  );
}
