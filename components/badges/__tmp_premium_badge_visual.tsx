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

function Aura({
  background,
  inset = "-18%",
  blur = 12,
  opacity = 0.5,
}: {
  background: string;
  inset?: string;
  blur?: number;
  opacity?: number;
}) {
  return (
    <span
      className="pointer-events-none absolute rounded-[40%]"
      style={{
        inset,
        background,
        filter: `blur(${blur}px)`,
        opacity,
      }}
      aria-hidden="true"
    />
  );
}

function Laurel({
  tone,
  strong = false,
}: {
  tone: "gold" | "silver" | "bronze" | "cyan" | "violet";
  strong?: boolean;
}) {
  const color = {
    gold: "rgba(253,230,138,.82)",
    silver: "rgba(241,245,249,.72)",
    bronze: "rgba(251,146,60,.64)",
    cyan: "rgba(165,243,252,.72)",
    violet: "rgba(221,214,254,.72)",
  }[tone];

  return (
    <>
      <span
        className="pointer-events-none absolute -left-[23%] top-[18%] h-[66%] w-[29%] rounded-l-full border-l-2 border-y-2"
        style={{
          borderColor: color,
          opacity: strong ? 0.88 : 0.58,
          boxShadow: `0 0 ${strong ? 14 : 8}px ${color}`,
          transform: "rotate(-8deg)",
        }}
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -right-[23%] top-[18%] h-[66%] w-[29%] rounded-r-full border-r-2 border-y-2"
        style={{
          borderColor: color,
          opacity: strong ? 0.88 : 0.58,
          boxShadow: `0 0 ${strong ? 14 : 8}px ${color}`,
          transform: "rotate(8deg)",
        }}
        aria-hidden="true"
      />
    </>
  );
}

function SpeedWings({ strong = false }: { strong?: boolean }) {
  return (
    <>
      <span className="pointer-events-none absolute -left-[35%] top-[31%] h-[3px] w-[42%] -rotate-6 rounded-full bg-cyan-100/70 shadow-[0_0_10px_rgba(34,211,238,.55)]" />
      <span className="pointer-events-none absolute -left-[30%] top-[48%] h-[2px] w-[34%] rotate-2 rounded-full bg-cyan-200/45" />
      <span className="pointer-events-none absolute -right-[35%] bottom-[31%] h-[3px] w-[42%] rotate-6 rounded-full bg-cyan-100/70 shadow-[0_0_10px_rgba(34,211,238,.55)]" />
      {strong ? (
        <span className="pointer-events-none absolute -right-[30%] bottom-[48%] h-[2px] w-[34%] -rotate-2 rounded-full bg-cyan-200/45" />
      ) : null}
    </>
  );
}

function TrophyHandles({ strong = false }: { strong?: boolean }) {
  return (
    <>
      <span
        className="pointer-events-none absolute -left-[25%] top-[27%] h-[47%] w-[30%] rounded-l-full border-l-[3px] border-y-[3px] border-amber-200/70"
        style={{ boxShadow: strong ? "0 0 12px rgba(251,191,36,.48)" : undefined }}
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -right-[25%] top-[27%] h-[47%] w-[30%] rounded-r-full border-r-[3px] border-y-[3px] border-amber-200/70"
        style={{ boxShadow: strong ? "0 0 12px rgba(251,191,36,.48)" : undefined }}
        aria-hidden="true"
      />
    </>
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
  const legendary = stage === 5;
  const goat = stage >= 6;

  return (
    <>
      <Aura
        inset={goat ? "-24%" : legendary ? "-21%" : stage >= 4 ? "-17%" : "-12%"}
        opacity={goat ? 0.82 : legendary ? 0.68 : stage >= 4 ? 0.48 : 0.28}
        background={
          goat
            ? "conic-gradient(from 20deg, rgba(34,211,238,.92), rgba(99,102,241,.74), rgba(217,70,239,.88), rgba(250,204,21,.78), rgba(34,211,238,.92))"
            : stage >= 4
              ? "radial-gradient(circle, rgba(250,204,21,.82), rgba(180,83,9,.20) 58%, transparent 76%)"
              : stage === 3
                ? "radial-gradient(circle, rgba(241,245,249,.62), transparent 72%)"
                : stage === 2
                  ? "radial-gradient(circle, rgba(251,146,60,.52), transparent 72%)"
                  : "radial-gradient(circle, rgba(148,163,184,.34), transparent 72%)"
        }
      />

      {stage >= 2 ? (
        <Laurel
          tone={goat ? "cyan" : stage >= 4 ? "gold" : stage === 3 ? "silver" : "bronze"}
          strong={stage >= 5}
        />
      ) : null}

      {stage >= 4 ? (
        <Crown
          className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 ${
            goat
              ? "-top-[40%] text-white drop-shadow-[0_0_10px_rgba(103,232,249,.75)]"
              : legendary
                ? "-top-[37%] text-amber-100 drop-shadow-[0_0_10px_rgba(250,204,21,.72)]"
                : "-top-[29%] text-amber-100/90 drop-shadow-[0_0_7px_rgba(250,204,21,.46)]"
          }`}
          size={Math.round(px * (goat ? 0.72 : legendary ? 0.62 : 0.46))}
          strokeWidth={stage >= 5 ? 2.2 : 2}
          aria-hidden="true"
        />
      ) : null}

      {stage >= 5 ? (
        <span className="pointer-events-none absolute -bottom-[18%] left-1/2 h-[3px] w-[74%] -translate-x-1/2 rounded-full bg-amber-100/70 shadow-[0_0_11px_rgba(250,204,21,.48)]" />
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
  const legend = stage >= 6;

  return (
    <>
      <Aura
        inset={legend ? "-23%" : stage >= 4 ? "-18%" : "-13%"}
        opacity={legend ? 0.7 : stage >= 4 ? 0.5 : 0.3}
        background="radial-gradient(circle, rgba(251,191,36,.86), rgba(180,83,9,.18) 58%, transparent 76%)"
      />

      <TrophyHandles strong={stage >= 5} />

      <Trophy
        className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 text-amber-100 drop-shadow-[0_0_9px_rgba(251,191,36,.62)] ${
          legend ? "-top-[39%]" : stage >= 4 ? "-top-[34%]" : "-top-[27%] opacity-80"
        }`}
        size={Math.round(px * (legend ? 0.72 : stage >= 4 ? 0.6 : 0.44))}
        strokeWidth={stage >= 4 ? 2.1 : 1.8}
        aria-hidden="true"
      />

      {stage >= 5 ? (
        <span className="pointer-events-none absolute -bottom-[17%] left-1/2 h-[3px] w-[68%] -translate-x-1/2 rounded-full bg-amber-100/70 shadow-[0_0_10px_rgba(251,191,36,.46)]" />
      ) : null}
    </>
  );
}

function AttendanceDecoration({ visual, px }: { visual: BadgeVisualMeta; px: number }) {
  if (px <= 24) return null;

  const stage = visual.stage;

  return (
    <>
      <Aura
        inset={stage >= 5 ? "-22%" : stage >= 3 ? "-17%" : "-12%"}
        opacity={stage >= 5 ? 0.6 : stage >= 3 ? 0.42 : 0.25}
        background="radial-gradient(circle, rgba(34,211,238,.78), rgba(14,116,144,.18) 58%, transparent 76%)"
      />
      <SpeedWings strong={stage >= 4} />
      {stage >= 3 ? (
        <Activity
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-cyan-100/26"
          size={Math.round(px * 1.38)}
          strokeWidth={1.3}
          aria-hidden="true"
        />
      ) : null}
      {stage >= 5 ? (
        <Zap
          className="pointer-events-none absolute -right-[24%] -top-[17%] z-0 text-cyan-100 drop-shadow-[0_0_8px_rgba(34,211,238,.7)]"
          size={Math.round(px * 0.4)}
          strokeWidth={2.1}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}

function WinStreakDecoration({ visual, px }: { visual: BadgeVisualMeta; px: number }) {
  if (px <= 24) return null;

  const stage = visual.stage;

  return (
    <>
      <Aura
        inset={stage >= 5 ? "-23%" : stage >= 3 ? "-18%" : "-12%"}
        opacity={stage >= 5 ? 0.62 : stage >= 3 ? 0.44 : 0.26}
        background="radial-gradient(circle, rgba(249,115,22,.86), rgba(180,83,9,.18) 58%, transparent 76%)"
      />
      <Flame
        className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 text-orange-100 drop-shadow-[0_0_12px_rgba(249,115,22,.58)] ${
          stage >= 4 ? "-bottom-[37%] opacity-85" : "-bottom-[29%] opacity-68"
        }`}
        size={Math.round(px * (stage >= 5 ? 1.36 : stage >= 3 ? 1.16 : 0.88))}
        strokeWidth={1.55}
        aria-hidden="true"
      />
      {stage >= 4 ? <Laurel tone="gold" strong={stage >= 5} /> : null}
    </>
  );
}

function LossDecoration({ visual, px }: { visual: BadgeVisualMeta; px: number }) {
  if (px <= 24) return null;

  const stage = visual.stage;

  return (
    <>
      <Aura
        inset={stage >= 3 ? "-22%" : "-15%"}
        opacity={stage >= 3 ? 0.72 : 0.48}
        background="radial-gradient(circle, rgba(15,23,42,.92), rgba(71,85,105,.28) 58%, transparent 76%)"
      />
      <CloudRain
        className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 text-slate-200 drop-shadow-[0_0_8px_rgba(15,23,42,.68)] ${
          stage >= 3 ? "-top-[38%] opacity-80" : "-top-[31%] opacity-62"
        }`}
        size={Math.round(px * (stage >= 3 ? 0.9 : 0.7))}
        strokeWidth={1.55}
        aria-hidden="true"
      />
    </>
  );
}

function SpecialDecoration({ visual, px }: { visual: BadgeVisualMeta; px: number }) {
  if (px <= 24) return null;

  if (visual.motif === "curse-broken") {
    return (
      <>
        <Aura background="radial-gradient(circle, rgba(250,204,21,.78), transparent 74%)" opacity={0.48} />
        <Link2Off
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] text-amber-100/34"
          size={Math.round(px * 1.4)}
          strokeWidth={1.6}
          aria-hidden="true"
        />
        <Laurel tone="gold" />
      </>
    );
  }

  if (visual.motif === "resilient") {
    return (
      <>
        <Aura background="radial-gradient(circle, rgba(56,189,248,.62), transparent 74%)" opacity={0.4} />
        <Shield
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-sky-100/32"
          size={Math.round(px * 1.42)}
          strokeWidth={1.55}
          aria-hidden="true"
        />
      </>
    );
  }

  if (visual.motif === "lucky") {
    return (
      <>
        <Aura background="radial-gradient(circle, rgba(52,211,153,.74), transparent 74%)" opacity={0.48} />
        <Laurel tone="gold" strong />
        <span className="pointer-events-none absolute -right-[21%] -top-[15%] z-0 text-[0.48em] font-black text-emerald-100 drop-shadow-[0_0_8px_rgba(52,211,153,.7)]">♣</span>
      </>
    );
  }

  if (visual.motif === "full-throttle") {
    return (
      <>
        <Aura
          background="linear-gradient(135deg, rgba(34,211,238,.72), rgba(250,204,21,.76))"
          opacity={0.52}
        />
        <SpeedWings strong />
        <Zap
          className="pointer-events-none absolute -right-[24%] -top-[19%] z-0 text-amber-100 drop-shadow-[0_0_9px_rgba(250,204,21,.72)]"
          size={Math.round(px * 0.48)}
          strokeWidth={2.1}
          aria-hidden="true"
        />
      </>
    );
  }

  return (
    <>
      <Aura background="radial-gradient(circle, rgba(168,85,247,.7), transparent 74%)" opacity={0.44} />
      <RotateCcw
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-violet-100/32"
        size={Math.round(px * 1.42)}
        strokeWidth={1.55}
        aria-hidden="true"
      />
      <Laurel tone="violet" />
    </>
  );
}

function BadgeDecoration({ visual, px }: { visual: BadgeVisualMeta; px: number }) {
  if (visual.motif === "career-appearances") return <AppearanceDecoration visual={visual} px={px} />;
  if (visual.motif === "career-wins") return <CareerWinsDecoration visual={visual} px={px} />;

  if (visual.motif === "kickoff") {
    return px <= 24 ? null : (
      <>
        <Aura background="radial-gradient(circle, rgba(34,211,238,.58), transparent 72%)" opacity={0.32} inset="-12%" />
        <span className="pointer-events-none absolute -bottom-[13%] left-1/2 h-[2px] w-[82%] -translate-x-1/2 rounded-full bg-cyan-100/55 shadow-[0_0_8px_rgba(34,211,238,.4)]" />
      </>
    );
  }

  if (visual.motif === "attendance") return <AttendanceDecoration visual={visual} px={px} />;
  if (visual.motif === "win-streak") return <WinStreakDecoration visual={visual} px={px} />;
  if (visual.motif === "loss-streak") return <LossDecoration visual={visual} px={px} />;
  return <SpecialDecoration visual={visual} px={px} />;
}

function BadgeForeground({ visual, px }: { visual: BadgeVisualMeta; px: number }) {
  if (px <= 24 || visual.motif !== "loss-streak" || visual.stage < 2) return null;

  return (
    <>
      <span className="pointer-events-none absolute right-[12%] top-[18%] z-20 h-[2px] w-[28%] rotate-[34deg] rounded-full bg-white/35" />
      <span className="pointer-events-none absolute right-[18%] top-[33%] z-20 h-[2px] w-[20%] -rotate-[22deg] rounded-full bg-slate-950/45" />
      {visual.stage >= 3 ? (
        <span className="pointer-events-none absolute left-[14%] bottom-[24%] z-20 h-[2px] w-[26%] -rotate-[38deg] rounded-full bg-slate-950/42" />
      ) : null}
    </>
  );
}

export default function AchievementBadgeVisual({
  badgeKey,
  size = "xl",
  grayscale = false,
  className = "",
}: AchievementBadgeVisualProps) {
  const visual = getBadgeVisualMeta(badgeKey);
  const px = SIZE[size];

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
      <span className="relative z-10 inline-flex h-full w-full items-center justify-center">
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
      <BadgeForeground visual={visual} px={px} />
    </span>
  );
}
