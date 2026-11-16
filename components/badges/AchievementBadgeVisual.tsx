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
  const isSeasonAttendance = badgeKey === "season_kickoff" || badgeKey.startsWith("attendance_streak_");

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
      {isSeasonAttendance && px >= SIZE.lg ? (
        <span className="pointer-events-none absolute bottom-[19%] right-[13%] z-10 flex h-[23%] w-[23%] items-center justify-center rounded-[22%] border border-white/30 bg-slate-950/75 shadow-[inset_0_1px_2px_rgba(255,255,255,.25),0_2px_4px_rgba(0,0,0,.5)]" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" className="h-[78%] w-[78%] text-white/85" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18m-13 5 3 3 5-5"/></svg>
        </span>
      ) : null}
      {seasonYear && !badgeKey.startsWith("career_") && px >= SIZE.lg ? <span className="pointer-events-none absolute -bottom-1 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded border border-white/40 bg-slate-950 px-1.5 py-0.5 text-[9px] font-black leading-none text-white shadow-md">{seasonYear}</span> : null}
    </span>
  );
}
