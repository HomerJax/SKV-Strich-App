import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePowerUser } from "@/lib/auth/power-user";

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getBillingPatch(action: string) {
  switch (action) {
    case "free":
      return {
        plan_key: "free",
        status: "active",
        trial_ends_at: null,
        pro_ends_at: null,
        billing_note: "Manuell auf Free gesetzt.",
      };

    default:
      return null;
  }
}

export async function POST(request: Request) {
  await requirePowerUser();

  const formData = await request.formData();
  const clubId = getString(formData.get("club_id"));
  const action = getString(formData.get("action"));

  if (!clubId) {
    return NextResponse.redirect(
      new URL("/power-user/clubs?billing_error=missing_club", request.url),
      { status: 303 }
    );
  }

  const patch = getBillingPatch(action);

  if (!patch) {
    return NextResponse.redirect(
      new URL("/power-user/clubs?billing_error=invalid_action", request.url),
      { status: 303 }
    );
  }

  const supabase = createAdminClient();

  const { data: existingBilling, error: readError } = await supabase
    .from("club_billing")
    .select("plan_key, stripe_subscription_id")
    .eq("club_id", clubId)
    .maybeSingle();

  if (readError || existingBilling?.plan_key === "founder" || existingBilling?.stripe_subscription_id) {
    return NextResponse.redirect(
      new URL("/power-user/clubs?billing_error=protected_plan", request.url),
      { status: 303 }
    );
  }

  const { error } = await supabase.from("club_billing").upsert(
    {
      club_id: clubId,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "club_id",
    }
  );

  if (error) {
    console.error("power-user club billing update failed:", error);

    return NextResponse.redirect(
      new URL("/power-user/clubs?billing_error=save_failed", request.url),
      { status: 303 }
    );
  }

  revalidatePath("/power-user/clubs");

  return NextResponse.redirect(
    new URL("/power-user/clubs?billing_saved=1", request.url),
    { status: 303 }
  );
}
