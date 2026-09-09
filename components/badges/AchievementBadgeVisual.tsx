import {
  Activity,
  CloudRain,
  Crown,
  Feather,
  Flame,
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

function PremiumFrame({
  tone,
  inset = "-10%",
  opacity = 0.45,
}: {
  tone: "steel" | "bronze" | "silver" | "gold" | "cyan" | "violet" | "emerald" | "dark";
  inset?: string;
  opacity?: number;
}) {
  const border = {
    steel: "rgba(226,232,240,.48)",
    bronze: "rgba(251,146,60,.56)",
    silver: "rgba(224,242,254,.62)",
    gold: "rgba(253,230,138,.72)",
    cyan: "rgba(165,243,252,.62)",
    violet: "rgba(221,214,254,.62)",
    emerald: "rgba(167,243,208,.62)",
    dark: "rgba(203,213,225,.28)",
  }[tone];

  return (
    <span
      className="pointer-events-none absolute rounded-[31%]"
      style={{
        inset,
        border: `1px solid ${border}`,
        opacity,
        boxShadow: `0 0 18px ${border}`,
      }}
      aria-hidden="true"
    />
  );
}

function AppearanceDecoration({
  visual,
  px,
}: {
  visual: BadgeVisualMeta;
  px: number;
}) {
  if (px <= 24) return null;

  const stage = visual.stage;
  const isLegendary = stage === 5;
  const isGoat = stage >= 6;

  const halo = isGoat
    ? "conic-gradient(from 20deg, rgba(34,211,238,.88), rgba(99,102,241,.72), rgba(217,70,239,.9), rgba(250,204,21,.72), rgba(34,211,238,.88))"
    : isLegendary
      ? "radial-gradient(circle, rgba(250,204,21,.7), rgba(180,83,9,.24) 54%, transparent 74%)"
      : stage >= 4
        ? "radial-gradient(circle, rgba(251,191,36,.5), rgba(120,53,15,.16) 58%, transparent 74%)"
        : stage === 3
          ? "radial-gradient(circle, rgba(186,230,253,.34), rgba(71,85,105,.13) 58%, transparent 74%)"
          : stage === 2
            ? "radial-gradient(circle, rgba(251,146,60,.34), rgba(124,45,18,.13) 58%, transparent 74%)"
            : "radial-gradient(circle, rgba(148,163,184,.28), transparent 72%)";

  return (
    <>
      <span
        className={`pointer-events-none absolute rounded-[36%] blur-[11px] ${
          isGoat ? "inset-[-25%] opacity-90" : isLegendary ? "inset-[-20%] opacity-82" : "inset-[-14%] opacity-68"
        }`}
        style={{ background: halo }}
        aria-hidden="true"
      />

      <Shield
        className={`pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 ${
          isGoat
            ? "text-cyan-100/34"
            : stage >= 4
              ? "text-amber-100/34"
              : stage === 3
                ? "text-sky-100/28"
                : stage === 2
                  ? "text-orange-100/24"
                  : "text-slate-100/20"
        }`}
        size={Math.round(px * (isGoat ? 1.43 : isLegendary ? 1.38 : 1.28))}
        strokeWidth={stage >= 4 ? 1.5 : 1.25}
        aria-hidden="true"
      />

      <PremiumFrame
        tone={isGoat ? "cyan" : stage >= 4 ? "gold" : stage === 3 ? "silver" : stage === 2 ? "bronze" : "steel"}
        inset={isGoat ? "-16%" : isLegendary ? "-13%" : "-9%"}
        opacity={isGoat ? 0.78 : isLegendary ? 0.68 : stage >= 4 ? 0.52 : 0.34}
      />

      {stage === 3 ? (
        <Star
          className="pointer-events-none absolute -top-[19%] left-1/2 z-0 -translate-x-1/2 fill-sky-100/18 text-sky-100/68"
          size={Math.round(px * 0.26)}
          strokeWidth={1.6}
          aria-hidden="true"
        />
      ) : null}

      {stage >= 4 ? (
        <Crown
          className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 ${
            isGoat
              ? "-top-[34%] text-fuchsia-100/96 drop-shadow-[0_0_10px_rgba(232,121,249,.8)]"
              : isLegendary
                ? "-top-[31%] text-amber-100/96 drop-shadow-[0_0_9px_rgba(250,204,21,.72)]"
                : "-top-[25%] text-amber-100/82 drop-shadow-[0_0_7px_rgba(250,204,21,.45)]"
          }`}
          size={Math.round(px * (isGoat ? 0.61 : isLegendary ? 0.52 : 0.38))}
          strokeWidth={stage >= 5 ? 2 : 1.8}
          aria-hidden="true"
        />
      ) : null}

      {isGoat ? (
        <>
          <Sparkles
            className="pointer-events-none absolute -right-[24%] top-[10%] z-0 text-cyan-100/90 drop-shadow-[0_0_8px_rgba(103,232,249,.8)]"
            size={Math.round(px * 0.32)}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <Sparkles
            className="pointer-events-none absolute -left-[20%] bottom-[-16%] z-0 text-amber-100/76"
            size={Math.round(px * 0.24)}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </>
      ) : null}
    </>
  );
}

function CareerWinsDecoration({
  visual,
  px,
}: {
  visual: BadgeVisualMeta;
  px: number;
}) {
  if (px <= 24) return null;

  const stage = visual.stage;
  const isLegend = stage >= 6;

  return (
    <>
      <span
        className={`pointer-events-none absolute rounded-full blur-[12px] ${
          isLegend ? "inset-[-25%] opacity-90" : stage >= 5 ? "inset-[-20%] opacity-78" : "inset-[-14%] opacity-62"
        }`}
        style={{
          background: isLegend
            ? "conic-gradient(from 30deg, rgba(250,204,21,.78), rgba(244,114,182,.38), rgba(34,211,238,.46), rgba(250,204,21,.78))"
            : stage >= 4
              ? "radial-gradient(circle, rgba(251,191,36,.6), rgba(180,83,9,.18) 58%, transparent 74%)"
              : "radial-gradient(circle, rgba(251,191,36,.32), transparent 72%)",
        }}
        aria-hidden="true"
      />

      <Trophy
        className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 text-amber-100 drop-shadow-[0_0_9px_rgba(251,191,36,.58)] ${
          isLegend ? "-top-[35%] opacity-96" : stage >= 4 ? "-top-[31%] opacity-88" : stage >= 2 ? "-top-[25%] opacity-72" : "-top-[20%] opacity-52"
        }`}
        size={Math.round(px * (isLegend ? 0.7 : stage >= 4 ? 0.58 : stage >= 2 ? 0.44 : 0.34))}
        strokeWidth={stage >= 4 ? 1.9 : 1.6}
        aria-hidden="true"
      />

      <PremiumFrame
        tone="gold"
        inset={isLegend ? "-15%" : stage >= 4 ? "-11%" : "-8%"}
        opacity={isLegend ? 0.72 : stage >= 4 ? 0.52 : stage >= 2 ? 0.34 : 0.22}
      />

      {stage >= 3 ? (
        <>
          <span className="pointer-events-none absolute -left-[20%] top-[20%] z-0 h-px w-[28%] rotate-[-24deg] bg-amber-100/46 shadow-[0_0_7px_rgba(251,191,36,.28)]" />
          <span className="pointer-events-none absolute -right-[20%] top-[20%] z-0 h-px w-[28%] rotate-[24deg] bg-amber-100/46 shadow-[0_0_7px_rgba(251,191,36,.28)]" />
          <span className="pointer-events-none absolute -left-[17%] bottom-[12%] z-0 h-px w-[24%] rotate-[18deg] bg-amber-100/28" />
          <span className="pointer-events-none absolute -right-[17%] bottom-[12%] z-0 h-px w-[24%] rotate-[-18deg] bg-amber-100/28" />
        </>
      ) : null}

      {stage === 4 ? (
        <Star
          className="pointer-events-none absolute -right-[21%] -top-[4%] z-0 fill-amber-100/22 text-amber-100/78"
          size={Math.round(px * 0.28)}
          strokeWidth={1.7}
          aria-hidden="true"
        />
      ) : null}

      {stage >= 5 ? (
        <Crown
          className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 text-amber-100/96 drop-shadow-[0_0_10px_rgba(251,191,36,.68)] ${
            isLegend ? "-top-[40%]" : "-top-[34%]"
          }`}
          size={Math.round(px * (isLegend ? 0.58 : 0.46))}
          strokeWidth={2}
          aria-hidden="true"
        />
      ) : null}

      {isLegend ? (
        <Sparkles
          className="pointer-events-none absolute -right-[25%] bottom-[2%] z-0 text-amber-100/84 drop-shadow-[0_0_7px_rgba(251,191,36,.55)]"
          size={Math.round(px * 0.3)}
          strokeWidth={1.8}
          aria-hidden="true"
        />
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
  if (px <= 24) return null;

  const stage = visual.stage;

  return (
    <>
      <span
        className={`pointer-events-none absolute rounded-full bg-cyan-300 blur-[12px] ${
          stage >= 5 ? "inset-[-25%] opacity-40" : stage >= 3 ? "inset-[-19%] opacity-30" : "inset-[-13%] opacity-20"
        }`}
        aria-hidden="true"
      />

      <Activity
        className={`pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 ${
          stage >= 4 ? "text-cyan-100/42" : "text-cyan-100/27"
        }`}
        size={Math.round(px * (stage >= 5 ? 1.5 : stage >= 3 ? 1.38 : 1.24))}
        strokeWidth={1.25}
        aria-hidden="true"
      />

      <PremiumFrame
        tone="cyan"
        inset={stage >= 5 ? "-14%" : stage >= 3 ? "-10%" : "-7%"}
        opacity={stage >= 5 ? 0.58 : stage >= 3 ? 0.4 : 0.24}
      />

      {stage >= 2 ? (
        <>
          <span className="pointer-events-none absolute -left-[28%] top-[29%] z-0 h-px w-[36%] bg-cyan-100/54 shadow-[0_0_7px_rgba(34,211,238,.35)]" />
          <span className="pointer-events-none absolute -left-[34%] top-[48%] z-0 h-px w-[43%] bg-cyan-100/36" />
          <span className="pointer-events-none absolute -right-[28%] bottom-[29%] z-0 h-px w-[36%] bg-sky-100/46 shadow-[0_0_7px_rgba(56,189,248,.3)]" />
        </>
      ) : null}

      {stage >= 4 ? (
        <span className="pointer-events-none absolute inset-[-18%] rounded-full border border-cyan-100/28 shadow-[0_0_20px_rgba(34,211,238,.3)]" />
      ) : null}

      {stage >= 5 ? (
        <Zap
          className="pointer-events-none absolute -right-[23%] -top-[16%] z-0 text-cyan-100/80 drop-shadow-[0_0_7px_rgba(34,211,238,.65)]"
          size={Math.round(px * 0.34)}
          strokeWidth={1.9}
          aria-hidden="true"
        />
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

  const stage = visual.stage;

  return (
    <>
      <span
        className={`pointer-events-none absolute rounded-full bg-orange-400 blur-[12px] ${
          stage >= 5 ? "inset-[-23%] opacity-46" : stage >= 3 ? "inset-[-18%] opacity-34" : "inset-[-12%] opacity-22"
        }`}
        aria-hidden="true"
      />

      <Flame
        className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 text-orange-100 drop-shadow-[0_0_10px_rgba(251,146,60,.58)] ${
          stage >= 4 ? "-bottom-[30%] opacity-72" : "-bottom-[23%] opacity-52"
        }`}
        size={Math.round(px * (stage >= 5 ? 1.34 : stage >= 3 ? 1.12 : 0.82))}
        strokeWidth={1.4}
        aria-hidden="true"
      />

      <PremiumFrame
        tone="gold"
        inset={stage >= 5 ? "-13%" : stage >= 3 ? "-9%" : "-6%"}
        opacity={stage >= 5 ? 0.5 : stage >= 3 ? 0.34 : 0.2}
      />

      {stage >= 2 ? (
        <Zap
          className="pointer-events-none absolute -right-[22%] top-[7%] z-0 text-amber-100/76"
          size={Math.round(px * 0.34)}
          strokeWidth={1.9}
          aria-hidden="true"
        />
      ) : null}

      {stage >= 4 ? (
        <Crown
          className="pointer-events-none absolute -top-[29%] left-1/2 z-0 -translate-x-1/2 text-amber-100/86 drop-shadow-[0_0_8px_rgba(251,191,36,.52)]"
          size={Math.round(px * (stage >= 5 ? 0.5 : 0.42))}
          strokeWidth={1.9}
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

  const stage = visual.stage;

  return (
    <>
      <span
        className={`pointer-events-none absolute rounded-full bg-slate-950 blur-[13px] ${
          stage >= 3 ? "inset-[-24%] opacity-80" : stage >= 2 ? "inset-[-19%] opacity-62" : "inset-[-14%] opacity-44"
        }`}
        aria-hidden="true"
      />

      <PremiumFrame
        tone="dark"
        inset={stage >= 3 ? "-13%" : "-8%"}
        opacity={stage >= 3 ? 0.56 : 0.34}
      />

      <CloudRain
        className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 text-slate-200 drop-shadow-[0_0_8px_rgba(148,163,184,.28)] ${
          stage >= 3 ? "-top-[34%] opacity-74" : "-top-[26%] opacity-54"
        }`}
        size={Math.round(px * (stage >= 3 ? 0.9 : 0.68))}
        strokeWidth={1.4}
        aria-hidden="true"
      />

      <span className="pointer-events-none absolute -right-[19%] top-[20%] z-0 h-px w-[23%] rotate-[28deg] bg-slate-200/32" />
      <span className="pointer-events-none absolute -right-[18%] top-[37%] z-0 h-px w-[19%] rotate-[-18deg] bg-rose-200/26" />
      <span className="pointer-events-none absolute -left-[17%] bottom-[24%] z-0 h-px w-[20%] rotate-[-24deg] bg-slate-200/24" />

      {stage >= 2 ? (
        <Feather
          className="pointer-events-none absolute -bottom-[20%] -left-[19%] z-0 rotate-[-28deg] text-slate-300/54"
          size={Math.round(px * 0.42)}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      ) : null}

      {stage >= 3 ? (
        <Crown
          className="pointer-events-none absolute -top-[25%] -right-[13%] z-0 rotate-[18deg] text-amber-100/66 drop-shadow-[0_0_7px_rgba(251,191,36,.28)]"
          size={Math.round(px * 0.38)}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}

function CloverMark({ px }: { px: number }) {
  return (
    <span
      className="pointer-events-none absolute -right-[21%] -top-[18%] z-0 h-[38%] w-[38%] rotate-[12deg]"
      aria-hidden="true"
    >
      <span className="absolute left-[30%] top-0 h-[40%] w-[40%] rounded-full bg-emerald-300/80 shadow-[0_0_8px_rgba(52,211,153,.52)]" />
      <span className="absolute left-0 top-[30%] h-[40%] w-[40%] rounded-full bg-emerald-300/80 shadow-[0_0_8px_rgba(52,211,153,.52)]" />
      <span className="absolute right-0 top-[30%] h-[40%] w-[40%] rounded-full bg-emerald-300/80 shadow-[0_0_8px_rgba(52,211,153,.52)]" />
      <span className="absolute bottom-0 left-[30%] h-[40%] w-[40%] rounded-full bg-emerald-300/80 shadow-[0_0_8px_rgba(52,211,153,.52)]" />
      <span
        className="absolute bottom-[-24%] left-[45%] h-[34%] w-[9%] rotate-[-18deg] rounded-full bg-emerald-200/72"
        style={{ minWidth: px > 36 ? 2 : 1 }}
      />
    </span>
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
        <span className="pointer-events-none absolute inset-[-22%] rounded-full bg-amber-400/34 blur-[12px]" />
        <PremiumFrame tone="gold" inset="-11%" opacity={0.52} />
        <Link2Off
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] text-amber-100/46 drop-shadow-[0_0_8px_rgba(251,191,36,.45)]"
          size={Math.round(px * 1.36)}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <Sparkles
          className="pointer-events-none absolute -right-[20%] -top-[17%] z-0 text-amber-100/82"
          size={Math.round(px * 0.3)}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </>
    );
  }

  if (visual.motif === "resilient") {
    return (
      <>
        <span className="pointer-events-none absolute inset-[-21%] rounded-full bg-sky-400/24 blur-[12px]" />
        <PremiumFrame tone="cyan" inset="-10%" opacity={0.42} />
        <Shield
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-sky-100/42 drop-shadow-[0_0_8px_rgba(125,211,252,.38)]"
          size={Math.round(px * 1.38)}
          strokeWidth={1.45}
          aria-hidden="true"
        />
        <span className="pointer-events-none absolute -right-[18%] top-[17%] z-0 h-px w-[22%] rotate-[32deg] bg-cyan-100/54" />
        <span className="pointer-events-none absolute -right-[15%] top-[35%] z-0 h-px w-[18%] rotate-[-20deg] bg-sky-100/38" />
      </>
    );
  }

  if (visual.motif === "lucky") {
    return (
      <>
        <span className="pointer-events-none absolute inset-[-24%] rounded-full bg-emerald-400/36 blur-[13px]" />
        <PremiumFrame tone="emerald" inset="-12%" opacity={0.56} />
        <CloverMark px={px} />
        <Sparkles
          className="pointer-events-none absolute -left-[19%] -top-[15%] z-0 text-amber-100/80"
          size={Math.round(px * 0.3)}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </>
    );
  }

  return (
    <>
      <span className="pointer-events-none absolute inset-[-24%] rounded-full bg-fuchsia-500/30 blur-[13px]" />
      <PremiumFrame tone="violet" inset="-12%" opacity={0.52} />
      <RotateCcw
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-violet-100/42 drop-shadow-[0_0_8px_rgba(196,181,253,.42)]"
        size={Math.round(px * 1.36)}
        strokeWidth={1.45}
        aria-hidden="true"
      />
      <Sparkles
        className="pointer-events-none absolute -right-[20%] -top-[17%] z-0 text-fuchsia-100/82"
        size={Math.round(px * 0.3)}
        strokeWidth={1.8}
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
        <span className="pointer-events-none absolute inset-[-13%] rounded-full bg-cyan-300/18 blur-[9px]" />
        <PremiumFrame tone="cyan" inset="-6%" opacity={0.2} />
        <span className="pointer-events-none absolute -bottom-[13%] left-1/2 z-0 h-px w-[112%] -translate-x-1/2 bg-cyan-100/42 shadow-[0_0_8px_rgba(34,211,238,.3)]" />
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
    if (visual.stage >= 4) return 1.05;
    if (visual.stage >= 3) return 1.03;
  }

  if (visual.motif === "career-wins") {
    if (visual.stage >= 6) return 1.09;
    if (visual.stage >= 5) return 1.07;
    if (visual.stage >= 4) return 1.05;
    if (visual.stage >= 3) return 1.03;
  }

  if (visual.motif === "attendance") {
    if (visual.stage >= 5) return 1.07;
    if (visual.stage >= 3) return 1.04;
  }

  if (visual.motif === "win-streak") {
    if (visual.stage >= 5) return 1.07;
    if (visual.stage >= 3) return 1.04;
  }

  if (visual.motif === "loss-streak" && visual.stage >= 3) return 1.04;
  if (visual.family === "special") return 1.05;
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
