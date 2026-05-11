import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePowerUser } from "@/lib/auth/power-user";

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function addMonths(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
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

    case "supercup_trial":
      return {
        plan_key: "supercup_trial",
        status: "active",
        trial_ends_at: "2026-07-31T21:59:59.000Z",
        pro_ends_at: "2026-07-31T21:59:59.000Z",
        billing_note: "Supercup Trial bis Ende Juli.",
      };

    case "pro_6_months":
      return {
        plan_key: "pro_6_months",
        status: "active",
        trial_ends_at: null,
        pro_ends_at: addMonths(6),
        billing_note: "Manuell auf Pro 6 Monate gesetzt.",
      };

    case "pro_yearly":
      return {
        plan_key: "pro_yearly",
        status: "active",
        trial_ends_at: null,
        pro_ends_at: addMonths(12),
        billing_note: "Manuell auf Pro 12 Monate gesetzt.",
      };

    case "founder":
      return {
        plan_key: "founder",
        status: "active",
        trial_ends_at: null,
        pro_ends_at: null,
        billing_note: "Founder / dauerhaft manuell freigeschaltet.",
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
