/**
 * Explicit rollout for the WEEKLY standings recap and its dedicated Story.
 * Do not use this helper for unrelated result/top-10 Story pilots.
 */
const WEEKLY_REPORT_CLUBS = new Set([
  "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60", // 1. FC Strikr 2026 (test)
  "108590d9-0877-4787-90a5-4679615b3b76", // SKV Rutesheim Ü32 & AH
]);

export function isWeeklyReportPilotClub(clubId: string | null | undefined): boolean {
  return !!clubId && WEEKLY_REPORT_CLUBS.has(clubId);
}
