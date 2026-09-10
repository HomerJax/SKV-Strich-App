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
      "linear-gradient(145deg,#f4f4ef 0%,#8b8b84 18%,#363633 43%,#111113 66%,#74746f 82%,#deded8 100%)",
    glow: "rgba(148,163,184,.34)",
    highlight: "rgba(255,255,255,.62)",
    shadow: "rgba(3,7,18,.88)",
  },
  2: {
    surface:
      "linear-gradient(145deg,#ffd4ae 0%,#e9853d 18%,#8b421d 43%,#32170a 66%,#b85b26 82%,#ffc28a 100%)",
    glow: "rgba(249,115,22,.46)",
    highlight: "rgba(255,229,204,.76)",
    shadow: "rgba(67,30,10,.84)",
  },
  3: {
    surface:
      "linear-gradient(145deg,#ffffff 0%,#e7eef7 18%,#94a3b8 43%,#475569 66%,#cbd5e1 82%,#ffffff 100%)",
    glow: "rgba(191,219,254,.52)",
    highlight: "rgba(255,255,255,.9)",
    shadow: "rgba(30,41,59,.8)",
  },
  4: {
    surface:
      "linear-gradient(145deg,#fff7c7 0%,#ffd85a 18%,#d69b13 43%,#7a4705 66%,#e7ad1a 82%,#fff0a6 100%)",
    glow: "rgba(250,204,21,.58)",
    highlight: "rgba(255,249,196,.92)",
    shadow: "rgba(92,51,8,.82)",
  },
  5: {
    surface:
      "linear-gradient(135deg,#ffffff 0%,#67e8f9 13%,#60a5fa 27%,#8b5cf6 42%,#ec4899 58%,#fb7185 70%,#facc15 84%,#ffffff 100%)",
    glow: "rgba(168,85,247,.7)",
    highlight: "rgba(255,255,255,.96)",
    shadow: "rgba(76,29,149,.76)",
  },
  6: {
    surface:
      "linear-gradient(132deg,#ffffff 0%,#22d3ee 10%,#2563eb 24%,#7c3aed 39%,#ec4899 55%,#fb7185 68%,#facc15 81%,#2dd4bf 92%,#ffffff 100%)",
    glow: "rgba(34,211,238,.8)",
    highlight: "rgba(255,255,255,1)",
    shadow: "rgba(88,28,135,.8)",
  },
};

function TorusRing({
  px,
  material,
  widthScale,
  heightScale,
  angle,
  opacity = 1,
  front = false,
  glowScale = 1,
}: {
  px: number;
  material: TorusMaterial;
  widthScale: number;
  heightScale: number;
  angle: number;
  opacity?: number;
  front?: boolean;
  glowScale?: number;
}) {
  const mask =
    "radial-gradient(ellipse at center, transparent 0 67%, #000 71% 100%)";

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
        clipPath: front ? "inset(49% -20% -24% -20%)" : undefined,
        filter: `drop-shadow(0 ${Math.max(1, px * 0.04)}px ${Math.max(
          2,
          px * 0.06 * glowScale,
        )}px ${material.shadow}) drop-shadow(0 0 ${Math.max(
          2,
          px * 0.055 * glowScale,
        )}px ${material.glow})`,
      }}
      aria-hidden="true"
    >
      <span
        className="absolute inset-0 rounded-[50%]"
        style={{
          background: `linear-gradient(180deg,${material.highlight} 0%,rgba(255,255,255,.22) 23%,transparent 43%,transparent 57%,rgba(0,0,0,.42) 78%,${material.shadow} 100%)`,
          WebkitMaskImage: mask,
          maskImage: mask,
          mixBlendMode: "soft-light",
        }}
      />
      <span
        className="absolute inset-[2%] rounded-[50%]"
        style={{
          border: `1px solid ${material.highlight}`,
          opacity: 0.36,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      />
    </span>
  );
}

function AppearanceOrbit({ stage, px }: { stage: number; px: number }) {
  if (px < SIZE.lg) return null;

  const material = APPEARANCE_TORUS_MATERIAL[Math.min(6, Math.max(1, stage))];
  const premium = stage >= 5;
  const goat = stage >= 6;

  const rings = goat
    ? [
        { width: 1.58, height: 0.82, angle: -9, opacity: 1 },
        { width: 1.46, height: 1.02, angle: 15, opacity: 0.88 },
        { width: 1.38, height: 1.16, angle: -22, opacity: 0.7 },
      ]
    : premium
      ? [
          { width: 1.52, height: 0.8, angle: -9, opacity: 1 },
          { width: 1.42, height: 0.98, angle: 14, opacity: 0.78 },
        ]
      : [{ width: 1.46, height: 0.76, angle: -9, opacity: 1 }];

  return (
    <>
      <span className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <span
          className="absolute left-1/2 top-1/2 rounded-full blur-lg"
          style={{
            width: px * (goat ? 1.22 : premium ? 1.12 : 0.98),
            height: px * (goat ? 0.64 : premium ? 0.58 : 0.5),
            transform: "translate(-50%, -50%)",
            background: material.glow,
            opacity: goat ? 0.25 : premium ? 0.2 : 0.12,
          }}
        />
        {rings.map((ring, index) => (
          <TorusRing
            key={`back-${index}`}
            px={px}
            material={material}
            widthScale={ring.width}
            heightScale={ring.height}
            angle={ring.angle}
            opacity={ring.opacity}
            glowScale={goat ? 1.12 : premium ? 1.04 : 0.82}
          />
        ))}
      </span>

      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        {rings.map((ring, index) => (
          <TorusRing
            key={`front-${index}`}
            px={px}
            material={material}
            widthScale={ring.width}
            heightScale={ring.height}
            angle={ring.angle}
            opacity={ring.opacity}
            front
            glowScale={goat ? 1.08 : premium ? 1 : 0.78}
          />
        ))}
      </span>
    </>
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
    !isCareerAppearance || px < SIZE.lg
      ? 1
      : badgeKey === "career_appearances_500"
        ? 1.25
        : badgeKey === "career_appearances_250"
          ? 1.19
          : badgeKey === "career_appearances_100"
            ? 1.13
            : 1.1;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-visible ${
        grayscale ? "grayscale opacity-45" : ""
      } ${className}`}
      style={{ width: px, height: px }}
      title={badgeKey}
      aria-label={badgeKey}
    >
      {isCareerAppearance ? <AppearanceOrbit stage={visual.stage} px={px} /> : null}

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
