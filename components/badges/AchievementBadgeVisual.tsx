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

type TorusMaterial = {
  surface: string;
  glow: string;
  highlight: string;
  shadow: string;
};

const APPEARANCE_TORUS_MATERIAL: Record<number, TorusMaterial> = {
  1: {
    surface:
      "linear-gradient(145deg, #d4d4cf 0%, #777770 24%, #2f2f2c 51%, #111113 70%, #96968f 100%)",
    glow: "rgba(148,163,184,.34)",
    highlight: "rgba(255,255,255,.52)",
    shadow: "rgba(9,9,11,.76)",
  },
  2: {
    surface:
      "linear-gradient(145deg, #ffd0a8 0%, #c66b2e 22%, #6d3518 48%, #2d160b 70%, #df8b4c 100%)",
    glow: "rgba(205,127,50,.46)",
    highlight: "rgba(255,226,199,.68)",
    shadow: "rgba(59,29,13,.76)",
  },
  3: {
    surface:
      "linear-gradient(145deg, #ffffff 0%, #dbe4ee 22%, #8796aa 47%, #445166 69%, #f8fafc 100%)",
    glow: "rgba(203,213,225,.52)",
    highlight: "rgba(255,255,255,.82)",
    shadow: "rgba(51,65,85,.72)",
  },
  4: {
    surface:
      "linear-gradient(145deg, #fff7c7 0%, #ffd95e 22%, #d49a12 47%, #794604 70%, #f7c63a 100%)",
    glow: "rgba(250,204,21,.56)",
    highlight: "rgba(255,249,196,.86)",
    shadow: "rgba(113,63,18,.72)",
  },
  5: {
    surface:
      "linear-gradient(135deg, #f8fafc 0%, #67e8f9 16%, #60a5fa 31%, #c084fc 48%, #f472b6 65%, #facc15 82%, #ffffff 100%)",
    glow: "rgba(168,85,247,.66)",
    highlight: "rgba(255,255,255,.9)",
    shadow: "rgba(76,29,149,.68)",
  },
  6: {
    surface:
      "linear-gradient(132deg, #ffffff 0%, #22d3ee 12%, #3b82f6 27%, #8b5cf6 42%, #ec4899 58%, #fb7185 70%, #facc15 84%, #67e8f9 100%)",
    glow: "rgba(34,211,238,.78)",
    highlight: "rgba(255,255,255,.96)",
    shadow: "rgba(88,28,135,.74)",
  },
};

function TorusRing({
  px,
  material,
  widthScale,
  heightScale,
  angle,
  thickness = 57,
  opacity = 1,
  glowScale = 1,
}: {
  px: number;
  material: TorusMaterial;
  widthScale: number;
  heightScale: number;
  angle: number;
  thickness?: number;
  opacity?: number;
  glowScale?: number;
}) {
  const mask = `radial-gradient(ellipse at center, transparent 0 ${thickness - 3}%, #000 ${thickness}% 100%)`;

  return (
    <span
      className="pointer-events-none absolute left-1/2 top-1/2 block"
      style={{
        width: px * widthScale,
        height: px * heightScale,
        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
        borderRadius: "50%",
        opacity,
        background: material.surface,
        WebkitMaskImage: mask,
        maskImage: mask,
        filter: `drop-shadow(0 ${Math.max(1, px * 0.045)}px ${Math.max(
          2,
          px * 0.08 * glowScale,
        )}px ${material.shadow}) drop-shadow(0 0 ${Math.max(
          2,
          px * 0.075 * glowScale,
        )}px ${material.glow})`,
      }}
      aria-hidden="true"
    >
      <span
        className="absolute inset-0 rounded-[50%]"
        style={{
          background: `linear-gradient(180deg, ${material.highlight} 0%, rgba(255,255,255,.18) 24%, transparent 43%, transparent 56%, rgba(0,0,0,.5) 78%, ${material.shadow} 100%)`,
          WebkitMaskImage: mask,
          maskImage: mask,
          mixBlendMode: "soft-light",
        }}
      />
      <span
        className="absolute inset-[3%] rounded-[50%]"
        style={{
          border: `1px solid ${material.highlight}`,
          opacity: 0.34,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      />
    </span>
  );
}

function AppearanceTorus({ stage, px }: { stage: number; px: number }) {
  if (px < SIZE.lg) return null;

  const material = APPEARANCE_TORUS_MATERIAL[Math.min(6, Math.max(1, stage))];
  const premium = stage >= 5;
  const goat = stage >= 6;

  return (
    <span className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      {premium ? (
        <span
          className="absolute left-1/2 top-1/2 rounded-full blur-xl"
          style={{
            width: px * (goat ? 1.48 : 1.28),
            height: px * (goat ? 0.72 : 0.62),
            transform: "translate(-50%, -50%)",
            background: material.glow,
            opacity: goat ? 0.24 : 0.17,
          }}
        />
      ) : null}

      <TorusRing
        px={px}
        material={material}
        widthScale={goat ? 1.86 : premium ? 1.7 : 1.54}
        heightScale={goat ? 0.98 : premium ? 0.94 : 0.9}
        angle={-10}
        thickness={goat ? 52 : premium ? 54 : 58}
        glowScale={goat ? 1.2 : premium ? 1.08 : 0.85}
      />

      {premium ? (
        <TorusRing
          px={px}
          material={material}
          widthScale={goat ? 1.72 : 1.58}
          heightScale={goat ? 1.18 : 1.1}
          angle={14}
          thickness={goat ? 55 : 58}
          opacity={goat ? 0.9 : 0.78}
          glowScale={goat ? 1.1 : 0.92}
        />
      ) : null}

      {goat ? (
        <TorusRing
          px={px}
          material={material}
          widthScale={1.62}
          heightScale={1.38}
          angle={-22}
          thickness={60}
          opacity={0.72}
          glowScale={0.9}
        />
      ) : null}
    </span>
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
      ? 1.28
      : badgeKey === "career_appearances_250" && px >= SIZE.lg
        ? 1.16
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
        <AppearanceTorus stage={visual.stage} px={px} />
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
