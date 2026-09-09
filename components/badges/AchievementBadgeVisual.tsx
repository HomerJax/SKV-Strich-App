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

function AppearanceDecoration({
  visual,
  px,
}: {
  visual: BadgeVisualMeta;
  px: number;
}) {
  const isTiny = px <= 24;
  const isLegendary = visual.stage >= 5;
  const isGoat = visual.stage >= 6;

  return (
    <>
      <span
        className={`pointer-events-none absolute rounded-[34%] ${
          isGoat
            ? "inset-[-24%] blur-[12px] opacity-75"
            : isLegendary
              ? "inset-[-18%] blur-[10px] opacity-58"
              : "inset-[-10%] blur-[8px] opacity-30"
        }`}
        style={{
          background: isGoat
            ? "conic-gradient(from 15deg, rgba(34,211,238,.8), rgba(168,85,247,.9), rgba(244,114,182,.9), rgba(250,204,21,.8), rgba(34,211,238,.8))"
            : isLegendary
              ? "radial-gradient(circle, rgba(250,204,21,.66), rgba(161,98,7,.24) 58%, transparent 72%)"
              : "radial-gradient(circle, rgba(148,163,184,.42), transparent 68%)",
        }}
        aria-hidden="true"
      />

      {isLegendary ? (
        <span
          className={`pointer-events-none absolute inset-[-14%] rounded-[30%] border ${
            isGoat
              ? "border-fuchsia-200/75 shadow-[0_0_18px_rgba(34,211,238,.38),0_0_28px_rgba(217,70,239,.28)]"
              : "border-amber-200/70 shadow-[0_0_18px_rgba(250,204,21,.30)]"
          }`}
          aria-hidden="true"
        />
      ) : null}

      {!isTiny ? (
        <Shield
          className={`pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 ${
            isGoat
              ? "text-cyan-100/34"
              : isLegendary
                ? "text-amber-200/34"
                : visual.stage >= 4
                  ? "text-amber-200/28"
                  : "text-slate-200/22"
          }`}
          size={Math.round(px * (isLegendary ? 1.38 : 1.22))}
          strokeWidth={isLegendary ? 1.35 : 1.15}
          aria-hidden="true"
        />
      ) : null}

      {isLegendary && !isTiny ? (
        <>
          <span
            className={`pointer-events-none absolute -left-[17%] top-[3%] z-0 h-[94%] w-[42%] rounded-l-full border-l-2 border-t border-b ${
              isGoat ? "border-fuchsia-100/28" : "border-amber-200/38"
            } opacity-70`}
            aria-hidden="true"
          />
          <span
            className={`pointer-events-none absolute -right-[17%] top-[3%] z-0 h-[94%] w-[42%] rounded-r-full border-r-2 border-t border-b ${
              isGoat ? "border-cyan-100/28" : "border-amber-200/38"
            } opacity-70`}
            aria-hidden="true"
          />
        </>
      ) : null}

      {isLegendary && !isGoat && !isTiny ? (
        <Crown
          className="pointer-events-none absolute -top-[24%] left-1/2 z-0 -translate-x-1/2 text-amber-100/84 drop-shadow-[0_0_7px_rgba(250,204,21,.62)]"
          size={Math.round(px * 0.46)}
          strokeWidth={1.7}
          aria-hidden="true"
        />
      ) : null}

      {isGoat && !isTiny ? (
        <>
          <Crown
            className="pointer-events-none absolute -top-[30%] left-1/2 z-0 -translate-x-1/2 text-fuchsia-100/88 drop-shadow-[0_0_8px_rgba(232,121,249,.8)]"
            size={Math.round(px * 0.58)}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <Sparkles
            className="pointer-events-none absolute -right-[24%] top-[22%] z-0 text-cyan-200/90 drop-shadow-[0_0_7px_rgba(103,232,249,.75)]"
            size={Math.round(px * 0.34)}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <Sparkles
            className="pointer-events-none absolute -bottom-[18%] -left-[20%] z-0 text-amber-200/80 drop-shadow-[0_0_7px_rgba(253,230,138,.6)]"
            size={Math.round(px * 0.28)}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </>
      ) : null}
    </>
  );
}

function Crowd({ stage, px }: { stage: number; px: number }) {
  if (px <= 24 || stage < 2) return null;

  const people = stage >= 5 ? 7 : stage >= 3 ? 5 : 3;

  return (
    <span
      className="pointer-events-none absolute -bottom-[15%] left-1/2 z-0 flex h-[54%] w-[132%] -translate-x-1/2 items-end justify-center gap-[3%] opacity-55"
      aria-hidden="true"
    >
      {Array.from({ length: people }).map((_, index) => {
        const tall = index % 2 === 0;
        return (
          <span
            key={index}
            className="relative block w-[10%] rounded-t-full bg-amber-100/80 shadow-[0_0_8px_rgba(253,230,138,.25)]"
            style={{ height: tall ? "64%" : "49%" }}
          >
            <span className="absolute left-1/2 top-[-28%] aspect-square w-[82%] -translate-x-1/2 rounded-full bg-amber-100/90" />
            <span className="absolute -left-[48%] top-[11%] h-[16%] w-[78%] rotate-[-34deg] rounded-full bg-amber-100/75" />
            <span className="absolute -right-[48%] top-[11%] h-[16%] w-[78%] rotate-[34deg] rounded-full bg-amber-100/75" />
          </span>
        );
      })}
    </span>
  );
}

function CareerWinsDecoration({
  visual,
  px,
}: {
  visual: BadgeVisualMeta;
  px: number;
}) {
  const isTiny = px <= 24;

  return (
    <>
      <span
        className={`pointer-events-none absolute rounded-full blur-[10px] ${
          visual.stage >= 5
            ? "inset-[-20%] bg-amber-300/28"
            : "inset-[-10%] bg-amber-300/16"
        }`}
        aria-hidden="true"
      />
      <Crowd stage={visual.stage} px={px} />
      {!isTiny ? (
        <Trophy
          className="pointer-events-none absolute bottom-[-18%] left-1/2 z-0 -translate-x-1/2 text-amber-100/35"
          size={Math.round(px * (visual.stage >= 5 ? 1.18 : 0.9))}
          strokeWidth={1.25}
          aria-hidden="true"
        />
      ) : null}
      {visual.stage >= 4 && !isTiny ? (
        <>
          <Star
            className="pointer-events-none absolute -left-[18%] top-[4%] z-0 fill-amber-200/25 text-amber-200/65"
            size={Math.round(px * 0.28)}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <Star
            className="pointer-events-none absolute -right-[18%] top-[18%] z-0 fill-amber-100/20 text-amber-100/60"
            size={Math.round(px * 0.22)}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </>
      ) : null}
    </>
  );
}

function AttendanceDecoration({
  visual,
  px,
}: {
  visual: BadgeVisualMeta;
  px: number;
}) {
  const isTiny = px <= 24;

  return (
    <>
      <span
        className="pointer-events-none absolute inset-[-13%] rounded-full bg-cyan-300/13 blur-[9px]"
        aria-hidden="true"
      />
      {visual.stage >= 3 ? (
        <span
          className="pointer-events-none absolute inset-[-8%] rounded-full border border-cyan-200/34 shadow-[0_0_16px_rgba(34,211,238,.22)]"
          aria-hidden="true"
        />
      ) : null}
      {!isTiny ? (
        <>
          <Activity
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-cyan-100/34"
            size={Math.round(px * 1.34)}
            strokeWidth={1.3}
            aria-hidden="true"
          />
          <Footprints
            className="pointer-events-none absolute -right-[22%] bottom-[-18%] z-0 rotate-[-18deg] text-sky-100/40"
            size={Math.round(px * 0.58)}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          {visual.stage >= 2 ? (
            <>
              <span className="pointer-events-none absolute -left-[24%] top-[28%] z-0 h-px w-[38%] bg-cyan-100/40" />
              <span className="pointer-events-none absolute -left-[30%] top-[46%] z-0 h-px w-[48%] bg-cyan-100/28" />
              <span className="pointer-events-none absolute -left-[20%] top-[64%] z-0 h-px w-[34%] bg-cyan-100/20" />
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function WinStreakDecoration({
  visual,
  px,
}: {
  visual: BadgeVisualMeta;
  px: number;
}) {
  if (px <= 24) return null;

  return (
    <>
      <span
        className={`pointer-events-none absolute rounded-full blur-[10px] ${
          visual.stage >= 4
            ? "inset-[-18%] bg-orange-400/34"
            : "inset-[-10%] bg-orange-300/18"
        }`}
        aria-hidden="true"
      />
      {visual.stage >= 3 ? (
        <Flame
          className="pointer-events-none absolute -bottom-[24%] left-1/2 z-0 -translate-x-1/2 text-orange-200/46"
          size={Math.round(px * 1.22)}
          strokeWidth={1.35}
          aria-hidden="true"
        />
      ) : (
        <Zap
          className="pointer-events-none absolute -right-[18%] top-[6%] z-0 text-amber-200/55"
          size={Math.round(px * 0.48)}
          strokeWidth={1.6}
          aria-hidden="true"
        />
      )}
      {visual.stage >= 4 ? (
        <Crown
          className="pointer-events-none absolute -top-[25%] left-1/2 z-0 -translate-x-1/2 text-amber-100/68"
          size={Math.round(px * 0.48)}
          strokeWidth={1.6}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}

function LossDecoration({
  visual,
  px,
}: {
  visual: BadgeVisualMeta;
  px: number;
}) {
  if (px <= 24) return null;

  return (
    <>
      <span
        className={`pointer-events-none absolute rounded-full blur-[11px] ${
          visual.stage >= 3
            ? "inset-[-22%] bg-slate-950/65"
            : "inset-[-14%] bg-slate-700/32"
        }`}
        aria-hidden="true"
      />
      <CloudRain
        className="pointer-events-none absolute -top-[24%] left-1/2 z-0 -translate-x-1/2 text-slate-300/50"
        size={Math.round(px * (visual.stage >= 3 ? 1.18 : 0.86))}
        strokeWidth={1.25}
        aria-hidden="true"
      />
      <Feather
        className="pointer-events-none absolute -bottom-[24%] -left-[22%] z-0 rotate-[-28deg] text-slate-400/58"
        size={Math.round(px * 0.56)}
        strokeWidth={1.45}
        aria-hidden="true"
      />
      {visual.stage >= 3 ? (
        <>
          <span className="pointer-events-none absolute -right-[21%] top-[30%] z-0 h-[3px] w-[20%] rotate-[25deg] rounded-full bg-rose-300/35" />
          <span className="pointer-events-none absolute -right-[19%] top-[48%] z-0 h-[3px] w-[16%] rotate-[-18deg] rounded-full bg-rose-300/25" />
        </>
      ) : null}
    </>
  );
}

function SpecialDecoration({
  visual,
  px,
}: {
  visual: BadgeVisualMeta;
  px: number;
}) {
  if (px <= 24) return null;

  if (visual.motif === "curse-broken") {
    return (
      <>
        <span className="pointer-events-none absolute inset-[-18%] rounded-full bg-amber-300/24 blur-[10px]" />
        <Link2Off
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] text-amber-100/48"
          size={Math.round(px * 1.34)}
          strokeWidth={1.35}
          aria-hidden="true"
        />
        <Sparkles
          className="pointer-events-none absolute -right-[22%] -top-[16%] z-0 text-amber-200/70"
          size={Math.round(px * 0.42)}
          strokeWidth={1.6}
          aria-hidden="true"
        />
      </>
    );
  }

  if (visual.motif === "resilient") {
    return (
      <>
        <span className="pointer-events-none absolute inset-[-16%] rounded-full bg-slate-500/24 blur-[10px]" />
        <Shield
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-slate-200/35"
          size={Math.round(px * 1.28)}
          strokeWidth={1.25}
          aria-hidden="true"
        />
        <CloudRain
          className="pointer-events-none absolute -right-[24%] -top-[20%] z-0 text-slate-300/48"
          size={Math.round(px * 0.54)}
          strokeWidth={1.45}
          aria-hidden="true"
        />
      </>
    );
  }

  if (visual.motif === "lucky") {
    return (
      <>
        <span className="pointer-events-none absolute inset-[-22%] rounded-full bg-emerald-300/30 blur-[11px]" />
        <span className="pointer-events-none absolute -left-[13%] top-[3%] z-0 h-[35%] w-[35%] rounded-full border-2 border-emerald-100/52" />
        <span className="pointer-events-none absolute -right-[13%] top-[3%] z-0 h-[35%] w-[35%] rounded-full border-2 border-emerald-100/52" />
        <span className="pointer-events-none absolute -left-[13%] bottom-[3%] z-0 h-[35%] w-[35%] rounded-full border-2 border-emerald-100/52" />
        <span className="pointer-events-none absolute -right-[13%] bottom-[3%] z-0 h-[35%] w-[35%] rounded-full border-2 border-emerald-100/52" />
        <Sparkles
          className="pointer-events-none absolute -right-[24%] -top-[18%] z-0 text-amber-200/78"
          size={Math.round(px * 0.42)}
          strokeWidth={1.55}
          aria-hidden="true"
        />
      </>
    );
  }

  return (
    <>
      <span className="pointer-events-none absolute inset-[-18%] rounded-full bg-violet-400/22 blur-[10px]" />
      <RotateCcw
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-violet-100/42"
        size={Math.round(px * 1.35)}
        strokeWidth={1.25}
        aria-hidden="true"
      />
      <Sparkles
        className="pointer-events-none absolute -left-[22%] top-[3%] z-0 text-violet-200/62"
        size={Math.round(px * 0.34)}
        strokeWidth={1.55}
        aria-hidden="true"
      />
    </>
  );
}

function BadgeDecoration({
  visual,
  px,
}: {
  visual: BadgeVisualMeta;
  px: number;
}) {
  if (visual.motif === "career-appearances") {
    return <AppearanceDecoration visual={visual} px={px} />;
  }

  if (visual.motif === "career-wins") {
    return <CareerWinsDecoration visual={visual} px={px} />;
  }

  if (visual.motif === "kickoff") {
    return px <= 24 ? null : (
      <>
        <span className="pointer-events-none absolute inset-[-12%] rounded-full bg-sky-300/18 blur-[8px]" />
        <Star
          className="pointer-events-none absolute -right-[18%] -top-[14%] z-0 fill-sky-100/18 text-sky-100/56"
          size={Math.round(px * 0.5)}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </>
    );
  }

  if (visual.motif === "attendance") {
    return <AttendanceDecoration visual={visual} px={px} />;
  }

  if (visual.motif === "win-streak") {
    return <WinStreakDecoration visual={visual} px={px} />;
  }

  if (visual.motif === "loss-streak") {
    return <LossDecoration visual={visual} px={px} />;
  }

  return <SpecialDecoration visual={visual} px={px} />;
}

function getCoreScale(visual: BadgeVisualMeta) {
  if (visual.motif === "career-appearances") {
    if (visual.stage >= 6) return 1.12;
    if (visual.stage >= 5) return 1.08;
  }

  if (visual.stage >= 5) return 1.03;
  return 1;
}

export default function AchievementBadgeVisual({
  badgeKey,
  size = "xl",
  grayscale = false,
  className = "",
}: AchievementBadgeVisualProps) {
  const visual = getBadgeVisualMeta(badgeKey);
  const px = SIZE[size];
  const coreScale = getCoreScale(visual);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-visible ${
        grayscale ? "grayscale opacity-45" : ""
      } ${className}`}
      style={{ width: px, height: px }}
      title={badgeKey}
      aria-label={badgeKey}
    >
      <BadgeDecoration visual={visual} px={px} />
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
    </span>
  );
}
