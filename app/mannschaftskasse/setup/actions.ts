"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageClub } from "@/lib/auth/access";
import { requireClub } from "@/lib/auth/guards";
import { parseEuroToCents } from "@/lib/cashbox/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCashboxPilotClub, parsePilotCashboxStructure } from "@/lib/cashbox/pilot-structure";

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
  // This new structure path is server-guarded by club ID and additionally
  // restricted by a database CHECK constraint. No other club is eligible.
  if (isCashboxPilotClub(ctx.clubId)) {
    const raw = String(formData.get("pilot_structure_json") ?? "");
    if (raw.length > 16000) redirect(setupUrl({ error: "structure" }));
    let input: unknown;
    try {
      input = JSON.parse(raw);
    } catch {
      redirect(setupUrl({ error: "structure" }));
    }
    const pilot = parsePilotCashboxStructure(input);
    if (pilot.accounts.length > 15) {
      redirect(setupUrl({ error: "accounts" }));
    }
    if (new Set(pilot.accounts.map(account => account.key)).size !== pilot.accounts.length) {
      redirect(setupUrl({ error: "accounts" }));
    }
    const candidateAccounts = input && typeof input === "object" && "accounts" in input && Array.isArray(input.accounts)
      ? input.accounts : [];
    if (candidateAccounts.length !== pilot.accounts.length) {
      redirect(setupUrl({ error: "accounts" }));
    }

    function validPaymentUrl(rawUrl: string, hosts: string[]) {
      if (!rawUrl) return true;
      try {
        const url = new URL(rawUrl);
        return url.protocol === "https:" &&
          !url.username && !url.password &&
          hosts.some(host => url.hostname.toLowerCase() === host);
      } catch {
        return false;
      }
    }
    if (!validPaymentUrl(pilot.payments.paypalPoolUrl, ["paypal.com", "www.paypal.com"]) ||
        !validPaymentUrl(pilot.payments.paypalMeUrl, ["paypal.me", "www.paypal.me"]) ||
        !validPaymentUrl(pilot.payments.sumupUrl, ["pay.sumup.com", "checkout.sumup.com"])) {
      redirect(setupUrl({ error: "payments" }));
    }

    const { error: pilotError } = await admin.from("cashbox_pilot_structures").upsert({
      club_id: ctx.clubId,
      config: pilot,
      updated_by: ctx.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "club_id" });
    if (pilotError) {
      console.error("Cashbox pilot structure saving failed", pilotError.code);
      redirect(setupUrl({ error: "save" }));
    }
  }
  const penaltiesEnabled = formData.get("penalties_enabled") === "on";
  const contributionsEnabled = formData.get("contributions_enabled") === "on";
  const beerRequested = formData.get("beer_enabled") === "on";

  const beerEnabled = beerRequested;

  if (!penaltiesEnabled && !contributionsEnabled && !beerEnabled) {
    redirect(setupUrl({ error: "module" }));
  }

  const paypalUrl = String(formData.get("paypal_url") ?? "").trim();
  const paypalMeUrl = String(formData.get("paypal_me_url") ?? "").trim();
  const sumupUrl = String(formData.get("sumup_url") ?? "").trim();
  const cashEnabled = formData.get("cash_enabled") === "on";
  const priceCents = parseEuroToCents(String(formData.get("beer_price") ?? "").trim());
  const beerHomeEnabled = formData.get("beer_home_enabled") === "on";

  if (beerEnabled) {
    if (!priceCents || priceCents < 1 || priceCents > 100000) {
      redirect(setupUrl({ error: "price" }));
    }

    if ([paypalUrl, paypalMeUrl, sumupUrl].some((value) => value && !/^https:\/\//i.test(value))) {
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
    settingsPayload.beerkasse_paypal_me_url = paypalMeUrl || null;
    settingsPayload.beerkasse_sumup_url = sumupUrl || null;
    settingsPayload.beerkasse_cash_enabled = cashEnabled;
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
