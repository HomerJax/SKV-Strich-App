import {
  Activity,
  CloudRain,
  Crown,
  Feather,
  Flame,
  Footprints,
  Link2Off,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import PlayerBadge from "@/components/badges/PlayerBadge";
import {
  getAchievementCustomAsset,
  getAchievementVisualTier,
  getBadgeVisualMeta,
  type BadgeVisualMeta,
} from "@/lib/badges/visual-catalog";

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

export { getAchievementVisualTier } from "@/lib/badges/visual-catalog";

function IconBubble({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`pointer-events-none absolute z-20 inline-flex items-center justify-center rounded-full border border-white/25 bg-slate-950/82 text-white shadow-[0_4px_14px_rgba(15,23,42,0.34)] backdrop-blur-[1px] ${className}`}
      style={style}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function BadgeDecoration({
  visual,
  px,
}: {
  visual: BadgeVisualMeta;
  px: number;
}) {
  const bubble = Math.max(9, Math.round(px * 0.28));
  const icon = Math.max(6, Math.round(bubble * 0.58));
  const smallBubble = Math.max(8, Math.round(px * 0.23));
  const smallIcon = Math.max(5, Math.round(smallBubble * 0.56));
  const isTiny = px <= 24;

  if (visual.motif === "career-appearances") {
    return (
      <>
        <IconBubble
          className="-bottom-[3%] -left-[4%]"
          style={{ width: bubble, height: bubble }}
        >
          <Shield size={icon} strokeWidth={2.35} />
        </IconBubble>
        {!isTiny && visual.stage >= 5 ? (
          <IconBubble
            className="-right-[4%] -top-[4%] bg-indigo-950/90"
            style={{ width: smallBubble, height: smallBubble }}
          >
            {visual.stage >= 6 ? (
              <Crown size={smallIcon} strokeWidth={2.3} />
            ) : (
              <Star size={smallIcon} strokeWidth={2.3} />
            )}
          </IconBubble>
        ) : null}
        {!isTiny && visual.stage >= 6 ? (
          <Sparkles
            className="pointer-events-none absolute -right-[11%] top-[38%] z-10 text-fuchsia-300 drop-shadow-[0_0_6px_rgba(232,121,249,0.8)]"
            size={Math.max(10, Math.round(px * 0.24))}
            strokeWidth={2.1}
          />
        ) : null}
      </>
    );
  }

  if (visual.motif === "career-wins") {
    return (
      <>
        <IconBubble
          className="-bottom-[3%] -right-[4%] bg-amber-950/90 text-amber-100"
          style={{ width: bubble, height: bubble }}
        >
          <Trophy size={icon} strokeWidth={2.35} />
        </IconBubble>
        {!isTiny && visual.stage >= 3 ? (
          <IconBubble
            className="-left-[4%] -top-[4%] bg-amber-900/90 text-amber-100"
            style={{ width: smallBubble, height: smallBubble }}
          >
            {visual.stage >= 6 ? (
              <Crown size={smallIcon} strokeWidth={2.3} />
            ) : (
              <Star size={smallIcon} strokeWidth={2.3} />
            )}
          </IconBubble>
        ) : null}
        {!isTiny && visual.stage >= 5 ? (
          <Sparkles
            className="pointer-events-none absolute -left-[9%] bottom-[35%] z-10 text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.8)]"
            size={Math.max(10, Math.round(px * 0.23))}
            strokeWidth={2.1}
          />
        ) : null}
      </>
    );
  }

  if (visual.motif === "kickoff") {
    return (
      <IconBubble
        className="-bottom-[3%] -right-[4%] bg-sky-950/90 text-sky-100"
        style={{ width: bubble, height: bubble }}
      >
        <Star size={icon} strokeWidth={2.35} />
      </IconBubble>
    );
  }

  if (visual.motif === "attendance") {
    return (
      <>
        <IconBubble
          className="-bottom-[3%] -right-[4%] bg-cyan-950/90 text-cyan-100"
          style={{ width: bubble, height: bubble }}
        >
          <Footprints size={icon} strokeWidth={2.35} />
        </IconBubble>
        {!isTiny && visual.stage >= 3 ? (
          <IconBubble
            className="-left-[4%] -top-[4%] bg-sky-950/90 text-sky-100"
            style={{ width: smallBubble, height: smallBubble }}
          >
            <Activity size={smallIcon} strokeWidth={2.4} />
          </IconBubble>
        ) : null}
        {!isTiny && visual.stage >= 4 ? (
          <span
            className="pointer-events-none absolute inset-[-5%] z-0 rounded-full border border-cyan-300/45 shadow-[0_0_16px_rgba(103,232,249,0.28)]"
            aria-hidden="true"
          />
        ) : null}
      </>
    );
  }

  if (visual.motif === "win-streak") {
    return (
      <>
        <IconBubble
          className="-bottom-[3%] -right-[4%] bg-orange-950/90 text-orange-100"
          style={{ width: bubble, height: bubble }}
        >
          {visual.stage >= 3 ? (
            <Flame size={icon} strokeWidth={2.35} />
          ) : visual.stage >= 2 ? (
            <Zap size={icon} strokeWidth={2.35} />
          ) : (
            <Star size={icon} strokeWidth={2.35} />
          )}
        </IconBubble>
        {!isTiny && visual.stage >= 3 ? (
          <IconBubble
            className="-left-[4%] -top-[4%] bg-amber-950/90 text-amber-100"
            style={{ width: smallBubble, height: smallBubble }}
          >
            {visual.stage >= 4 ? (
              <Crown size={smallIcon} strokeWidth={2.3} />
            ) : (
              <Zap size={smallIcon} strokeWidth={2.3} />
            )}
          </IconBubble>
        ) : null}
      </>
    );
  }

  if (visual.motif === "loss-streak") {
    return (
      <>
        <IconBubble
          className="-right-[4%] -top-[4%] bg-slate-900/92 text-slate-200"
          style={{ width: bubble, height: bubble }}
        >
          <CloudRain size={icon} strokeWidth={2.3} />
        </IconBubble>
        {!isTiny && visual.stage >= 2 ? (
          <Feather
            className="pointer-events-none absolute -bottom-[9%] -left-[5%] z-10 rotate-[-20deg] text-slate-500 drop-shadow-sm"
            size={Math.max(10, Math.round(px * 0.26))}
            strokeWidth={2.1}
          />
        ) : null}
      </>
    );
  }

  if (visual.motif === "curse-broken") {
    return (
      <>
        <IconBubble
          className="-bottom-[3%] -right-[4%] bg-amber-950/90 text-amber-100"
          style={{ width: bubble, height: bubble }}
        >
          <Link2Off size={icon} strokeWidth={2.35} />
        </IconBubble>
        {!isTiny ? (
          <Sparkles
            className="pointer-events-none absolute -left-[8%] top-[8%] z-10 text-amber-300"
            size={Math.max(10, Math.round(px * 0.24))}
            strokeWidth={2.1}
          />
        ) : null}
      </>
    );
  }

  if (visual.motif === "resilient") {
    return (
      <>
        <IconBubble
          className="-bottom-[3%] -right-[4%] bg-slate-950/92 text-slate-100"
          style={{ width: bubble, height: bubble }}
        >
          <Shield size={icon} strokeWidth={2.35} />
        </IconBubble>
        {!isTiny ? (
          <CloudRain
            className="pointer-events-none absolute -left-[7%] -top-[5%] z-10 text-slate-500"
            size={Math.max(10, Math.round(px * 0.24))}
            strokeWidth={2.1}
          />
        ) : null}
      </>
    );
  }

  if (visual.motif === "lucky") {
    return !isTiny ? (
      <Sparkles
        className="pointer-events-none absolute -right-[8%] -top-[6%] z-20 text-emerald-300"
        size={Math.max(10, Math.round(px * 0.24))}
        strokeWidth={2.1}
      />
    ) : null;
  }

  return (
    <IconBubble
      className="-bottom-[3%] -right-[4%] bg-violet-950/90 text-violet-100"
      style={{ width: bubble, height: bubble }}
    >
      <RotateCcw size={icon} strokeWidth={2.35} />
    </IconBubble>
  );
}

export default function AchievementBadgeVisual({
  badgeKey,
  size = "xl",
  grayscale = false,
  className = "",
}: AchievementBadgeVisualProps) {
  const customAsset = getAchievementCustomAsset(badgeKey);
  const visual = getBadgeVisualMeta(badgeKey);
  const px = SIZE[size];

  if (customAsset) {
    return (
      <span
        className={`relative inline-flex shrink-0 overflow-hidden rounded-[22%] ${
          grayscale ? "grayscale opacity-45" : ""
        } ${className}`}
        style={{ width: px, height: px }}
        title={badgeKey}
        aria-label={badgeKey}
      >
        <img
          src={customAsset}
          alt=""
          width={px}
          height={px}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex shrink-0 ${
        grayscale ? "grayscale opacity-45" : ""
      } ${className}`}
      style={{ width: px, height: px }}
      title={badgeKey}
      aria-label={badgeKey}
    >
      <span className="relative z-10 inline-flex h-full w-full">
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
      <BadgeDecoration visual={visual} px={px} />
    </span>
  );
}
