import StrikrBadgeMark from "@/components/brand/StrikrBadgeMark";

type BadgeTierKey = "blech" | "bronze" | "silver" | "gold" | "goat";
type BadgeSize = "sm" | "md" | "lg";

type BadgeTier = {
  key: BadgeTierKey;
  label: string;
  minMvp: number;
  description: string;
  shellClass?: string;
  markClass?: string;
  compactShellClass?: string;
  compactMarkClass?: string;
  goatOnly?: boolean;
  goatClass?: string;
  compactGoatClass?: string;
  ring?: boolean;
  double?: boolean;
  floating?: boolean;
  backdropClass?: string;
};

type PlayerBadgeProps = {
  mvpCount: number | null | undefined;
  size?: BadgeSize;
  showLabel?: boolean;
  showDescription?: boolean;
  hideIfNone?: boolean;
  iconOnly?: boolean;
  grayscale?: boolean;
  className?: string;
};

const BADGE_TIERS: BadgeTier[] = [
  {
    key: "goat",
    label: "GOAT",
    minMvp: 10,
    description: "Ultraseltenes Endgame-Badge für echte MVP-Legenden.",
    goatOnly: true,
    shellClass:
      "border-fuchsia-200 bg-[linear-gradient(135deg,rgba(2,6,23,1),rgba(251,191,36,0.36),rgba(244,114,182,0.40),rgba(129,140,248,0.38),rgba(34,211,238,0.38),rgba(2,6,23,1))] shadow-[0_0_48px_rgba(236,72,153,0.24)]",
    compactShellClass:
      "border-fuchsia-300 bg-[linear-gradient(135deg,rgba(2,6,23,1),rgba(244,114,182,0.34),rgba(129,140,248,0.34),rgba(34,211,238,0.34),rgba(2,6,23,1))] shadow-[0_0_10px_rgba(236,72,153,0.24)]",
    goatClass:
      "drop-shadow-[0_0_22px_rgba(255,255,255,1)] saturate-[2.45] brightness-[1.3] contrast-[1.18]",
    compactGoatClass:
      "drop-shadow-[0_0_8px_rgba(255,255,255,1)] saturate-[2.2] brightness-[1.2] contrast-[1.12]",
    ring: true,
  },
  {
    key: "gold",
    label: "Gold",
    minMvp: 7,
    description: "Solar-Flare-Tier: explosiv, heiß und maximal prestigeträchtig.",
    shellClass:
      "border-amber-300 bg-[linear-gradient(180deg,rgba(120,53,15,1),rgba(245,158,11,0.98),rgba(254,240,138,0.78))] shadow-[0_0_32px_rgba(245,158,11,0.24)]",
    compactShellClass:
      "border-amber-300 bg-[linear-gradient(180deg,rgba(120,53,15,1),rgba(245,158,11,0.98),rgba(254,240,138,0.92))] shadow-[0_0_10px_rgba(245,158,11,0.22)]",
    markClass:
      "text-yellow-50 drop-shadow-[0_0_14px_rgba(250,204,21,0.98)]",
    compactMarkClass:
      "text-yellow-50 drop-shadow-[0_0_6px_rgba(250,204,21,1)]",
    ring: true,
  },
  {
    key: "silver",
    label: "Silber",
    minMvp: 5,
    description: "Chrome-Neon-Tier: kaltes High-End-Metall mit Tech-Aura.",
    shellClass:
      "border-slate-300 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(148,163,184,0.82))] shadow-[0_0_26px_rgba(34,211,238,0.14)]",
    compactShellClass:
      "border-cyan-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(186,230,253,0.82),rgba(148,163,184,0.92))] shadow-[0_0_10px_rgba(34,211,238,0.16)]",
    markClass:
      "text-cyan-900 drop-shadow-[0_0_10px_rgba(34,211,238,0.48)]",
    compactMarkClass:
      "text-cyan-900 drop-shadow-[0_0_6px_rgba(34,211,238,0.56)]",
  },
  {
    key: "bronze",
    label: "Bronze",
    minMvp: 3,
    description: "Furnace-Core-Tier: glühend, aggressiv und earned.",
    shellClass:
      "border-orange-500 bg-[linear-gradient(180deg,rgba(67,20,7,1),rgba(154,52,18,0.98),rgba(249,115,22,0.80))] shadow-[0_0_24px_rgba(249,115,22,0.24)]",
    compactShellClass:
      "border-orange-500 bg-[linear-gradient(180deg,rgba(67,20,7,1),rgba(194,65,12,1),rgba(251,146,60,0.86))] shadow-[0_0_10px_rgba(249,115,22,0.24)]",
    markClass:
      "text-orange-100 drop-shadow-[0_0_12px_rgba(251,146,60,0.90)]",
    compactMarkClass:
      "text-orange-50 drop-shadow-[0_0_6px_rgba(251,146,60,0.92)]",
    ring: true,
  },
  {
    key: "blech",
    label: "Blech",
    minMvp: 1,
    description: "Oily-Rust-Tier: dreckig, rough und klar low-tier earned.",
    shellClass:
      "rotate-[4deg] border-stone-800 bg-[linear-gradient(180deg,rgba(168,162,158,0.92),rgba(87,83,78,0.96))] shadow-[0_12px_18px_rgba(28,25,23,0.24)]",
    compactShellClass:
      "border-stone-700 bg-[linear-gradient(180deg,rgba(140,133,128,1),rgba(82,76,71,1))] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_8px_rgba(41,37,36,0.24)]",
    markClass:
      "text-stone-100 drop-shadow-[0_0_4px_rgba(255,255,255,0.18)]",
    compactMarkClass:
      "text-stone-100 drop-shadow-[0_0_2px_rgba(255,255,255,0.22)]",
  },
];

const TIER_ORDER: BadgeTierKey[] = ["blech", "bronze", "silver", "gold", "goat"];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getBadgeTier(mvpCount: number | null | undefined): BadgeTier | null {
  if (!mvpCount || mvpCount < 1) return null;

  const found = [...BADGE_TIERS]
    .sort((a, b) => b.minMvp - a.minMvp)
    .find((tier) => mvpCount >= tier.minMvp);

  return found ?? null;
}

function getSizeClasses(size: BadgeSize) {
  switch (size) {
    case "sm":
      return {
        outer: "h-5 w-5 rounded-[7px]",
        shell: "h-5 w-5 rounded-[7px] border",
        ringInset: "inset-[2px] rounded-[5px]",
        mark: "h-3 w-3",
        goat: "text-[12px]",
        blurMark: "h-3.5 w-3.5",
      };
    case "lg":
      return {
        outer: "h-20 w-20 rounded-[22px]",
        shell: "h-20 w-20 rounded-[22px] border",
        ringInset: "inset-[5px] rounded-[16px]",
        mark: "h-10 w-10",
        goat: "text-[38px]",
        blurMark: "h-11 w-11",
      };
    case "md":
    default:
      return {
        outer: "h-10 w-10 rounded-[14px]",
        shell: "h-10 w-10 rounded-[14px] border",
        ringInset: "inset-[3px] rounded-[10px]",
        mark: "h-5 w-5",
        goat: "text-[20px]",
        blurMark: "h-6 w-6",
      };
  }
}

export function getPlayerBadgeTier(mvpCount: number | null | undefined) {
  return getBadgeTier(mvpCount);
}

export function getBadgeTiers() {
  return [...BADGE_TIERS].sort(
    (a, b) => TIER_ORDER.indexOf(a.key) - TIER_ORDER.indexOf(b.key)
  );
}

export default function PlayerBadge({
  mvpCount,
  size = "sm",
  showLabel = false,
  showDescription = false,
  hideIfNone = false,
  iconOnly = false,
  grayscale = false,
  className,
}: PlayerBadgeProps) {
  const tier = getBadgeTier(mvpCount);

  if (!tier && hideIfNone) {
    return null;
  }

  if (!tier) {
    return null;
  }

  const sizeClasses = getSizeClasses(size);
  const useCompact = size === "sm";

  const shellClass = useCompact
    ? (tier.compactShellClass ?? tier.shellClass)
    : tier.shellClass;

  const markClass = useCompact
    ? (tier.compactMarkClass ?? tier.markClass)
    : tier.markClass;

  const goatClass = useCompact
    ? (tier.compactGoatClass ?? tier.goatClass)
    : tier.goatClass;

  const grayscaleClass = grayscale
    ? "grayscale opacity-45 saturate-0"
    : "";

  const badgeVisual = tier.floating ? (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        sizeClasses.outer,
        tier.backdropClass,
        grayscaleClass
      )}
    >
      {tier.ring ? (
        <span
          className={cn(
            "absolute border border-white/20 shadow-[0_0_22px_rgba(255,255,255,0.10)]",
            size === "sm"
              ? "h-4 w-4 rounded-full"
              : size === "md"
                ? "h-7 w-7 rounded-full"
                : "h-14 w-14 rounded-full"
          )}
        />
      ) : null}

      {tier.double && !tier.goatOnly ? (
        <StrikrBadgeMark
          className={cn(
            "absolute opacity-30 blur-[3px]",
            sizeClasses.blurMark,
            markClass
          )}
        />
      ) : null}

      {tier.goatOnly ? (
        <span className={cn("leading-none", sizeClasses.goat, goatClass)}>
          🐐
        </span>
      ) : (
        <StrikrBadgeMark className={cn(sizeClasses.mark, markClass)} />
      )}
    </div>
  ) : (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        sizeClasses.shell,
        shellClass,
        grayscaleClass
      )}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-white/35 to-transparent" />

      {tier.ring ? (
        <span
          className={cn(
            "absolute border border-white/12",
            sizeClasses.ringInset
          )}
        />
      ) : null}

      {tier.double && !tier.goatOnly ? (
        <StrikrBadgeMark
          className={cn(
            "absolute opacity-30 blur-[3px]",
            sizeClasses.blurMark,
            markClass
          )}
        />
      ) : null}

      {tier.goatOnly ? (
        <span
          className={cn(
            "relative z-10 leading-none",
            sizeClasses.goat,
            goatClass
          )}
        >
          🐐
        </span>
      ) : (
        <StrikrBadgeMark
          className={cn("relative z-10", sizeClasses.mark, markClass)}
        />
      )}
    </div>
  );

  if (iconOnly || (!showLabel && !showDescription)) {
    return <div className={cn("inline-flex shrink-0", className)}>{badgeVisual}</div>;
  }

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      {badgeVisual}

      <div className="min-w-0">
        {showLabel ? (
          <div className="text-sm font-semibold text-slate-950">
            {tier.label}
          </div>
        ) : null}

        {showDescription ? (
          <div className="text-xs leading-5 text-slate-500">
            {tier.description}
          </div>
        ) : null}
      </div>
    </div>
  );
}