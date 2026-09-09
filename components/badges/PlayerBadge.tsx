"use client";

import Image from "next/image";
import StrikrBadgeMark from "@/components/brand/StrikrBadgeMark";
import {
  getBadgeMetaFromMvpCount,
  type BadgeKey,
  type BadgeMeta,
} from "@/lib/badges/helpers";

type BadgeMode = "compact" | "hero";
type BadgeSize = "xs" | "sm" | "md" | "lg" | "xl";

type PlayerBadgeProps = {
  badgeKey?: BadgeKey;
  mvpCount?: number | null;
  mode?: BadgeMode;
  size?: BadgeSize;
  className?: string;
  title?: string;
  hideIfNone?: boolean;
  iconOnly?: boolean;
  grayscale?: boolean;
};

const SIZE: Record<BadgeSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 36,
  xl: 72,
};

const TIER_STYLE: Record<
  Exclude<BadgeKey, "none">,
  {
    mark: string;
    glow: string;
    surface: string;
    border: string;
  }
> = {
  copper: {
    mark: "text-zinc-100",
    glow: "rgba(120,120,120,0.26)",
    surface:
      "linear-gradient(135deg, #b5b5b1 0%, #666660 35%, #333330 62%, #8a8a84 100%)",
    border: "rgba(230,230,220,0.28)",
  },
  bronze: {
    mark: "text-orange-200",
    glow: "rgba(205,127,50,0.38)",
    surface: "linear-gradient(135deg, #9a4f1d, #3b1d0d 55%, #d8893f)",
    border: "rgba(251,146,60,0.32)",
  },
  silver: {
    mark: "text-slate-50",
    glow: "rgba(210,220,235,0.38)",
    surface: "linear-gradient(135deg, #f8fafc, #64748b 50%, #e2e8f0)",
    border: "rgba(255,255,255,0.42)",
  },
  gold: {
    mark: "text-yellow-100",
    glow: "rgba(250,204,21,0.48)",
    surface: "linear-gradient(135deg, #fde68a, #a16207 55%, #facc15)",
    border: "rgba(250,204,21,0.42)",
  },
  goat: {
    mark: "text-fuchsia-100",
    glow: "rgba(168,85,247,0.58)",
    surface:
      "linear-gradient(135deg, #111827, #581c87 45%, #0891b2 72%, #f0abfc)",
    border: "rgba(217,70,239,0.48)",
  },
};

const HERO_ASSET_BY_KEY: Record<Exclude<BadgeKey, "none">, string> = {
  copper: "blech.webp",
  bronze: "bronze.webp",
  silver: "silber.webp",
  gold: "gold.webp",
  goat: "goat.webp",
};

const FALLBACK_COUNT_BY_KEY: Record<BadgeKey, number> = {
  none: 0,
  copper: 1,
  bronze: 3,
  silver: 5,
  gold: 7,
  goat: 10,
};

export function getPlayerBadgeTier(
  mvpCount: number | null | undefined
): BadgeMeta {
  return getBadgeMetaFromMvpCount(mvpCount);
}

function resolveBadgeMeta({
  badgeKey,
  mvpCount,
}: {
  badgeKey?: BadgeKey;
  mvpCount?: number | null;
}): BadgeMeta {
  if (badgeKey) {
    return getBadgeMetaFromMvpCount(FALLBACK_COUNT_BY_KEY[badgeKey]);
  }

  return getBadgeMetaFromMvpCount(mvpCount);
}

export default function PlayerBadge({
  badgeKey,
  mvpCount,
  mode = "compact",
  size = "sm",
  className = "",
  title,
  hideIfNone = true,
  grayscale = false,
}: PlayerBadgeProps) {
  const badge = resolveBadgeMeta({ badgeKey, mvpCount });
  const px = SIZE[size];

  if (badge.key === "none") {
    if (hideIfNone) return null;

    return (
      <span
        className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
        style={{ width: px, height: px }}
        title={title ?? badge.label}
        aria-label={title ?? badge.label}
      >
        <span
          className="relative inline-flex items-center justify-center rounded-[32%] border border-slate-200 bg-slate-100 text-slate-300"
          style={{
            width: px,
            height: px,
          }}
        >
          <StrikrBadgeMark
            className="text-slate-300"
            style={{
              width: px * 0.62,
              height: px * 0.62,
            }}
          />
        </span>
      </span>
    );
  }

  const style = TIER_STYLE[badge.key];

  if (mode === "hero") {
    const isBlech = badge.key === "copper";
    const showBlechWear = isBlech && (size === "lg" || size === "xl");

    return (
      <span
        className={`relative inline-flex shrink-0 ${
          grayscale ? "grayscale" : ""
        } ${className}`}
        style={{ width: px, height: px }}
        title={title ?? badge.label}
        aria-label={title ?? badge.label}
      >
        <Image
          src={`/badges/hero/${HERO_ASSET_BY_KEY[badge.key]}`}
          alt=""
          fill
          sizes={`${px}px`}
          className={`object-contain ${
            isBlech
              ? "brightness-[0.70] contrast-[1.22] saturate-[0.28] sepia-[0.08]"
              : ""
          }`}
          draggable={false}
        />

        {showBlechWear ? (
          <>
            <span
              className="pointer-events-none absolute inset-[17%] rounded-[30%] opacity-55 mix-blend-overlay"
              style={{
                background:
                  "radial-gradient(circle at 28% 33%, rgba(0,0,0,.58) 0 3%, transparent 8%), radial-gradient(circle at 72% 62%, rgba(255,255,255,.52) 0 2%, rgba(0,0,0,.32) 4%, transparent 10%), radial-gradient(circle at 45% 78%, rgba(0,0,0,.44) 0 2.5%, transparent 8%), linear-gradient(118deg, transparent 24%, rgba(255,255,255,.22) 25%, transparent 27%, transparent 62%, rgba(0,0,0,.32) 63%, transparent 65%)",
              }}
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute left-[28%] top-[37%] h-px w-[32%] rotate-[-18deg] bg-black/35"
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute bottom-[32%] right-[25%] h-px w-[24%] rotate-[24deg] bg-white/28"
              aria-hidden="true"
            />
          </>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${
        grayscale ? "grayscale" : ""
      } ${className}`}
      style={{ width: px, height: px }}
      title={title ?? badge.label}
      aria-label={title ?? badge.label}
    >
      <span
        className="absolute inset-[-15%] rounded-[35%] blur-[6px]"
        style={{
          background: style.glow,
          opacity: grayscale ? 0.18 : size === "xs" ? 0.38 : 0.62,
        }}
      />

      <span
        className="relative inline-flex items-center justify-center rounded-[32%] shadow-sm transition-all duration-200 hover:scale-105"
        style={{
          width: px,
          height: px,
          background: style.surface,
          border: `1px solid ${style.border}`,
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 1px rgba(0,0,0,0.35)",
        }}
      >
        <StrikrBadgeMark
          className={style.mark}
          style={{
            width: px * 0.62,
            height: px * 0.62,
          }}
        />
      </span>
    </span>
  );
}
