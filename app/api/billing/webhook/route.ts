import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getStripeSubscription,
  getStripeSubscriptionSnapshot,
  verifyStripeWebhookSignature,
  type StripeWebhookEvent,
} from "@/lib/billing/stripe";

type BillingPatch = {
  club_id: string;
  plan_key?: "pro_monthly" | "pro_yearly";
  status: "active" | "expired" | "cancelled";
  trial_ends_at?: null;
  pro_ends_at: string | null;
  billing_note: string;
  billing_provider: "stripe";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  cancel_at_period_end: boolean;
  updated_at: string;
};

function getExpandableId(value: unknown) {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "string"
  ) {
    return (value as { id: string }).id;
  }
  return null;
}

function getMetadata(object: Record<string, unknown>) {
  const metadata = object.metadata;
  return metadata && typeof metadata === "object"
    ? (metadata as Record<string, string>)
    : {};
}

async function resolveClubId(input: {
  explicitClubId?: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
}) {
  if (input.explicitClubId) return input.explicitClubId;

  const admin = createAdminClient();

  if (input.subscriptionId) {
    const { data } = await admin
      .from("club_billing")
      .select("club_id")
      .eq("stripe_subscription_id", input.subscriptionId)
      .maybeSingle<{ club_id: string }>();

    if (data?.club_id) return data.club_id;
  }

  if (input.customerId) {
    const { data } = await admin
      .from("club_billing")
      .select("club_id")
      .eq("stripe_customer_id", input.customerId)
      .maybeSingle<{ club_id: string }>();

    if (data?.club_id) return data.club_id;
  }

  return null;
}

async function syncSubscription(
  rawSubscription: Record<string, unknown>,
  eventType: string,
) {
  const subscriptionId =
    typeof rawSubscription.id === "string" ? rawSubscription.id : null;

  if (!subscriptionId) {
    throw new Error("Stripe subscription event without subscription id.");
  }

  const subscription =
    "items" in rawSubscription
      ? (rawSubscription as Parameters<typeof getStripeSubscriptionSnapshot>[0])
      : await getStripeSubscription(subscriptionId);

  const snapshot = getStripeSubscriptionSnapshot(subscription);
  const clubId = await resolveClubId({
    explicitClubId: snapshot.clubId,
    subscriptionId: snapshot.subscriptionId,
    customerId: snapshot.customerId,
  });

  if (!clubId) {
    throw new Error(`Could not resolve club for Stripe subscription ${snapshot.subscriptionId}.`);
  }

  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  const isCancelled =
    eventType === "customer.subscription.deleted" ||
    snapshot.stripeStatus === "canceled";
  const appStatus: BillingPatch["status"] = isCancelled
    ? "cancelled"
    : activeStatuses.has(snapshot.stripeStatus)
      ? "active"
      : "expired";

  const planKey = snapshot.planKey;
  if (!planKey) {
    throw new Error(`Unknown Stripe price for subscription ${snapshot.subscriptionId}.`);
  }

  const patch: BillingPatch = {
    club_id: clubId,
    plan_key: planKey,
    status: appStatus,
    trial_ends_at: null,
    pro_ends_at:
      appStatus === "active"
        ? snapshot.periodEnd
        : new Date().toISOString(),
    billing_note:
      appStatus === "active"
        ? snapshot.cancelAtPeriodEnd
          ? "Stripe-Abo aktiv · Kündigung zum Periodenende vorgemerkt."
          : "Stripe-Abo aktiv."
        : appStatus === "cancelled"
          ? "Stripe-Abo beendet."
          : `Stripe-Abo nicht aktiv (${snapshot.stripeStatus}).`,
    billing_provider: "stripe",
    stripe_customer_id: snapshot.customerId,
    stripe_subscription_id: snapshot.subscriptionId,
    stripe_price_id: snapshot.priceId,
    cancel_at_period_end: snapshot.cancelAtPeriodEnd,
    updated_at: new Date().toISOString(),
  };

  const admin = createAdminClient();
  const { error } = await admin.from("club_billing").upsert(patch, {
    onConflict: "club_id",
  });

  if (error) {
    throw new Error(`Failed to sync Stripe subscription: ${error.message}`);
  }
}

async function handleCheckoutCompleted(object: Record<string, unknown>) {
  const metadata = getMetadata(object);
  const clubId =
    metadata.club_id ||
    (typeof object.client_reference_id === "string"
      ? object.client_reference_id
      : null);

  const subscriptionId = getExpandableId(object.subscription);
  const customerId = getExpandableId(object.customer);

  if (!clubId) {
    throw new Error("Stripe checkout completed without club id.");
  }

  if (!subscriptionId) {
    throw new Error("Stripe subscription checkout completed without subscription id.");
  }

  const subscription = await getStripeSubscription(subscriptionId);
  const snapshot = getStripeSubscriptionSnapshot(subscription);

  const resolvedPlan =
    snapshot.planKey ||
    (metadata.plan_key === "pro_monthly" || metadata.plan_key === "pro_yearly"
      ? metadata.plan_key
      : null);

  if (!resolvedPlan) {
    throw new Error("Stripe checkout completed with unknown price.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("club_billing").upsert(
    {
      club_id: clubId,
      plan_key: resolvedPlan,
      status: "active",
      trial_ends_at: null,
      pro_ends_at: snapshot.periodEnd,
      billing_note: "Stripe-Checkout erfolgreich · PRO automatisch freigeschaltet.",
      billing_provider: "stripe",
      stripe_customer_id: snapshot.customerId ?? customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: snapshot.priceId,
      cancel_at_period_end: snapshot.cancelAtPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "club_id" },
  );

  if (error) {
    throw new Error(`Failed to activate club after checkout: ${error.message}`);
  }
}

async function handleEvent(event: StripeWebhookEvent) {
  const object = event.data.object;

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(object);
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(object, event.type);
      break;

    default:
      break;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  let event: StripeWebhookEvent;
  try {
    event = verifyStripeWebhookSignature(
      rawBody,
      request.headers.get("stripe-signature"),
    );
  } catch (error) {
    console.error("stripe webhook signature rejected:", error);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("stripe webhook processing failed:", {
      eventId: event.id,
      eventType: event.type,
      error,
    });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
