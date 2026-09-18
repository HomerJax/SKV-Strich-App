"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { parseEuroToCents } from "@/lib/cashbox/money";
import { createClient } from "@/lib/supabase/server";

function settingsUrl(params: Record<string, string>) {
  return `/admin/penalties?${new URLSearchParams({ tab: "settings", ...params })}`;
}

export async function saveBeerkasseAction(fd: FormData) {
  const ctx = await requireClub();
  if (!canManageClub({ isPowerUser: ctx.isPowerUser, role: ctx.membership.role })) {
    redirect("/home");
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("club_settings")
    .select("beerkasse_premium_enabled")
    .eq("club_id", ctx.clubId)
    .maybeSingle();

  if (current?.beerkasse_premium_enabled !== true) {
    redirect(settingsUrl({ beerkasse_error: "premium" }));
  }

  const url = String(fd.get("paypal_url") ?? "").trim();
  if (url && !/^https:\/\//i.test(url)) {
    redirect(settingsUrl({ beerkasse_error: "url" }));
  }

  const priceCents = parseEuroToCents(String(fd.get("price") ?? "").trim());
  if (!priceCents || priceCents < 1 || priceCents > 100000) {
    redirect(settingsUrl({ beerkasse_error: "price" }));
  }

  const enabled = fd.get("enabled") === "on";
  const home = fd.get("home_enabled") === "on";
  const stats = fd.get("stats_enabled") === "on";
  const badges = fd.get("badges_enabled") === "on";

  const { error } = await supabase.from("club_settings").upsert(
    {
      club_id: ctx.clubId,
      beerkasse_enabled: enabled,
      beerkasse_home_enabled: home,
      beerkasse_paypal_url: url || null,
      beerkasse_price_cents: priceCents,
      beerkasse_stats_enabled: stats,
      beerkasse_badges_enabled: badges,
    },
    { onConflict: "club_id" },
  );

  if (error) {
    redirect(settingsUrl({ beerkasse_error: "save" }));
  }

  revalidatePath("/home");
  revalidatePath("/mannschaftskasse");
  revalidatePath("/admin/penalties");
  redirect(settingsUrl({ beerkasse_saved: "1" }));
}

export async function setBeerkassePremiumAction(fd: FormData) {
  const ctx = await requireClub();
  if (!ctx.isPowerUser) redirect("/home");

  const enabled = String(fd.get("enabled") ?? "") === "1";
  const supabase = await createClient();

  const { error } = await supabase.from("club_settings").upsert(
    {
      club_id: ctx.clubId,
      beerkasse_premium_enabled: enabled,
      ...(enabled ? {} : { beerkasse_enabled: false, beerkasse_home_enabled: false }),
    },
    { onConflict: "club_id" },
  );

  if (error) {
    redirect(settingsUrl({ beerkasse_error: "premium_save" }));
  }

  revalidatePath("/home");
  revalidatePath("/mannschaftskasse");
  revalidatePath("/admin/penalties");
  redirect(settingsUrl({ beerkasse_saved: "1" }));
}
