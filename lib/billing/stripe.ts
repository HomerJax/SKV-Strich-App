import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export type StripePlanKey = "pro_monthly" | "pro_yearly";

type StripeRequestOptions = {
  method?: "GET" | "POST";
  params?: Record<string, string | number | boolean | null | undefined>;
};

type StripeCheckoutSession = {
  id: string;
  url: string | null;
  customer: string | { id?: string } | null;
  subscription: string | { id?: string } | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
};

type StripeSubscription = {
  id: string;
  customer: string | { id?: string } | null;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number | null;
  metadata?: Record<string, string> | null;
  items?: {
    data?: Array<{
      current_period_end?: number | null;
      price?: { id?: string | null } | null;
    }>;
  };
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

function getRequiredEnv(key: string) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function getStripeSecretKey() {
  return getRequiredEnv("STRIPE_SECRET_KEY");
}

export function getStripeWebhookSecret() {
  return getRequiredEnv("STRIPE_WEBHOOK_SECRET");
}

export function getStripePriceId(plan: StripePlanKey) {
  const key =
    plan === "pro_monthly"
      ? "STRIPE_PRO_MONTHLY_PRICE_ID"
      : "STRIPE_PRO_YEARLY_PRICE_ID";
  return process.env[key]?.trim() || null;
}

export function isStripeCheckoutConfigured(plan?: StripePlanKey) {
  const hasSecret = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  if (!hasSecret) return false;
  if (plan) return Boolean(getStripePriceId(plan));
  return Boolean(getStripePriceId("pro_monthly") || getStripePriceId("pro_yearly"));
}

export function getPlanKeyForStripePrice(priceId: string | null | undefined): StripePlanKey | null {
  if (!priceId) return null;
  if (priceId === getStripePriceId("pro_monthly")) return "pro_monthly";
  if (priceId === getStripePriceId("pro_yearly")) return "pro_yearly";
  return null;
}

function encodeParams(params: Record<string, string | number | boolean | null | undefined>) {
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    body.set(key, String(value));
  }

  return body;
}

async function stripeRequest<T>(path: string, options: StripeRequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getStripeSecretKey()}`,
  };

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
  };

  if (method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = encodeParams(options.params ?? {}).toString();
  }

  const response = await fetch(`https://api.stripe.com${path}`, init);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : `Stripe request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function idFromExpandable(value: string | { id?: string } | null | undefined) {
  if (typeof value === "string") return value;
  return value?.id ?? null;
}

export async function createStripeCheckoutSession(input: {
  plan: StripePlanKey;
  clubId: string;
  userId: string;
  email?: string | null;
  origin: string;
  customerId?: string | null;
}) {
  const priceId = getStripePriceId(input.plan);
  if (!priceId) throw new Error(`Stripe price for ${input.plan} is not configured.`);

  const params: Record<string, string | number | boolean | null | undefined> = {
    mode: "subscription",
    client_reference_id: input.clubId,
    success_url: `${input.origin}/pro?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/pro?checkout=cancelled`,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": 1,
    "metadata[club_id]": input.clubId,
    "metadata[user_id]": input.userId,
    "metadata[plan_key]": input.plan,
    "subscription_data[metadata][club_id]": input.clubId,
    "subscription_data[metadata][user_id]": input.userId,
    "subscription_data[metadata][plan_key]": input.plan,
    allow_promotion_codes: true,
  };

  if (input.customerId) {
    params.customer = input.customerId;
  } else if (input.email) {
    params.customer_email = input.email;
  }

  return stripeRequest<StripeCheckoutSession>("/v1/checkout/sessions", {
    method: "POST",
    params,
  });
}

export async function createStripeCustomerPortalSession(input: {
  customerId: string;
  returnUrl: string;
}) {
  return stripeRequest<{ id: string; url: string }>("/v1/billing_portal/sessions", {
    method: "POST",
    params: {
      customer: input.customerId,
      return_url: input.returnUrl,
    },
  });
}

export async function getStripeSubscription(subscriptionId: string) {
  return stripeRequest<StripeSubscription>(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export function getStripeSubscriptionSnapshot(subscription: StripeSubscription) {
  const firstItem = subscription.items?.data?.[0];
  const priceId = firstItem?.price?.id ?? null;
  const periodEndUnix =
    subscription.current_period_end ?? firstItem?.current_period_end ?? null;

  return {
    subscriptionId: subscription.id,
    customerId: idFromExpandable(subscription.customer),
    priceId,
    planKey:
      getPlanKeyForStripePrice(priceId) ??
      (subscription.metadata?.plan_key === "pro_monthly" ||
      subscription.metadata?.plan_key === "pro_yearly"
        ? (subscription.metadata.plan_key as StripePlanKey)
        : null),
    clubId: subscription.metadata?.club_id ?? null,
    stripeStatus: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    periodEnd:
      typeof periodEndUnix === "number"
        ? new Date(periodEndUnix * 1000).toISOString()
        : null,
  };
}

function safeEqualHex(a: string, b: string) {
  try {
    const aBuffer = Buffer.from(a, "hex");
    const bBuffer = Buffer.from(b, "hex");
    return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
  } catch {
    return false;
  }
}

export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  toleranceSeconds = 300,
): StripeWebhookEvent {
  if (!signatureHeader) throw new Error("Missing Stripe-Signature header.");

  const parts = signatureHeader.split(",");
  const timestamp = parts
    .map((part) => part.trim().split("="))
    .find(([key]) => key === "t")?.[1];
  const signatures = parts
    .map((part) => part.trim().split("="))
    .filter(([key]) => key === "v1")
    .map(([, value]) => value)
    .filter(Boolean);

  if (!timestamp || signatures.length === 0) {
    throw new Error("Invalid Stripe signature header.");
  }

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) throw new Error("Invalid Stripe signature timestamp.");

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestampNumber);
  if (age > toleranceSeconds) throw new Error("Stripe webhook signature is too old.");

  const expected = createHmac("sha256", getStripeWebhookSecret())
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  if (!signatures.some((signature) => safeEqualHex(expected, signature))) {
    throw new Error("Invalid Stripe webhook signature.");
  }

  return JSON.parse(rawBody) as StripeWebhookEvent;
}
