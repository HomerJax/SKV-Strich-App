import {
  Award,
  Crown,
  Medal,
  Shield,
  Sparkles,
  Star,
} from "lucide-react";
import {
  BadgeKey,
  getBadgeMetaFromMvpCount,
  normalizeMvpCount,
} from "@/lib/badges/helpers";

type PlayerBadgeProps = {
  mvpCount: number | null | undefined;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showCount?: boolean;
  hideIfNone?: boolean;
  iconOnly?: boolean;
  className?: string;
};

type BadgeTheme = {
  wrapper: string;
  iconWrap: string;
  label: string;
  count: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const BADGE_THEME: Record<BadgeKey, BadgeTheme> = {
  none: {
    wrapper: "border-slate-200 bg-slate-50 text-slate-700",
    iconWrap: "border-slate-200 bg-white text-slate-500",
    label: "text-slate-700",
    count: "text-slate-500",
    Icon: Shield,
  },
  copper: {
    wrapper:
      "border-amber-300/70 bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 text-amber-950 shadow-[0_4px_18px_rgba(245,158,11,0.18)]",
    iconWrap:
      "border-amber-200 bg-white/80 text-amber-700",
    label: "text-amber-950",
    count: "text-amber-700",
    Icon: Sparkles,
  },
  bronze: {
    wrapper:
      "border-orange-300/70 bg-gradient-to-br from-orange-100 via-rose-50 to-orange-200 text-orange-950 shadow-[0_4px_18px_rgba(234,88,12,0.16)]",
    iconWrap:
      "border-orange-200 bg-white/80 text-orange-700",
    label: "text-orange-950",
    count: "text-orange-700",
    Icon: Medal,
  },
  silver: {
    wrapper:
      "border-slate-300/80 bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-950 shadow-[0_4px_18px_rgba(100,116,139,0.14)]",
    iconWrap:
      "border-slate-300 bg-white/90 text-slate-700",
    label: "text-slate-950",
    count: "text-slate-600",
    Icon: Star,
  },
  gold: {
    wrapper:
      "border-yellow-300/80 bg-gradient-to-br from-yellow-100 via-amber-50 to-yellow-200 text-yellow-950 shadow-[0_4px_20px_rgba(234,179,8,0.2)]",
    iconWrap:
      "border-yellow-200 bg-white/80 text-yellow-700",
    label: "text-yellow-950",
    count: "text-yellow-700",
    Icon: Award,
  },
  goat: {
    wrapper:
      "border-violet-300/80 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-violet-200 text-violet-950 shadow-[0_4px_22px_rgba(139,92,246,0.22)]",
    iconWrap:
      "border-violet-200 bg-white/80 text-violet-700",
    label: "text-violet-950",
    count: "text-violet-700",
    Icon: Crown,
  },
};

const SIZE_MAP = {
  sm: {
    wrapper: "gap-2 rounded-full px-2 py-1",
    iconWrap: "h-5 w-5",
    icon: "h-3 w-3",
    label: "text-[11px] font-semibold",
    count: "text-[10px]",
    iconOnlyWrap: "rounded-full p-1.5",
  },
  md: {
    wrapper: "gap-2.5 rounded-full px-3 py-1.5",
    iconWrap: "h-6 w-6",
    icon: "h-3.5 w-3.5",
    label: "text-xs font-semibold",
    count: "text-[11px]",
    iconOnlyWrap: "rounded-full p-2",
  },
  lg: {
    wrapper: "gap-3 rounded-2xl px-4 py-3",
    iconWrap: "h-9 w-9",
    icon: "h-5 w-5",
    label: "text-sm font-semibold",
    count: "text-sm",
    iconOnlyWrap: "rounded-2xl p-2.5",
  },
} as const;

function cn(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(" ");
}

export default function PlayerBadge({
  mvpCount,
  size = "md",
  showLabel = true,
  showCount = true,
  hideIfNone = false,
  iconOnly = false,
  className,
}: PlayerBadgeProps) {
  const normalizedCount = normalizeMvpCount(mvpCount);
  const badge = getBadgeMetaFromMvpCount(normalizedCount);

  if (hideIfNone && badge.key === "none") {
    return null;
  }

  const theme = BADGE_THEME[badge.key];
  const sizing = SIZE_MAP[size];
  const Icon = theme.Icon;

  if (iconOnly) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center border backdrop-blur-sm",
          theme.wrapper,
          sizing.iconOnlyWrap,
          className
        )}
        aria-label={`${badge.label} Badge`}
        title={badge.label}
      >
        <Icon className={cn(theme.label, sizing.icon)} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center border backdrop-blur-sm",
        theme.wrapper,
        sizing.wrapper,
        className
      )}
      aria-label={`${badge.label} Badge mit ${normalizedCount} MVP`}
      title={`${badge.label} · ${normalizedCount} MVP`}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full border",
          theme.iconWrap,
          sizing.iconWrap
        )}
      >
        <Icon className={sizing.icon} />
      </div>

      {(showLabel || showCount) && (
        <div className="min-w-0">
          {showLabel ? (
            <div className={cn("leading-none", theme.label, sizing.label)}>
              {badge.shortLabel}
            </div>
          ) : null}

          {showCount ? (
            <div className={cn("mt-0.5 leading-none", theme.count, sizing.count)}>
              {normalizedCount} MVP
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}