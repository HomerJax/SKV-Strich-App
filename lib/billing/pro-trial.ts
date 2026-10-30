/**
 * The introductory PRO trial belongs to the new club, not to a Stripe customer.
 * It is created only in the club-creation flows; reads never extend the deadline.
 */
export const PRO_TRIAL_DAYS = 28;

export function buildNewClubTrialBilling(clubId: string, now = new Date()) {
  if (!Number.isFinite(now.getTime())) {
    throw new Error("Invalid trial start date.");
  }

  return {
    club_id: clubId,
    plan_key: "pro_trial" as const,
    status: "active" as const,
    trial_ends_at: new Date(
      now.getTime() + PRO_TRIAL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString(),
    pro_ends_at: null,
    billing_provider: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    cancel_at_period_end: false,
    billing_note: "Einmaliger kostenloser PRO-Test für 28 Tage. Danach automatisch Free, ohne Abo.",
    updated_at: now.toISOString(),
  };
}
