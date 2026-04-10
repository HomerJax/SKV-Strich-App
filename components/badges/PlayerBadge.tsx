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
    wrapper: "border-amber-200 bg-amber-50 text-amber-900",
    iconWrap: "border-amber-200 bg-white text-amber-700",
    label: "text-amber-950",
    count: "text-amber-700",
    Icon: Sparkles,
  },
  bronze: {
    wrapper: "border-orange-200 bg-orange-50 text-orange-900",
    iconWrap: "border-orange-200 bg-white text-orange-700",
    label: "text-orange-950",
    count: "text-orange-700",
    Icon: Medal,
  },
  silver: {
    wrapper: "border-slate-300 bg-slate-100 text-slate-900",
    iconWrap: "border-slate-300 bg-white text-slate-700",
    label: "text-slate-950",
    count: "text-slate-600",
    Icon: Star,
  },
  gold: {
    wrapper: "border-yellow-200 bg-yellow-50 text-yellow-900",
    iconWrap: "border-yellow-200 bg-white text-yellow-700",
    label: "text-yellow-950",
    count: "text-yellow-700",
    Icon: Award,
  },
  goat: {
    wrapper: "border-violet-200 bg-violet-50 text-violet-950",
    iconWrap: "border-violet-200 bg-white text-violet-700",
    label: "text-violet-950",
    count: "text-violet-700",
    Icon: Crown,
  },
};

const SIZE_MAP = {
  sm: {
    wrapper: "gap-2 rounded-full px-2.5 py-1.5",
    iconWrap: "h-6 w-6",
    icon: "h-3.5 w-3.5",
    label: "text-xs font-semibold",
    count: "text-[11px]",
  },
  md: {
    wrapper: "gap-2.5 rounded-full px-3 py-2",
    iconWrap: "h-7 w-7",
    icon: "h-4 w-4",
    label: "text-sm font-semibold",
    count: "text-xs",
  },
  lg: {
    wrapper: "gap-3 rounded-2xl px-4 py-3",
    iconWrap: "h-9 w-9",
    icon: "h-5 w-5",
    label: "text-sm font-semibold",
    count: "text-sm",
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
  className,
}: PlayerBadgeProps) {
  const normalizedCount = normalizeMvpCount(mvpCount);
  const badge = getBadgeMetaFromMvpCount(normalizedCount);
  const theme = BADGE_THEME[badge.key];
  const sizing = SIZE_MAP[size];
  const Icon = theme.Icon;

  return (
    <div
      className={cn(
        "inline-flex items-center border shadow-sm",
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
            <div
              className={cn("mt-0.5 leading-none", theme.count, sizing.count)}
            >
              {normalizedCount} MVP
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}