import { NextResponse } from "next/server";
import { getAuthContext, isActiveClubAdmin } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeCustomerPortalSession } from "@/lib/billing/stripe";

function getOrigin(request: Request) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  return configured || new URL(request.url).origin;
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
      new URL("/pro?billing=admin_required", request.url),
      { status: 303 },
    );
  }

  const admin = createAdminClient();
  const { data: billing, error } = await admin
    .from("club_billing")
    .select("stripe_customer_id")
    .eq("club_id", ctx.activeClubId)
    .maybeSingle<{ stripe_customer_id: string | null }>();

  if (error || !billing?.stripe_customer_id) {
    return NextResponse.redirect(
      new URL("/pro?billing=no_customer", request.url),
      { status: 303 },
    );
  }

  try {
    const portal = await createStripeCustomerPortalSession({
      customerId: billing.stripe_customer_id,
      returnUrl: `${getOrigin(request)}/pro`,
    });

    return NextResponse.redirect(portal.url, { status: 303 });
  } catch (portalError) {
    console.error("stripe portal creation failed:", portalError);

    return NextResponse.redirect(
      new URL("/pro?billing=failed", request.url),
      { status: 303 },
    );
  }
}
