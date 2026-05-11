import { SupabaseClient } from "@supabase/supabase-js";

export type ClubBillingPlanKey =
  | "free"
  | "supercup_trial"
  | "pro_monthly"
  | "pro_6_months"
  | "pro_yearly"
  | "founder";

export type ClubBillingStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "manual";

export type ClubBilling = {
  club_id: string;
  plan_key: ClubBillingPlanKey;
  status: ClubBillingStatus;
  trial_ends_at: string | null;
  pro_ends_at: string | null;
  billing_note: string | null;
  updated_at: string | null;
};

export type BillingAccess = {
  billing: ClubBilling;
  isFree: boolean;
  isPro: boolean;
  isFounder: boolean;
  isTrial: boolean;
  isExpired: boolean;
  planLabel: string;
};

export const FREE_BILLING_FALLBACK: ClubBilling = {
  club_id: "",
  plan_key: "free",
  status: "active",
  trial_ends_at: null,
  pro_ends_at: null,
  billing_note: "Fallback: kein Billing-Eintrag vorhanden.",
  updated_at: null,
};

export function getPlanLabel(planKey: string) {
  switch (planKey) {
    case "supercup_trial":
      return "Supercup Trial";
    case "pro_monthly":
      return "Pro monatlich";
    case "pro_6_months":
      return "Pro 6 Monate";
    case "pro_yearly":
      return "Pro 12 Monate";
    case "founder":
      return "Founder";
    case "free":
    default:
      return "Free";
  }
}

export function normalizeBilling(
  billing: Partial<ClubBilling> | null | undefined,
  clubId = ""
): ClubBilling {
  return {
    club_id: billing?.club_id ?? clubId,
    plan_key: billing?.plan_key ?? "free",
    status: billing?.status ?? "active",
    trial_ends_at: billing?.trial_ends_at ?? null,
    pro_ends_at: billing?.pro_ends_at ?? null,
    billing_note:
      billing?.billing_note ?? "Fallback: kein Billing-Eintrag vorhanden.",
    updated_at: billing?.updated_at ?? null,
  };
}

export function isDateInFuture(value: string | null | undefined) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() > Date.now();
}

export function getBillingAccess(
  billingInput: Partial<ClubBilling> | null | undefined,
  clubId = ""
): BillingAccess {
  const billing = normalizeBilling(billingInput, clubId);

  const isFounder =
    billing.status === "active" && billing.plan_key === "founder";

  const isTrial =
    billing.status === "active" &&
    billing.plan_key === "supercup_trial" &&
    isDateInFuture(billing.pro_ends_at ?? billing.trial_ends_at);

  const hasActiveTimedPro =
    billing.status === "active" &&
    billing.plan_key !== "free" &&
    billing.plan_key !== "founder" &&
    billing.plan_key !== "supercup_trial" &&
    (billing.pro_ends_at === null || isDateInFuture(billing.pro_ends_at));

  const isPro = isFounder || isTrial || hasActiveTimedPro;

  const isExpired =
    billing.status !== "active" ||
    (billing.plan_key !== "free" &&
      billing.plan_key !== "founder" &&
      billing.pro_ends_at !== null &&
      !isDateInFuture(billing.pro_ends_at));

  return {
    billing,
    isFree: !isPro,
    isPro,
    isFounder,
    isTrial,
    isExpired,
    planLabel: getPlanLabel(billing.plan_key),
  };
}

export async function getClubBillingAccess(
  supabase: SupabaseClient,
  clubId: string
): Promise<BillingAccess> {
  const { data } = await supabase
    .from("club_billing")
    .select(
      "club_id, plan_key, status, trial_ends_at, pro_ends_at, billing_note, updated_at"
    )
    .eq("club_id", clubId)
    .maybeSingle<ClubBilling>();

  return getBillingAccess(data, clubId);
}