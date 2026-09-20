"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageClub } from "@/lib/auth/access";
import { requireClub } from "@/lib/auth/guards";
import { parseEuroToCents } from "@/lib/cashbox/money";
import { createAdminClient } from "@/lib/supabase/admin";

function setupUrl(params: Record<string, string> = {}) {
  const search = new URLSearchParams(params);
  return `/mannschaftskasse/setup${search.size ? `?${search.toString()}` : ""}`;
}

export async function saveCashboxSetupAction(formData: FormData) {
  const ctx = await requireClub();

  if (!canManageClub({ isPowerUser: ctx.isPowerUser, role: ctx.membership.role })) {
    redirect("/mannschaftskasse");
  }

  const admin = createAdminClient();
  const penaltiesEnabled = formData.get("penalties_enabled") === "on";
  const contributionsEnabled = formData.get("contributions_enabled") === "on";
  const beerRequested = formData.get("beer_enabled") === "on";

  const { data: currentSettings, error: settingsError } = await admin
    .from("club_settings")
    .select(
      "beerkasse_premium_enabled,beerkasse_price_cents,beerkasse_paypal_url",
    )
    .eq("club_id", ctx.clubId)
    .maybeSingle<{
      beerkasse_premium_enabled: boolean;
      beerkasse_price_cents: number;
      beerkasse_paypal_url: string | null;
    }>();

  if (settingsError) {
    redirect(setupUrl({ error: "load" }));
  }

  const beerEnabled =
    beerRequested && currentSettings?.beerkasse_premium_enabled === true;

  if (!penaltiesEnabled && !contributionsEnabled && !beerEnabled) {
    redirect(setupUrl({ error: "module" }));
  }

  const paypalUrl = String(formData.get("paypal_url") ?? "").trim();
  const priceCents = parseEuroToCents(String(formData.get("beer_price") ?? "").trim());
  const beerHomeEnabled = formData.get("beer_home_enabled") === "on";

  if (beerEnabled) {
    if (!priceCents || priceCents < 1 || priceCents > 100000) {
      redirect(setupUrl({ error: "price" }));
    }

    if (paypalUrl && !/^https:\/\//i.test(paypalUrl)) {
      redirect(setupUrl({ error: "paypal" }));
    }
  }

  const settingsPayload: Record<string, unknown> = {
    club_id: ctx.clubId,
    cashbox_setup_completed: true,
    cashbox_penalties_enabled: penaltiesEnabled,
    cashbox_contributions_enabled: contributionsEnabled,
    beerkasse_enabled: beerEnabled,
    beerkasse_home_enabled: beerEnabled && beerHomeEnabled,
    updated_at: new Date().toISOString(),
  };

  if (beerEnabled) {
    settingsPayload.beerkasse_price_cents = priceCents;
    settingsPayload.beerkasse_paypal_url = paypalUrl || null;
  }

  const { error: saveError } = await admin
    .from("club_settings")
    .upsert(settingsPayload, { onConflict: "club_id" });

  if (saveError) {
    redirect(setupUrl({ error: "save" }));
  }

  const { error: flagError } = await admin.from("club_feature_flags").upsert(
    {
      club_id: ctx.clubId,
      feature_key: "penalties",
      enabled: penaltiesEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "club_id,feature_key" },
  );

  if (flagError) {
    redirect(setupUrl({ error: "save" }));
  }

  const requestedManagers = Array.from(
    new Set(
      formData
        .getAll("manager_user_ids")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );

  let validManagerIds: string[] = [];
  if (requestedManagers.length > 0) {
    const { data: memberships, error: membershipError } = await admin
      .from("club_memberships")
      .select("user_id")
      .eq("club_id", ctx.clubId)
      .in("user_id", requestedManagers);

    if (membershipError) {
      redirect(setupUrl({ error: "manager" }));
    }

    validManagerIds = (memberships ?? []).map((row) => String(row.user_id));
  }

  const { error: clearManagersError } = await admin
    .from("cashbox_managers")
    .delete()
    .eq("club_id", ctx.clubId);

  if (clearManagersError) {
    redirect(setupUrl({ error: "manager" }));
  }

  if (validManagerIds.length > 0) {
    const { error: managerError } = await admin.from("cashbox_managers").insert(
      validManagerIds.map((userId) => ({
        club_id: ctx.clubId,
        user_id: userId,
        created_by: ctx.user.id,
      })),
    );

    if (managerError) {
      redirect(setupUrl({ error: "manager" }));
    }
  }

  revalidatePath("/mannschaftskasse");
  revalidatePath("/mannschaftskasse/setup");
  revalidatePath("/mannschaftskasse/bier");
  revalidatePath("/admin");
  revalidatePath("/admin/penalties");
  revalidatePath("/profile");
  revalidatePath("/home");

  redirect("/mannschaftskasse?setup_saved=1");
}
