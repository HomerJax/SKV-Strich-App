import type { AppLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";

export type BadgeKey = "none" | "copper" | "bronze" | "silver" | "gold" | "goat";

export type BadgeMeta = {
  key: BadgeKey;
  label: string;
  shortLabel: string;
  minMvpCount: number;
};

const BADGE_TIERS: Array<Pick<BadgeMeta, "key" | "minMvpCount">> = [
  { key: "none", minMvpCount: 0 },
  { key: "copper", minMvpCount: 1 },
  { key: "bronze", minMvpCount: 3 },
  { key: "silver", minMvpCount: 5 },
  { key: "gold", minMvpCount: 7 },
  { key: "goat", minMvpCount: 10 },
];

function localizeBadgeMeta(
  tier: Pick<BadgeMeta, "key" | "minMvpCount">,
  locale: AppLocale,
): BadgeMeta {
  const keyMap = {
    none: "badge.none",
    copper: "badge.copper",
    bronze: "badge.bronze",
    silver: "badge.silver",
    gold: "badge.gold",
    goat: "badge.goat",
  } as const;
  const shortKey = tier.key === "none" ? "badge.noneShort" : keyMap[tier.key];
  return {
    ...tier,
    label: translate(locale, keyMap[tier.key]),
    shortLabel: translate(locale, shortKey),
  };
}

export function normalizeMvpCount(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export function getBadgeMetaFromMvpCount(
  value: number | null | undefined,
  locale: AppLocale = "de",
): BadgeMeta {
  const mvpCount = normalizeMvpCount(value);

  if (mvpCount >= 10) return localizeBadgeMeta(BADGE_TIERS[5], locale);
  if (mvpCount >= 7) return localizeBadgeMeta(BADGE_TIERS[4], locale);
  if (mvpCount >= 5) return localizeBadgeMeta(BADGE_TIERS[3], locale);
  if (mvpCount >= 3) return localizeBadgeMeta(BADGE_TIERS[2], locale);
  if (mvpCount >= 1) return localizeBadgeMeta(BADGE_TIERS[1], locale);

  return localizeBadgeMeta(BADGE_TIERS[0], locale);
}

export function getNextBadgeMeta(
  value: number | null | undefined,
  locale: AppLocale = "de",
): BadgeMeta | null {
  const mvpCount = normalizeMvpCount(value);

  for (const tier of BADGE_TIERS) {
    if (tier.minMvpCount > mvpCount) {
      return localizeBadgeMeta(tier, locale);
    }
  }

  return null;
}

export function getBadgeProgress(
  value: number | null | undefined,
  locale: AppLocale = "de",
) {
  const mvpCount = normalizeMvpCount(value);
  const current = getBadgeMetaFromMvpCount(mvpCount, locale);
  const next = getNextBadgeMeta(mvpCount, locale);

  if (!next) {
    return {
      current,
      next: null,
      currentCount: mvpCount,
      missing: 0,
      progressPercent: 100,
      progressLabel: translate(locale, "badge.reached", { badge: current.label }),
    };
  }

  const lowerBound = current.minMvpCount;
  const upperBound = next.minMvpCount;
  const range = Math.max(1, upperBound - lowerBound);
  const progressInRange = Math.max(0, mvpCount - lowerBound);
  const progressPercent = Math.min(
    100,
    Math.round((progressInRange / range) * 100)
  );
  const missing = Math.max(0, upperBound - mvpCount);

  return {
    current,
    next,
    currentCount: mvpCount,
    missing,
    progressPercent,
    progressLabel: translate(locale, "badge.untilNext", {
      count: missing,
      badge: next.label,
    }),
  };
}