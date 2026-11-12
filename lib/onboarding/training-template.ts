/**
 * Date-only helpers for the shared real/QA club onboarding.
 * Use UTC noon to avoid DST shifts while moving by calendar days.
 */
export type OnboardingSeasonRange = { start_date: string | null; end_date: string | null };

function dateAtUtcNoon(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function addCalendarDays(iso: string, days: number): string {
  const date = dateAtUtcNoon(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getQaSeasonRange(today = new Date().toISOString().slice(0, 10)) {
  return { start_date: today, end_date: addCalendarDays(today, 364) };
}

/** Find the first desired weekday from the actual season start (inclusive). */
export function firstWeekdayOnOrAfter(date: string, weekday: number): string {
  const base = dateAtUtcNoon(date);
  const offset = (weekday - base.getUTCDay() + 7) % 7;
  return addCalendarDays(date, offset);
}

export function getWeeklyTrainingTemplate(season: OnboardingSeasonRange, weekday = 4) {
  if (!season.start_date) return { weekday, firstDate: "", lastDate: "", startTime: "19:00" };
  const firstDate = firstWeekdayOnOrAfter(season.start_date, weekday);
  if (season.end_date && firstDate > season.end_date) {
    return { weekday, firstDate: "", lastDate: "", startTime: "19:00" };
  }
  // The existing server workflow allows at most 52 weekly sessions per series.
  const fiftySecondWeek = addCalendarDays(firstDate, 51 * 7);
  const lastDate = season.end_date && season.end_date < fiftySecondWeek
    ? season.end_date : fiftySecondWeek;
  return { weekday, firstDate, lastDate, startTime: "19:00" };
}

/** Same season selection as the season screen: active, otherwise most recently starting. */
export function selectOnboardingSeason<T extends OnboardingSeasonRange>(
  seasons: T[], today = new Date().toISOString().slice(0, 10),
): T | null {
  return seasons.find(season =>
    Boolean(season.start_date && season.start_date <= today && (!season.end_date || season.end_date >= today)),
  ) ?? seasons[0] ?? null;
}
