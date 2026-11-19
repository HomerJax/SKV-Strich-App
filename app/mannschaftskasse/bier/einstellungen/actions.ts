"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseEuroToCents } from "@/lib/cashbox/money";

const url = "/mannschaftskasse/bier/einstellungen";
function validLink(value: string, hosts: string[]) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password && hosts.includes(u.hostname.toLowerCase());
  } catch { return false; }
}

export async function saveBeerSettingsAction(data: FormData) {
  const ctx = await requireClub();
  if (!canManageClub({ isPowerUser: ctx.isPowerUser, role: ctx.membership.role })) redirect("/home");
  const enabled = data.get("enabled") === "on";
  const price = parseEuroToCents(String(data.get("price") ?? ""));
  const paypal = String(data.get("paypal") ?? "").trim();
  const paypalMe = String(data.get("paypal_me") ?? "").trim();
  const sumup = String(data.get("sumup") ?? "").trim();
  const cash = data.get("cash") === "on";
  const home = data.get("home") === "on";
  if (enabled && (!price || price < 1 || price > 100000)) redirect(url + "?error=price");
  if (!validLink(paypal, ["paypal.com","www.paypal.com"]) ||
      !validLink(paypalMe, ["paypal.me","www.paypal.me"]) ||
      !validLink(sumup, ["pay.sumup.com","checkout.sumup.com"])) redirect(url + "?error=link");
  if (enabled && !cash && !paypal && !paypalMe && !sumup) redirect(url + "?error=payment");
  const admin = createAdminClient();
  const { error } = await admin.from("club_settings").upsert({
    club_id: ctx.clubId,
    beerkasse_enabled: enabled,
    beerkasse_home_enabled: enabled && home,
    beerkasse_price_cents: price || 200,
    beerkasse_paypal_url: paypal || null,
    beerkasse_paypal_me_url: paypalMe || null,
    beerkasse_sumup_url: sumup || null,
    beerkasse_cash_enabled: cash,
    updated_at: new Date().toISOString(),
  }, { onConflict: "club_id" });
  if (error) redirect(url + "?error=save");
  revalidatePath("/home");
  revalidatePath("/mannschaftskasse");
  revalidatePath("/mannschaftskasse/bier");
  revalidatePath("/mannschaftskasse/bier-rangliste");
  redirect("/mannschaftskasse/bier/einstellungen?saved=1");
}
