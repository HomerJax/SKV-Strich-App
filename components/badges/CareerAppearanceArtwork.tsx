"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { X } from "lucide-react";
import { getBadgeDefinition } from "@/lib/badges/catalog";
import { getBadgeVisualMeta } from "@/lib/badges/visual-catalog";

type Props = {
  badgeKey: string;
  px: number;
  grayscale?: boolean;
  className?: string;
};

type Ring = {
  rx: number;
  ry: number;
  rotate: number;
  width: number;
  opacity: number;
};

type ArtConfig = {
  value: number;
  tier: string;
  hero: string;
  glow: string;
  colors: string[];
  rings: Ring[];
  badgeSize: number;
};

const CONFIG: Record<string, ArtConfig> = {
  career_appearances_10: {
    value: 10,
    tier: "Blech",
    hero: "/badges/hero/blech.webp",
    glow: "#94a3b8",
    colors: ["#f8fafc", "#a1a1aa", "#3f3f46", "#09090b", "#d4d4d8"],
    rings: [{ rx: 176, ry: 82, rotate: -9, width: 22, opacity: 0.94 }],
    badgeSize: 272,
  },
  career_appearances_25: {
    value: 25,
    tier: "Bronze",
    hero: "/badges/hero/bronze.webp",
    glow: "#f97316",
    colors: ["#ffedd5", "#fb923c", "#9a3412", "#431407", "#fdba74"],
    rings: [{ rx: 176, ry: 82, rotate: -9, width: 22, opacity: 1 }],
    badgeSize: 276,
  },
  career_appearances_50: {
    value: 50,
    tier: "Silber",
    hero: "/badges/hero/silber.webp",
    glow: "#bfdbfe",
    colors: ["#ffffff", "#e2e8f0", "#94a3b8", "#475569", "#f8fafc"],
    rings: [{ rx: 178, ry: 83, rotate: -9, width: 22, opacity: 1 }],
    badgeSize: 280,
  },
  career_appearances_100: {
    value: 100,
    tier: "Gold",
    hero: "/badges/hero/gold.webp",
    glow: "#facc15",
    colors: ["#fff7c2", "#fde047", "#ca8a04", "#713f12", "#fef08a"],
    rings: [{ rx: 180, ry: 84, rotate: -9, width: 23, opacity: 1 }],
    badgeSize: 288,
  },
  career_appearances_250: {
    value: 250,
    tier: "Legendär",
    hero: "/badges/hero/goat.webp",
    glow: "#a855f7",
    colors: ["#67e8f9", "#60a5fa", "#8b5cf6", "#ec4899", "#fb7185", "#facc15"],
    rings: [
      { rx: 184, ry: 82, rotate: -10, width: 21, opacity: 1 },
      { rx: 169, ry: 101, rotate: 15, width: 17, opacity: 0.86 },
    ],
    badgeSize: 304,
  },
  career_appearances_500: {
    value: 500,
    tier: "GOAT",
    hero: "/badges/hero/goat.webp",
    glow: "#22d3ee",
    colors: ["#22d3ee", "#2563eb", "#7c3aed", "#ec4899", "#fb7185", "#facc15", "#2dd4bf"],
    rings: [
      { rx: 190, ry: 84, rotate: -10, width: 22, opacity: 1 },
      { rx: 175, ry: 105, rotate: 15, width: 18, opacity: 0.92 },
      { rx: 160, ry: 121, rotate: -22, width: 15, opacity: 0.78 },
    ],
    badgeSize: 322,
  },
};

function CareerArtwork({ badgeKey, className = "" }: { badgeKey: string; className?: string }) {
  const config = CONFIG[badgeKey];
  const uid = useId().replace(/:/g, "");
  if (!config) return null;

  const metalId = `metal-${uid}`;
  const shineId = `shine-${uid}`;
  const glowId = `glow-${uid}`;
  const shadowId = `shadow-${uid}`;
  const badgeShadowId = `badge-shadow-${uid}`;
  const frontClipId = `front-${uid}`;

  const stops = config.colors.map((color, index) => ({
    color,
    offset: `${Math.round((index / Math.max(1, config.colors.length - 1)) * 100)}%`,
  }));
  const badgeXY = (480 - config.badgeSize) / 2;

  return (
    <svg
      viewBox="0 0 480 480"
      className={className}
      role="img"
      aria-label={`${config.value} Einsätze · ${config.tier}`}
    >
      <defs>
        <radialGradient id={glowId} cx="50%" cy="45%" r="56%">
          <stop offset="0%" stopColor={config.glow} stopOpacity="0.48" />
          <stop offset="48%" stopColor={config.glow} stopOpacity="0.14" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={metalId} x1="0%" y1="0%" x2="100%" y2="100%">
          {stops.map((stop) => (
            <stop key={`${stop.offset}-${stop.color}`} offset={stop.offset} stopColor={stop.color} />
          ))}
        </linearGradient>
        <linearGradient id={shineId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="28%" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="48%" stopColor="#fff" stopOpacity="1" />
          <stop offset="65%" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.03" />
        </linearGradient>
        <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000" floodOpacity="0.55" />
          <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor={config.glow} floodOpacity="0.42" />
        </filter>
        <filter id={badgeShadowId} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="18" stdDeviation="15" floodColor="#000" floodOpacity="0.72" />
          <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor={config.glow} floodOpacity="0.38" />
        </filter>
        <clipPath id={frontClipId}>
          <rect x="0" y="236" width="480" height="244" />
        </clipPath>
      </defs>

      <rect width="480" height="480" fill={`url(#${glowId})`} />
      <ellipse cx="240" cy="378" rx="122" ry="23" fill="#000" opacity="0.34" filter={`url(#${shadowId})`} />

      {config.rings.map((ring, index) => (
        <g key={`back-${index}`} transform={`rotate(${ring.rotate} 240 240)`}>
          <ellipse
            cx="240"
            cy="240"
            rx={ring.rx}
            ry={ring.ry}
            fill="none"
            stroke={`url(#${metalId})`}
            strokeWidth={ring.width}
            opacity={ring.opacity}
            filter={`url(#${shadowId})`}
          />
          <ellipse
            cx="240"
            cy="240"
            rx={ring.rx}
            ry={ring.ry}
            fill="none"
            stroke={`url(#${shineId})`}
            strokeWidth={Math.max(3, ring.width * 0.17)}
            strokeLinecap="round"
            strokeDasharray="235 900"
            strokeDashoffset={index * -75}
            opacity={Math.min(1, ring.opacity + 0.08)}
          />
        </g>
      ))}

      <image
        href={config.hero}
        x={badgeXY}
        y={badgeXY - 4}
        width={config.badgeSize}
        height={config.badgeSize}
        preserveAspectRatio="xMidYMid meet"
        filter={`url(#${badgeShadowId})`}
      />

      <g clipPath={`url(#${frontClipId})`}>
        {config.rings.map((ring, index) => (
          <g key={`front-${index}`} transform={`rotate(${ring.rotate} 240 240)`}>
            <ellipse
              cx="240"
              cy="240"
              rx={ring.rx}
              ry={ring.ry}
              fill="none"
              stroke={`url(#${metalId})`}
              strokeWidth={ring.width}
              opacity={ring.opacity}
              filter={`url(#${shadowId})`}
            />
            <ellipse
              cx="240"
              cy="240"
              rx={ring.rx}
              ry={ring.ry}
              fill="none"
              stroke={`url(#${shineId})`}
              strokeWidth={Math.max(3, ring.width * 0.18)}
              strokeLinecap="round"
              strokeDasharray="270 860"
              strokeDashoffset={-300 - index * 65}
              opacity={Math.min(1, ring.opacity + 0.1)}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

export default function CareerAppearanceArtwork({ badgeKey, px, grayscale = false, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const config = CONFIG[badgeKey];
  const definition = useMemo(() => getBadgeDefinition(badgeKey), [badgeKey]);
  const visual = useMemo(() => getBadgeVisualMeta(badgeKey), [badgeKey]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!config) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => !grayscale && setOpen(true)}
        className={`relative inline-flex shrink-0 items-center justify-center overflow-visible border-0 bg-transparent p-0 ${
          grayscale ? "cursor-default" : "cursor-zoom-in"
        } ${className}`}
        style={{ width: px, height: px }}
        aria-label={`${definition?.title ?? badgeKey} groß anzeigen`}
      >
        <span
          className={`pointer-events-none block ${grayscale ? "grayscale opacity-45" : ""}`}
          style={{ width: px * 1.72, height: px * 1.72 }}
        >
          <CareerArtwork badgeKey={badgeKey} className="h-full w-full overflow-visible" />
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/95 px-4 py-6 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label={definition?.title ?? badgeKey}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur transition hover:bg-white/20"
            aria-label="Vollbild schließen"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col items-center overflow-y-auto rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.06),rgba(2,6,23,0)_42%),linear-gradient(180deg,#0f172a_0%,#020617_100%)] px-5 pb-7 pt-8 text-center shadow-2xl sm:px-8">
            <div className="text-[10px] font-black uppercase tracking-[0.32em] text-white/40">Hall of Fame · Karriere · Einsätze</div>
            <div className="mt-1 text-sm font-black uppercase tracking-[0.18em] text-white/65">{config.tier}</div>

            <div className="mt-2 flex aspect-square w-full max-w-[560px] items-center justify-center overflow-hidden">
              <CareerArtwork badgeKey={badgeKey} className="h-full w-full" />
            </div>

            <div className="-mt-5 text-5xl font-black tracking-tight text-white sm:text-6xl">{config.value}</div>
            <div className="mt-1 text-xs font-black uppercase tracking-[0.34em] text-white/60">Einsätze</div>
            <div className="mt-4 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/85">
              {config.tier}
            </div>
            {definition?.description ? <p className="mt-4 max-w-xl text-sm leading-6 text-white/55 sm:text-base">{definition.description}</p> : null}
            <p className="mt-2 max-w-xl text-xs leading-5 text-white/35">{visual.motifLabel}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
