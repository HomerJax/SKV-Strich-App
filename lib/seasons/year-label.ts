/** Calendar-based, non-editable season year marker. Dates are inclusive. */
export function getSeasonYearLabel(startDate: string | null, endDate: string | null): string | null {
  if (!startDate || !endDate) return null;
  const start = Date.parse(startDate.slice(0, 10) + "T00:00:00Z");
  const end = Date.parse(endDate.slice(0, 10) + "T00:00:00Z");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const total = Math.round((end - start) / 86400000) + 1;
  const firstYear = new Date(start).getUTCFullYear();
  const lastYear = new Date(end).getUTCFullYear();
  for (let year = firstYear; year <= lastYear; year++) {
    const yearStart = Date.UTC(year, 0, 1);
    const yearEnd = Date.UTC(year + 1, 0, 1) - 86400000;
    const days = Math.round((Math.min(end, yearEnd) - Math.max(start, yearStart)) / 86400000) + 1;
    if (days / total >= 0.75) return String(year);
  }
  if (firstYear === lastYear) return String(firstYear);
  return String(firstYear).slice(-2).padStart(2, "0") + "/" + String(lastYear).slice(-2).padStart(2, "0");
}
