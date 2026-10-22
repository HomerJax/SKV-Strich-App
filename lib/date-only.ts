/**
 * Format a calendar date (YYYY-MM-DD) without interpreting it in the viewer time zone.
 * Session and season dates are date-only values, not UTC instants. Parsing them
 * with Date can display the prior day in timezones west of UTC.
 */
export function formatDateOnly(
  value: string | null | undefined,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!value) return "";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12))
    : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale, {
    ...options,
    ...(match ? { timeZone: "UTC" } : {}),
  });
}
