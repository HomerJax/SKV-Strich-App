import assert from "node:assert/strict";
import test from "node:test";
import { buildNewClubTrialBilling, PRO_TRIAL_DAYS } from "../lib/billing/pro-trial.ts";
import { getBillingAccess } from "../lib/billing/club-billing.ts";

const NOW = new Date("2026-10-30T20:00:00.000Z");
const CLUB = "00000000-0000-0000-0000-000000000001";

test("new club receives a 28-day, no-payment trial", () => {
  const billing = buildNewClubTrialBilling(CLUB, NOW);
  assert.equal(billing.plan_key, "pro_trial");
  assert.equal(billing.billing_provider, null);
  assert.equal(billing.stripe_subscription_id, null);
  assert.equal(billing.trial_ends_at, "2026-11-27T20:00:00.000Z");
  assert.equal((Date.parse(billing.trial_ends_at) - NOW.getTime()) / 86400000, PRO_TRIAL_DAYS);
  assert.deepEqual(
    { isPro: getBillingAccess(billing).isPro, isTrial: getBillingAccess(billing).isTrial },
    { isPro: true, isTrial: true }
  );
});

test("trial stops granting PRO at the deadline, with no cron", () => {
  const billing = buildNewClubTrialBilling(CLUB, new Date(Date.now() - 28 * 86400000));
  assert.equal(getBillingAccess(billing).isPro, false);
  assert.equal(getBillingAccess(billing).isFree, true);
  assert.equal(getBillingAccess(billing).isExpired, true);
  assert.equal(getBillingAccess({ ...billing, trial_ends_at: new Date(Date.now() + 60000).toISOString() }).isPro, true);
});

test("malformed, missing or inactive trial never grants PRO", () => {
  const b = buildNewClubTrialBilling(CLUB, NOW);
  for (const trial_ends_at of [null, "", "garbage", "2000-01-01T00:00:00.000Z"]) {
    assert.equal(getBillingAccess({ ...b, trial_ends_at }).isPro, false);
  }
  assert.equal(getBillingAccess({ ...b, status: "cancelled" }).isPro, false);
  assert.equal(getBillingAccess({ ...b, billing_provider: "stripe" }).isPro, false);
  assert.equal(getBillingAccess({ ...b, stripe_subscription_id: "sub_should_not_exist" }).isPro, false);
});

test("legacy Supercup trials and ordinary Free stay Free", () => {
  const b = buildNewClubTrialBilling(CLUB, NOW);
  assert.equal(getBillingAccess({ ...b, plan_key: "supercup_trial" }).isPro, false);
  assert.equal(getBillingAccess({ ...b, plan_key: "free" }).isPro, false);
});

test("Founder and active Stripe PRO remain unaffected", () => {
  const b = buildNewClubTrialBilling(CLUB, NOW);
  assert.equal(getBillingAccess({ ...b, plan_key: "founder" }).isPro, true);
  for (const plan_key of ["pro_monthly", "pro_yearly"]) {
    assert.equal(getBillingAccess({ ...b, plan_key, billing_provider: "stripe", pro_ends_at: new Date(Date.now() + 86400000).toISOString() }).isPro, true);
    assert.equal(getBillingAccess({ ...b, plan_key, billing_provider: "stripe", pro_ends_at: new Date(Date.now() - 86400000).toISOString() }).isPro, false);
    assert.equal(getBillingAccess({ ...b, plan_key, billing_provider: null }).isPro, false);
  }
});

test("the trial helper is deterministic and does not extend a reused billing record", () => {
  const first = buildNewClubTrialBilling(CLUB, NOW);
  const after = getBillingAccess(first);
  assert.equal(after.billing.trial_ends_at, first.trial_ends_at);
  assert.equal(after.billing.updated_at, NOW.toISOString());
});
