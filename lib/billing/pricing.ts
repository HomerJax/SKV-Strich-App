export const INTRO_PRICING = {
  monthly: {
    cents: 499,
    label: "4,99 €",
    suffix: "/ Monat",
  },
  yearly: {
    cents: 4999,
    label: "49,99 €",
    suffix: "/ Jahr",
  },
  badge: "Einführungspreis",
  note: "Preis für frühe Teams zum Start von strikr PRO.",
} as const;

export function getAnnualSavingsPercent() {
  const monthlyYear = INTRO_PRICING.monthly.cents * 12;
  return Math.round((1 - INTRO_PRICING.yearly.cents / monthlyYear) * 100);
}
