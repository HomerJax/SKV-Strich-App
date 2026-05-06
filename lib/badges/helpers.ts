export type BadgeKey = "none" | "copper" | "bronze" | "silver" | "gold" | "goat";

export type BadgeMeta = {
  key: BadgeKey;
  label: string;
  shortLabel: string;
  minMvpCount: number;
};

const BADGE_TIERS: BadgeMeta[] = [
  {
    key: "none",
    label: "Noch kein Badge",
    shortLabel: "Kein Badge",
    minMvpCount: 0,
  },
  {
    key: "copper",
    label: "Blech",
    shortLabel: "Blech",
    minMvpCount: 1,
  },
  {
    key: "bronze",
    label: "Bronze",
    shortLabel: "Bronze",
    minMvpCount: 3,
  },
  {
    key: "silver",
    label: "Silber",
    shortLabel: "Silber",
    minMvpCount: 5,
  },
  {
    key: "gold",
    label: "Gold",
    shortLabel: "Gold",
    minMvpCount: 7,
  },
  {
    key: "goat",
    label: "GOAT",
    shortLabel: "GOAT",
    minMvpCount: 10,
  },
];

export function normalizeMvpCount(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export function getBadgeMetaFromMvpCount(
  value: number | null | undefined
): BadgeMeta {
  const mvpCount = normalizeMvpCount(value);

  if (mvpCount >= 10) return BADGE_TIERS[5];
  if (mvpCount >= 7) return BADGE_TIERS[4];
  if (mvpCount >= 5) return BADGE_TIERS[3];
  if (mvpCount >= 3) return BADGE_TIERS[2];
  if (mvpCount >= 1) return BADGE_TIERS[1];

  return BADGE_TIERS[0];
}

export function getNextBadgeMeta(
  value: number | null | undefined
): BadgeMeta | null {
  const mvpCount = normalizeMvpCount(value);

  for (const tier of BADGE_TIERS) {
    if (tier.minMvpCount > mvpCount) {
      return tier;
    }
  }

  return null;
}

export function getBadgeProgress(value: number | null | undefined) {
  const mvpCount = normalizeMvpCount(value);
  const current = getBadgeMetaFromMvpCount(mvpCount);
  const next = getNextBadgeMeta(mvpCount);

  if (!next) {
    return {
      current,
      next: null,
      currentCount: mvpCount,
      missing: 0,
      progressPercent: 100,
      progressLabel: `${current.label} erreicht`,
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
    progressLabel: `Noch ${missing} MVP bis ${next.label}`,
  };
}