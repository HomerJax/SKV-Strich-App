/** Server/client-safe phase selection for one-time trial-to-Free announcements. */
export type ProTrialNoticePhase = "three_days" | "one_day" | "free";

export function getProTrialNoticePhase(
  trialEnd: string | null | undefined,
  planKey: string | null | undefined,
  status: string | null | undefined,
  isPro: boolean,
  isAdmin: boolean,
  now = Date.now(),
): ProTrialNoticePhase | null {
  if (planKey !== "pro_trial" || !trialEnd || status !== "active") return null;
  const end = Date.parse(trialEnd);
  if (!Number.isFinite(end)) return null;
  const remaining = end - now;
  if (remaining > 0 && !isPro) return null;
  if (remaining > 0 && remaining <= 72 * 60 * 60 * 1000) {
    return isAdmin && remaining <= 24 * 60 * 60 * 1000 ? "one_day" : "three_days";
  }
  if (remaining <= 0 && remaining > -7 * 24 * 60 * 60 * 1000 && !isPro) {
    return "free";
  }
  return null;
}
