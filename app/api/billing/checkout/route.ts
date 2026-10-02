import { NextResponse } from "next/server";
import { getAuthContext, isActiveClubAdmin } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createStripeCheckoutSession,
  isStripeCheckoutConfigured,
  type StripePlanKey,
} from "@/lib/billing/stripe";

function getOrigin(request: Request) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  return configured || new URL(request.url).origin;
}

function isStripePlanKey(value: string): value is StripePlanKey {
  return value === "pro_monthly" || value === "pro_yearly";
}

export async function POST(request: Request) {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return NextResponse.redirect(
      new URL("/login?next=%2Fpro", request.url),
      { status: 303 },
    );
  }

  if (!ctx.activeClubId || !isActiveClubAdmin(ctx)) {
    return NextResponse.redirect(
      new URL("/pro?checkout=admin_required", request.url),
      { status: 303 },
    );
  }

  const formData = await request.formData();
  const planRaw = String(formData.get("plan") ?? "").trim();

  if (!isStripePlanKey(planRaw)) {
    return NextResponse.redirect(
      new URL("/pro?checkout=invalid_plan", request.url),
      { status: 303 },
    );
  }

  if (!isStripeCheckoutConfigured(planRaw)) {
    return NextResponse.redirect(
      new URL("/pro?checkout=not_configured", request.url),
      { status: 303 },
    );
  }

  const admin = createAdminClient();
  const { data: billing, error: billingError } = await admin
    .from("club_billing")
    .select("stripe_customer_id,stripe_subscription_id,status")
    .eq("club_id", ctx.activeClubId)
    .maybeSingle<{
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      status: string | null;
    }>();

  if (billingError) {
    console.error("billing checkout load failed:", billingError);
    return NextResponse.redirect(
      new URL("/pro?checkout=failed", request.url),
      { status: 303 },
    );
  }

  if (billing?.stripe_subscription_id && billing.status === "active") {
    return NextResponse.redirect(
      new URL("/pro?checkout=already_active", request.url),
      { status: 303 },
    );
  }

  try {
    const session = await createStripeCheckoutSession({
      plan: planRaw,
      clubId: ctx.activeClubId,
      userId: ctx.user.id,
      email: ctx.user.email,
      origin: getOrigin(request),
      customerId: billing?.stripe_customer_id ?? null,
    });

    if (!session.url) throw new Error("Stripe returned no checkout URL.");

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error) {
    console.error("stripe checkout creation failed:", error);

    return NextResponse.redirect(
      new URL("/pro?checkout=failed", request.url),
      { status: 303 },
    );
  }
}
