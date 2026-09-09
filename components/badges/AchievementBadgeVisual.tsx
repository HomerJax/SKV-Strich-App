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
            ? "inset-[-26%] blur-[13px] opacity-85"
            : isLegendary
              ? "inset-[-20%] blur-[11px] opacity-72"
              : visual.stage >= 4
                ? "inset-[-14%] blur-[9px] opacity-54"
                : "inset-[-10%] blur-[8px] opacity-32"
        }`}
        style={{
          background: isGoat
            ? "conic-gradient(from 12deg, rgba(34,211,238,.9), rgba(99,102,241,.9), rgba(217,70,239,.95), rgba(244,114,182,.9), rgba(250,204,21,.86), rgba(34,211,238,.9))"
            : isLegendary
              ? "radial-gradient(circle, rgba(250,204,21,.82), rgba(180,83,9,.28) 58%, transparent 74%)"
              : visual.stage >= 4
                ? "radial-gradient(circle, rgba(251,191,36,.58), rgba(120,53,15,.18) 60%, transparent 74%)"
                : "radial-gradient(circle, rgba(203,213,225,.36), transparent 70%)",
        }}
        aria-hidden="true"
      />

      {!isTiny ? (
        <Shield
          className={`pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 ${
            isGoat
              ? "text-cyan-100/40"
              : visual.stage >= 4
                ? "text-amber-100/42"
                : "text-slate-100/28"
          }`}
          size={Math.round(px * (isLegendary ? 1.46 : visual.stage >= 3 ? 1.34 : 1.22))}
          strokeWidth={isLegendary ? 1.5 : 1.25}
          aria-hidden="true"
        />
      ) : null}

      {visual.stage >= 2 && !isTiny ? (
        <>
          <span
            className={`pointer-events-none absolute -left-[19%] top-[10%] z-0 h-[82%] w-[33%] skew-y-[-13deg] rounded-l-[48%] border-l-2 border-y ${
              isGoat
                ? "border-fuchsia-100/38"
                : visual.stage >= 4
                  ? "border-amber-100/42"
                  : "border-slate-100/26"
            }`}
          />
          <span
            className={`pointer-events-none absolute -right-[19%] top-[10%] z-0 h-[82%] w-[33%] skew-y-[13deg] rounded-r-[48%] border-r-2 border-y ${
              isGoat
                ? "border-cyan-100/38"
                : visual.stage >= 4
                  ? "border-amber-100/42"
                  : "border-slate-100/26"
            }`}
          />
        </>
      ) : null}

      {visual.stage >= 3 && !isTiny ? (
        <>
          <Star
            className={`pointer-events-none absolute -top-[19%] left-1/2 z-0 -translate-x-1/2 ${
              visual.stage >= 4 ? "fill-amber-200/30 text-amber-100/78" : "fill-slate-200/20 text-slate-100/55"
            }`}
            size={Math.round(px * 0.28)}
            strokeWidth={1.7}
            aria-hidden="true"
          />
          <span className="pointer-events-none absolute -bottom-[14%] left-1/2 z-0 h-px w-[82%] -translate-x-1/2 bg-white/24 shadow-[0_0_10px_rgba(255,255,255,.18)]" />
        </>
      ) : null}

      {isLegendary && !isGoat && !isTiny ? (
        <>
          <span className="pointer-events-none absolute inset-[-15%] rounded-[30%] border border-amber-200/72 shadow-[0_0_20px_rgba(250,204,21,.38),0_0_34px_rgba(245,158,11,.18)]" />
          <Crown
            className="pointer-events-none absolute -top-[29%] left-1/2 z-0 -translate-x-1/2 text-amber-100/94 drop-shadow-[0_0_9px_rgba(250,204,21,.72)]"
            size={Math.round(px * 0.5)}
            strokeWidth={1.9}
            aria-hidden="true"
          />
          <Sparkles
            className="pointer-events-none absolute -right-[23%] top-[4%] z-0 text-amber-100/70"
            size={Math.round(px * 0.28)}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </>
      ) : null}

      {isGoat && !isTiny ? (
        <>
          <span className="pointer-events-none absolute inset-[-18%] rounded-[31%] border border-fuchsia-100/75 shadow-[0_0_18px_rgba(34,211,238,.42),0_0_34px_rgba(217,70,239,.34),0_0_48px_rgba(250,204,21,.16)]" />
          <Crown
            className="pointer-events-none absolute -top-[35%] left-1/2 z-0 -translate-x-1/2 text-fuchsia-100/96 drop-shadow-[0_0_10px_rgba(232,121,249,.9)]"
            size={Math.round(px * 0.64)}
            strokeWidth={2}
            aria-hidden="true"
          />
          <Sparkles
            className="pointer-events-none absolute -right-[29%] top-[18%] z-0 text-cyan-100/95 drop-shadow-[0_0_8px_rgba(103,232,249,.85)]"
            size={Math.round(px * 0.38)}
            strokeWidth={1.9}
            aria-hidden="true"
          />
          <Sparkles
            className="pointer-events-none absolute -bottom-[24%] -left-[24%] z-0 text-amber-100/88 drop-shadow-[0_0_8px_rgba(253,230,138,.72)]"
            size={Math.round(px * 0.32)}
            strokeWidth={1.9}
            aria-hidden="true"
          />
        </>
      ) : null}
    </>
  );
}

function Crowd({ stage, px }: { stage: number; px: number }) {
  if (px <= 24) return null;
  const people = stage >= 5 ? 9 : stage >= 3 ? 7 : stage >= 2 ? 5 : 3;

  return (
    <span
      className={`pointer-events-none absolute -bottom-[19%] left-1/2 z-0 flex h-[58%] w-[150%] -translate-x-1/2 items-end justify-center gap-[2.5%] ${
        stage >= 4 ? "opacity-72" : "opacity-50"
      }`}
      aria-hidden="true"
    >
      {Array.from({ length: people }).map((_, index) => {
        const centerDistance = Math.abs(index - (people - 1) / 2);
        const height = 68 - centerDistance * 5 + (index % 2 === 0 ? 7 : 0);
        return (
          <span
            key={index}
            className="relative block w-[8.5%] rounded-t-full bg-amber-100/90 shadow-[0_0_9px_rgba(253,230,138,.28)]"
            style={{ height: `${Math.max(38, height)}%` }}
          >
            <span className="absolute left-1/2 top-[-26%] aspect-square w-[78%] -translate-x-1/2 rounded-full bg-amber-50/95" />
            <span className="absolute -left-[55%] top-[8%] h-[15%] w-[84%] rotate-[-36deg] rounded-full bg-amber-100/85" />
            <span className="absolute -right-[55%] top-[8%] h-[15%] w-[84%] rotate-[36deg] rounded-full bg-amber-100/85" />
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
        className={`pointer-events-none absolute rounded-full blur-[11px] ${
          visual.stage >= 5
            ? "inset-[-24%] bg-amber-300/42"
            : visual.stage >= 3
              ? "inset-[-17%] bg-amber-300/28"
              : "inset-[-11%] bg-amber-300/18"
        }`}
        aria-hidden="true"
      />
      <Crowd stage={visual.stage} px={px} />

      {!isTiny ? (
        <Trophy
          className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 text-amber-100 drop-shadow-[0_0_8px_rgba(251,191,36,.55)] ${
            visual.stage >= 4 ? "-top-[35%] opacity-85" : "-top-[27%] opacity-66"
          }`}
          size={Math.round(px * (visual.stage >= 5 ? 0.72 : visual.stage >= 3 ? 0.58 : 0.44))}
          strokeWidth={visual.stage >= 4 ? 1.9 : 1.6}
          aria-hidden="true"
        />
      ) : null}

      {visual.stage >= 2 && !isTiny ? (
        <>
          <span className="pointer-events-none absolute -left-[24%] bottom-[-4%] z-0 h-[48%] w-[20%] rotate-[18deg] rounded-full border-l-2 border-amber-100/56" />
          <span className="pointer-events-none absolute -right-[24%] bottom-[-4%] z-0 h-[48%] w-[20%] rotate-[-18deg] rounded-full border-r-2 border-amber-100/56" />
        </>
      ) : null}

      {visual.stage >= 3 && !isTiny ? (
        <>
          <span className="pointer-events-none absolute -left-[25%] top-[12%] z-0 h-[7%] w-[29%] rotate-[-28deg] rounded-full bg-amber-200/60 shadow-[0_0_8px_rgba(251,191,36,.28)]" />
          <span className="pointer-events-none absolute -right-[25%] top-[14%] z-0 h-[7%] w-[29%] rotate-[28deg] rounded-full bg-amber-200/60 shadow-[0_0_8px_rgba(251,191,36,.28)]" />
        </>
      ) : null}

      {visual.stage >= 4 && !isTiny ? (
        <>
          <Star className="pointer-events-none absolute -left-[25%] -top-[9%] z-0 fill-amber-200/38 text-amber-100/90" size={Math.round(px * 0.3)} strokeWidth={1.7} />
          <Star className="pointer-events-none absolute -right-[25%] top-[2%] z-0 fill-amber-200/28 text-amber-100/78" size={Math.round(px * 0.24)} strokeWidth={1.7} />
        </>
      ) : null}

      {visual.stage >= 5 && !isTiny ? (
        <Crown
          className="pointer-events-none absolute -top-[38%] left-1/2 z-0 -translate-x-1/2 text-amber-100/94 drop-shadow-[0_0_10px_rgba(251,191,36,.75)]"
          size={Math.round(px * (visual.stage >= 6 ? 0.58 : 0.48))}
          strokeWidth={2}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}

function RunnerMark({ px, stage }: { px: number; stage: number }) {
  if (px <= 24) return null;
  return (
    <svg
      className="pointer-events-none absolute -top-[36%] left-1/2 z-0 -translate-x-1/2 text-cyan-100 drop-shadow-[0_0_8px_rgba(34,211,238,.7)]"
      width={Math.round(px * (stage >= 5 ? 0.82 : 0.68))}
      height={Math.round(px * (stage >= 5 ? 0.82 : 0.68))}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="39" cy="10" r="5" fill="currentColor" opacity="0.9" />
      <path d="M34 18 24 28l10 8 8-10 9 5" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m33 35-9 15M36 36l14 10M24 28l-11 2" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
        className={`pointer-events-none absolute rounded-full blur-[11px] ${
          visual.stage >= 5
            ? "inset-[-28%] bg-cyan-300/38"
            : visual.stage >= 3
              ? "inset-[-20%] bg-cyan-300/28"
              : "inset-[-13%] bg-cyan-300/18"
        }`}
        aria-hidden="true"
      />

      {!isTiny ? (
        <>
          <RunnerMark px={px} stage={visual.stage} />
          <Activity
            className={`pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 ${
              visual.stage >= 4 ? "text-cyan-100/46" : "text-cyan-100/30"
            }`}
            size={Math.round(px * (visual.stage >= 4 ? 1.48 : 1.34))}
            strokeWidth={1.35}
            aria-hidden="true"
          />
          <Footprints
            className="pointer-events-none absolute -right-[27%] bottom-[-24%] z-0 rotate-[-18deg] text-sky-100/58 drop-shadow-[0_0_6px_rgba(125,211,252,.4)]"
            size={Math.round(px * (visual.stage >= 4 ? 0.68 : 0.54))}
            strokeWidth={1.6}
            aria-hidden="true"
          />
        </>
      ) : null}

      {visual.stage >= 2 ? (
        <>
          <span className="pointer-events-none absolute -left-[32%] top-[25%] z-0 h-px w-[49%] bg-cyan-100/62 shadow-[0_0_8px_rgba(34,211,238,.4)]" />
          <span className="pointer-events-none absolute -left-[38%] top-[44%] z-0 h-px w-[58%] bg-cyan-100/44" />
          <span className="pointer-events-none absolute -left-[28%] top-[63%] z-0 h-px w-[43%] bg-cyan-100/30" />
        </>
      ) : null}

      {visual.stage >= 3 ? (
        <span className="pointer-events-none absolute inset-[-10%] rounded-full border border-cyan-100/42 shadow-[0_0_18px_rgba(34,211,238,.28)]" />
      ) : null}

      {visual.stage >= 4 && !isTiny ? (
        <>
          <span className="pointer-events-none absolute -right-[28%] top-[23%] z-0 h-[8%] w-[35%] -rotate-[28deg] rounded-full bg-cyan-100/65 shadow-[0_0_8px_rgba(34,211,238,.38)]" />
          <span className="pointer-events-none absolute -right-[24%] top-[42%] z-0 h-[6%] w-[28%] -rotate-[28deg] rounded-full bg-sky-100/44" />
        </>
      ) : null}

      {visual.stage >= 5 && !isTiny ? (
        <>
          <Sparkles className="pointer-events-none absolute -right-[24%] -top-[17%] z-0 text-cyan-100/90" size={Math.round(px * 0.34)} strokeWidth={1.8} />
          <Zap className="pointer-events-none absolute -left-[28%] -bottom-[22%] z-0 text-sky-100/72" size={Math.round(px * 0.34)} strokeWidth={1.8} />
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
        className={`pointer-events-none absolute rounded-full blur-[11px] ${
          visual.stage >= 5
            ? "inset-[-25%] bg-orange-400/46"
            : visual.stage >= 3
              ? "inset-[-18%] bg-orange-400/34"
              : "inset-[-12%] bg-orange-300/22"
        }`}
        aria-hidden="true"
      />
      <Flame
        className={`pointer-events-none absolute -bottom-[28%] left-1/2 z-0 -translate-x-1/2 text-orange-100 drop-shadow-[0_0_10px_rgba(251,146,60,.55)] ${
          visual.stage >= 3 ? "opacity-72" : "opacity-42"
        }`}
        size={Math.round(px * (visual.stage >= 5 ? 1.46 : visual.stage >= 3 ? 1.24 : 0.92))}
        strokeWidth={1.45}
        aria-hidden="true"
      />
      <Zap
        className="pointer-events-none absolute -right-[28%] top-[7%] z-0 text-amber-100/85 drop-shadow-[0_0_7px_rgba(251,191,36,.55)]"
        size={Math.round(px * (visual.stage >= 4 ? 0.54 : 0.42))}
        strokeWidth={1.9}
        aria-hidden="true"
      />
      {visual.stage >= 3 ? (
        <span className="pointer-events-none absolute inset-[-11%] rounded-full border border-orange-100/38 shadow-[0_0_18px_rgba(251,146,60,.3)]" />
      ) : null}
      {visual.stage >= 4 ? (
        <Crown
          className="pointer-events-none absolute -top-[30%] left-1/2 z-0 -translate-x-1/2 text-amber-100/82 drop-shadow-[0_0_8px_rgba(251,191,36,.6)]"
          size={Math.round(px * 0.5)}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      ) : null}
      {visual.stage >= 5 ? (
        <>
          <Sparkles className="pointer-events-none absolute -left-[26%] top-[3%] z-0 text-orange-100/80" size={Math.round(px * 0.28)} strokeWidth={1.8} />
          <Star className="pointer-events-none absolute -right-[23%] -bottom-[15%] z-0 fill-amber-100/25 text-amber-100/72" size={Math.round(px * 0.26)} strokeWidth={1.7} />
        </>
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
        className={`pointer-events-none absolute rounded-full blur-[12px] ${
          visual.stage >= 3
            ? "inset-[-26%] bg-slate-950/78"
            : visual.stage >= 2
              ? "inset-[-20%] bg-slate-800/58"
              : "inset-[-15%] bg-slate-700/38"
        }`}
        aria-hidden="true"
      />
      <CloudRain
        className={`pointer-events-none absolute left-1/2 z-0 -translate-x-1/2 text-slate-200 drop-shadow-[0_0_8px_rgba(148,163,184,.32)] ${
          visual.stage >= 3 ? "-top-[39%] opacity-74" : "-top-[29%] opacity-56"
        }`}
        size={Math.round(px * (visual.stage >= 3 ? 1.2 : visual.stage >= 2 ? 0.94 : 0.72))}
        strokeWidth={1.35}
        aria-hidden="true"
      />
      <Feather
        className="pointer-events-none absolute -bottom-[29%] -left-[27%] z-0 rotate-[-28deg] text-slate-300/72"
        size={Math.round(px * (visual.stage >= 2 ? 0.66 : 0.5))}
        strokeWidth={1.55}
        aria-hidden="true"
      />

      <span className="pointer-events-none absolute -right-[23%] bottom-[-19%] z-0 h-[18%] w-[42%] rotate-[-8deg] rounded-[48%] border-b-2 border-slate-300/34" />
      <span className="pointer-events-none absolute -left-[18%] top-[14%] z-0 h-[22%] w-[22%] rotate-[24deg] border-l border-t border-slate-300/22" />

      {visual.stage >= 2 ? (
        <>
          <span className="pointer-events-none absolute -right-[25%] top-[25%] z-0 h-[3px] w-[24%] rotate-[28deg] rounded-full bg-rose-200/34" />
          <span className="pointer-events-none absolute -right-[20%] top-[43%] z-0 h-[3px] w-[18%] rotate-[-18deg] rounded-full bg-rose-200/24" />
          <span className="pointer-events-none absolute -left-[25%] top-[60%] z-0 h-[3px] w-[20%] rotate-[-24deg] rounded-full bg-slate-200/26" />
        </>
      ) : null}

      {visual.stage >= 3 ? (
        <>
          <Crown
            className="pointer-events-none absolute -top-[31%] -right-[14%] z-0 rotate-[18deg] text-amber-100/70 drop-shadow-[0_0_8px_rgba(251,191,36,.32)]"
            size={Math.round(px * 0.42)}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <span className="pointer-events-none absolute inset-[-13%] rounded-[34%] border border-slate-300/24 shadow-[0_0_20px_rgba(15,23,42,.7)]" />
        </>
      ) : null}
    </>
  );
}

function CloverMark({ px }: { px: number }) {
  return (
    <span className="pointer-events-none absolute -right-[28%] -top-[20%] z-0 h-[44%] w-[44%] rotate-[12deg]" aria-hidden="true">
      <span className="absolute left-[30%] top-0 h-[40%] w-[40%] rounded-full bg-emerald-300/78 shadow-[0_0_8px_rgba(52,211,153,.55)]" />
      <span className="absolute left-0 top-[30%] h-[40%] w-[40%] rounded-full bg-emerald-300/78 shadow-[0_0_8px_rgba(52,211,153,.55)]" />
      <span className="absolute right-0 top-[30%] h-[40%] w-[40%] rounded-full bg-emerald-300/78 shadow-[0_0_8px_rgba(52,211,153,.55)]" />
      <span className="absolute bottom-0 left-[30%] h-[40%] w-[40%] rounded-full bg-emerald-300/78 shadow-[0_0_8px_rgba(52,211,153,.55)]" />
      <span className="absolute bottom-[-25%] left-[45%] h-[36%] w-[9%] rotate-[-18deg] rounded-full bg-emerald-200/72" style={{ minWidth: px > 36 ? 2 : 1 }} />
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
        <span className="pointer-events-none absolute inset-[-27%] rounded-full bg-amber-400/34 blur-[12px]" />
        <span className="pointer-events-none absolute inset-[-13%] rotate-[8deg] rounded-[36%] border border-amber-100/44 shadow-[0_0_20px_rgba(245,158,11,.34)]" />
        <Link2Off
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] text-amber-100/72 drop-shadow-[0_0_8px_rgba(251,191,36,.6)]"
          size={Math.round(px * 1.48)}
          strokeWidth={1.65}
          aria-hidden="true"
        />
        <Sparkles className="pointer-events-none absolute -right-[27%] -top-[22%] z-0 text-amber-100/92" size={Math.round(px * 0.44)} strokeWidth={1.9} />
        <Zap className="pointer-events-none absolute -left-[27%] -bottom-[22%] z-0 text-orange-100/72" size={Math.round(px * 0.36)} strokeWidth={1.9} />
      </>
    );
  }

  if (visual.motif === "resilient") {
    return (
      <>
        <span className="pointer-events-none absolute inset-[-24%] rounded-full bg-sky-400/28 blur-[12px]" />
        <Shield
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-sky-100/54 drop-shadow-[0_0_8px_rgba(125,211,252,.45)]"
          size={Math.round(px * 1.48)}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <CloudRain
          className="pointer-events-none absolute -right-[27%] -top-[27%] z-0 text-slate-200/62"
          size={Math.round(px * 0.64)}
          strokeWidth={1.55}
          aria-hidden="true"
        />
        <Zap className="pointer-events-none absolute -left-[23%] top-[5%] z-0 text-cyan-100/78" size={Math.round(px * 0.36)} strokeWidth={1.8} />
        <span className="pointer-events-none absolute inset-[-12%] rounded-[32%] border border-sky-100/34 shadow-[0_0_18px_rgba(56,189,248,.28)]" />
      </>
    );
  }

  if (visual.motif === "lucky") {
    return (
      <>
        <span className="pointer-events-none absolute inset-[-28%] rounded-full bg-emerald-400/40 blur-[13px]" />
        <span className="pointer-events-none absolute inset-[-15%] rounded-[35%] border border-emerald-100/52 shadow-[0_0_18px_rgba(52,211,153,.34),0_0_30px_rgba(250,204,21,.16)]" />
        <CloverMark px={px} />
        <Sparkles className="pointer-events-none absolute -left-[25%] -top-[21%] z-0 text-amber-100/94" size={Math.round(px * 0.42)} strokeWidth={1.9} />
        <Sparkles className="pointer-events-none absolute -right-[21%] bottom-[-24%] z-0 text-emerald-100/88" size={Math.round(px * 0.34)} strokeWidth={1.8} />
      </>
    );
  }

  return (
    <>
      <span className="pointer-events-none absolute inset-[-29%] rounded-full bg-fuchsia-500/36 blur-[13px]" />
      <span className="pointer-events-none absolute inset-[-14%] rounded-[35%] border border-fuchsia-100/46 shadow-[0_0_20px_rgba(217,70,239,.36),0_0_34px_rgba(139,92,246,.25)]" />
      <RotateCcw
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-violet-100/62 drop-shadow-[0_0_8px_rgba(196,181,253,.52)]"
        size={Math.round(px * 1.5)}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span className="pointer-events-none absolute -left-[30%] top-[9%] z-0 h-[71%] w-[29%] rotate-[-12deg] rounded-[50%] border-l-2 border-violet-100/48" />
      <span className="pointer-events-none absolute -right-[30%] top-[9%] z-0 h-[71%] w-[29%] rotate-[12deg] rounded-[50%] border-r-2 border-fuchsia-100/48" />
      <Sparkles className="pointer-events-none absolute -right-[27%] -top-[23%] z-0 text-fuchsia-100/92" size={Math.round(px * 0.42)} strokeWidth={1.9} />
      <Zap className="pointer-events-none absolute -left-[25%] -bottom-[23%] z-0 text-violet-100/76" size={Math.round(px * 0.36)} strokeWidth={1.8} />
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
        <span className="pointer-events-none absolute inset-[-15%] rounded-full bg-cyan-300/20 blur-[9px]" />
        <span className="pointer-events-none absolute -bottom-[17%] left-1/2 z-0 h-px w-[120%] -translate-x-1/2 bg-cyan-100/38 shadow-[0_0_8px_rgba(34,211,238,.35)]" />
        <Footprints className="pointer-events-none absolute -right-[20%] -top-[18%] z-0 rotate-[-22deg] text-cyan-100/56" size={Math.round(px * 0.52)} strokeWidth={1.6} />
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
    if (visual.stage >= 6) return 1.13;
    if (visual.stage >= 5) return 1.1;
    if (visual.stage >= 4) return 1.05;
  }

  if (visual.motif === "career-wins") {
    if (visual.stage >= 6) return 1.11;
    if (visual.stage >= 5) return 1.08;
    if (visual.stage >= 3) return 1.04;
  }

  if (visual.motif === "attendance") {
    if (visual.stage >= 5) return 1.08;
    if (visual.stage >= 3) return 1.04;
  }

  if (visual.motif === "win-streak" && visual.stage >= 4) return 1.06;
  if (visual.motif === "loss-streak" && visual.stage >= 3) return 1.05;
  if (visual.family === "special") return 1.06;
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
