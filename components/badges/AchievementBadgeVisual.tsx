import {
  Activity,
  CloudRain,
  Crown,
  Flame,
  Link2Off,
  RotateCcw,
  Shield,
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
  inset = "-8%",
  opacity = 0.42,
}: {
  tone:
    | "steel"
    | "bronze"
    | "silver"
    | "gold"
    | "cyan"
    | "violet"
    | "emerald"
    | "dark";
  inset?: string;
  opacity?: number;
}) {
  const border = {
    steel: "rgba(226,232,240,.52)",
    bronze: "rgba(251,146,60,.64)",
    silver: "rgba(241,245,249,.72)",
    gold: "rgba(253,230,138,.82)",
    cyan: "rgba(165,243,252,.68)",
    violet: "rgba(221,214,254,.66)",
    emerald: "rgba(167,243,208,.68)",
    dark: "rgba(203,213,225,.26)",
  }[tone];

  return (
    <span
      className="pointer-events-none absolute rounded-[31%]"
      style={{
        inset,
        border: `1px solid ${border}`,
        opacity,
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,.05), 0 0 12px ${border}`,
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
    ? "radial-gradient(circle at 35% 30%, rgba(103,232,249,.48), transparent 38%), radial-gradient(circle at 70% 68%, rgba(216,180,254,.42), transparent 42%), radial-gradient(circle, rgba(250,204,21,.20), transparent 72%)"
    : isLegendary
      ? "radial-gradient(circle, rgba(250,204,21,.54), rgba(146,64,14,.16) 56%, transparent 74%)"
      : stage >= 4
        ? "radial-gradient(circle, rgba(251,191,36,.36), transparent 72%)"
        : stage === 3
          ? "radial-gradient(circle, rgba(226,232,240,.30), transparent 72%)"
          : stage === 2
            ? "radial-gradient(circle, rgba(251,146,60,.26), transparent 72%)"
            : "radial-gradient(circle, rgba(148,163,184,.20), transparent 72%)";

  return (
    <>
      <span
        className={`pointer-events-none absolute rounded-[38%] blur-[10px] ${
          isGoat
            ? "inset-[-24%] opacity-95"
            : isLegendary
              ? "inset-[-19%] opacity-80"
              : "inset-[-13%] opacity-64"
        }`}
        style={{ background: halo }}
        aria-hidden="true"
      />

      <PremiumFrame
        tone={
          isGoat
            ? "silver"
            : stage >= 4
              ? "gold"
              : stage === 3
                ? "silver"
                : stage === 2
                  ? "bronze"
                  : "steel"
        }
        inset={isGoat ? "-14%" : isLegendary ? "-11%" : "-7%"}
        opacity={isGoat ? 0.82 : isLegendary ? 0.68 : stage >= 4 ? 0.54 : 0.34}
      />

      {stage >= 4 ? (
        <Crown
          className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 ${
            isGoat
              ? "-top-[35%] text-yellow-50 drop-shadow-[0_4px_9px_rgba(250,204,21,.52)]"
              : isLegendary
                ? "-top-[31%] text-amber-100 drop-shadow-[0_4px_8px_rgba(245,158,11,.44)]"
                : "-top-[25%] text-amber-100/88"
          }`}
          size={Math.round(px * (isGoat ? 0.62 : isLegendary ? 0.52 : 0.38))}
          strokeWidth={isGoat ? 2.2 : 2}
          aria-hidden="true"
        />
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
        className={`pointer-events-none absolute rounded-full bg-amber-300 blur-[11px] ${
          isLegend
            ? "inset-[-22%] opacity-48"
            : stage >= 4
              ? "inset-[-17%] opacity-36"
              : "inset-[-12%] opacity-24"
        }`}
        aria-hidden="true"
      />

      <PremiumFrame
        tone="gold"
        inset={isLegend ? "-12%" : stage >= 4 ? "-9%" : "-6%"}
        opacity={isLegend ? 0.66 : stage >= 4 ? 0.48 : 0.3}
      />

      <Trophy
        className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 text-amber-100 drop-shadow-[0_4px_8px_rgba(245,158,11,.42)] ${
          isLegend
            ? "-top-[36%]"
            : stage >= 4
              ? "-top-[31%]"
              : stage >= 2
                ? "-top-[25%] opacity-82"
                : "-top-[20%] opacity-62"
        }`}
        size={Math.round(
          px * (isLegend ? 0.66 : stage >= 4 ? 0.56 : stage >= 2 ? 0.43 : 0.32),
        )}
        strokeWidth={stage >= 4 ? 2 : 1.7}
        aria-hidden="true"
      />
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
        className={`pointer-events-none absolute rounded-full bg-cyan-300 blur-[11px] ${
          stage >= 5
            ? "inset-[-22%] opacity-38"
            : stage >= 3
              ? "inset-[-17%] opacity-28"
              : "inset-[-12%] opacity-19"
        }`}
        aria-hidden="true"
      />

      <PremiumFrame
        tone="cyan"
        inset={stage >= 5 ? "-12%" : stage >= 3 ? "-9%" : "-6%"}
        opacity={stage >= 5 ? 0.58 : stage >= 3 ? 0.42 : 0.26}
      />

      <Activity
        className={`pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 ${
          stage >= 4 ? "text-cyan-100/40" : "text-cyan-100/26"
        }`}
        size={Math.round(px * (stage >= 5 ? 1.46 : stage >= 3 ? 1.34 : 1.22))}
        strokeWidth={1.25}
        aria-hidden="true"
      />

      {stage >= 4 ? (
        <span
          className="pointer-events-none absolute inset-[-16%] rounded-full border border-cyan-100/20 shadow-[0_0_18px_rgba(34,211,238,.22)]"
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
        className={`pointer-events-none absolute rounded-full bg-orange-400 blur-[11px] ${
          stage >= 5
            ? "inset-[-22%] opacity-42"
            : stage >= 3
              ? "inset-[-17%] opacity-31"
              : "inset-[-12%] opacity-20"
        }`}
        aria-hidden="true"
      />

      <PremiumFrame
        tone="gold"
        inset={stage >= 5 ? "-11%" : stage >= 3 ? "-8%" : "-5%"}
        opacity={stage >= 5 ? 0.52 : stage >= 3 ? 0.36 : 0.22}
      />

      <Flame
        className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 text-orange-100 drop-shadow-[0_5px_9px_rgba(249,115,22,.42)] ${
          stage >= 4 ? "-bottom-[31%] opacity-74" : "-bottom-[24%] opacity-56"
        }`}
        size={Math.round(px * (stage >= 5 ? 1.28 : stage >= 3 ? 1.08 : 0.8))}
        strokeWidth={1.45}
        aria-hidden="true"
      />
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
        className={`pointer-events-none absolute rounded-full bg-slate-950 blur-[12px] ${
          stage >= 3
            ? "inset-[-22%] opacity-78"
            : stage >= 2
              ? "inset-[-17%] opacity-58"
              : "inset-[-12%] opacity-40"
        }`}
        aria-hidden="true"
      />

      <PremiumFrame
        tone="dark"
        inset={stage >= 3 ? "-11%" : "-7%"}
        opacity={stage >= 3 ? 0.5 : 0.32}
      />

      <CloudRain
        className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 text-slate-200 drop-shadow-[0_4px_8px_rgba(15,23,42,.48)] ${
          stage >= 3 ? "-top-[34%] opacity-76" : "-top-[27%] opacity-58"
        }`}
        size={Math.round(px * (stage >= 3 ? 0.88 : 0.66))}
        strokeWidth={1.45}
        aria-hidden="true"
      />

      {stage >= 2 ? (
        <>
          <span
            className="pointer-events-none absolute -right-[16%] top-[21%] z-0 h-px w-[22%] rotate-[28deg] bg-slate-200/28"
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute -left-[15%] bottom-[23%] z-0 h-px w-[20%] rotate-[-25deg] bg-slate-300/22"
            aria-hidden="true"
          />
        </>
      ) : null}
    </>
  );
}

function CloverMark({ px }: { px: number }) {
  return (
    <span
      className="pointer-events-none absolute -right-[18%] -top-[18%] z-0 h-[35%] w-[35%] rotate-[10deg]"
      aria-hidden="true"
    >
      <span className="absolute left-[30%] top-0 h-[40%] w-[40%] rounded-full bg-emerald-200/78" />
      <span className="absolute left-0 top-[30%] h-[40%] w-[40%] rounded-full bg-emerald-200/78" />
      <span className="absolute right-0 top-[30%] h-[40%] w-[40%] rounded-full bg-emerald-200/78" />
      <span className="absolute bottom-0 left-[30%] h-[40%] w-[40%] rounded-full bg-emerald-200/78" />
      <span
        className="absolute bottom-[-24%] left-[45%] h-[34%] w-[9%] rotate-[-18deg] rounded-full bg-emerald-100/72"
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
        <span className="pointer-events-none absolute inset-[-20%] rounded-full bg-amber-400/30 blur-[11px]" />
        <PremiumFrame tone="gold" inset="-9%" opacity={0.5} />
        <Link2Off
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rotate-[-10deg] text-amber-100/42"
          size={Math.round(px * 1.34)}
          strokeWidth={1.55}
          aria-hidden="true"
        />
      </>
    );
  }

  if (visual.motif === "resilient") {
    return (
      <>
        <span className="pointer-events-none absolute inset-[-18%] rounded-full bg-sky-400/20 blur-[11px]" />
        <PremiumFrame tone="cyan" inset="-8%" opacity={0.4} />
        <Shield
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-sky-100/38"
          size={Math.round(px * 1.36)}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </>
    );
  }

  if (visual.motif === "lucky") {
    return (
      <>
        <span className="pointer-events-none absolute inset-[-21%] rounded-full bg-emerald-400/30 blur-[11px]" />
        <PremiumFrame tone="emerald" inset="-10%" opacity={0.54} />
        <CloverMark px={px} />
      </>
    );
  }

  if (visual.motif === "full-throttle") {
    return (
      <>
        <span
          className="pointer-events-none absolute inset-[-21%] rounded-full blur-[11px]"
          style={{
            background:
              "radial-gradient(circle at 34% 35%, rgba(34,211,238,.38), transparent 46%), radial-gradient(circle at 68% 66%, rgba(251,146,60,.40), transparent 48%)",
          }}
          aria-hidden="true"
        />
        <PremiumFrame tone="gold" inset="-10%" opacity={0.56} />
        <Zap
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-yellow-100/42 drop-shadow-[0_4px_7px_rgba(250,204,21,.3)]"
          size={Math.round(px * 1.34)}
          strokeWidth={1.55}
          aria-hidden="true"
        />
      </>
    );
  }

  return (
    <>
      <span className="pointer-events-none absolute inset-[-21%] rounded-full bg-violet-500/25 blur-[11px]" />
      <PremiumFrame tone="violet" inset="-9%" opacity={0.48} />
      <RotateCcw
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-violet-100/38"
        size={Math.round(px * 1.34)}
        strokeWidth={1.5}
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
        <span className="pointer-events-none absolute inset-[-12%] rounded-full bg-cyan-300/16 blur-[8px]" />
        <PremiumFrame tone="cyan" inset="-5%" opacity={0.2} />
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
    if (visual.stage >= 6) return 1.08;
    if (visual.stage >= 5) return 1.06;
    if (visual.stage >= 4) return 1.04;
    if (visual.stage >= 3) return 1.02;
  }

  if (visual.motif === "attendance") {
    if (visual.stage >= 5) return 1.06;
    if (visual.stage >= 3) return 1.03;
  }

  if (visual.motif === "win-streak") {
    if (visual.stage >= 5) return 1.06;
    if (visual.stage >= 3) return 1.03;
  }

  if (visual.motif === "loss-streak" && visual.stage >= 3) return 1.03;
  if (visual.family === "special") return 1.04;
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
          mode="emblem"
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
