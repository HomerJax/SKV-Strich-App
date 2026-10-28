"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EMPTY_PILOT_CASHBOX, isCashboxPilotClub, parsePilotCashboxStructure,
} from "@/lib/cashbox/pilot-structure";

function errorUrl(code: string) {
  return "/mannschaftskasse/konten?error=" + encodeURIComponent(code);
}

/** Only the accounts/routing part is edited; neither money nor other setup
 * choices may change from this page. All writes are scoped to the pilot club. */
export async function saveCashboxAccountsAction(formData: FormData) {
  const ctx = await requireClub();
  if (ctx.isSupportView ||
      !isCashboxPilotClub(ctx.clubId) ||
      !canManageClub({ isPowerUser: ctx.isPowerUser, role: ctx.membership.role })) {
    redirect("/mannschaftskasse");
  }

  const raw = String(formData.get("accounts_json") ?? "");
  if (!raw || raw.length > 16000) redirect(errorUrl("accounts"));
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    redirect(errorUrl("accounts"));
  }

  const parsed = parsePilotCashboxStructure(input);
  const rawAccounts = input && typeof input === "object" && "accounts" in input &&
      Array.isArray(input.accounts) ? input.accounts : null;
  if (!rawAccounts || rawAccounts.length > 15 || rawAccounts.length !== parsed.accounts.length ||
      new Set(parsed.accounts.map(account => account.key)).size !== parsed.accounts.length) {
    redirect(errorUrl("accounts"));
  }
  // Existing account routing must point to one of the submitted accounts
  // (or be deliberately unset); malformed account IDs cannot be saved.
  const rawRouting = input && typeof input === "object" && "routing" in input &&
      input.routing && typeof input.routing === "object"
    ? input.routing as Record<string, unknown> : {};
  for (const key of ["contributions", "penalties", "beer"] as const) {
    if (rawRouting[key] !== undefined &&
        rawRouting[key] !== "" && rawRouting[key] !== parsed.routing[key]) {
      redirect(errorUrl("accounts"));
    }
  }

  const db = createAdminClient();
  const { data: existing, error: readError } = await db.from("cashbox_pilot_structures")
    .select("config").eq("club_id", ctx.clubId).maybeSingle();
  if (readError) redirect(errorUrl("save"));
  const current = existing?.config
    ? parsePilotCashboxStructure(existing.config) : EMPTY_PILOT_CASHBOX;
  // Only account settings change. Preserve payment links, cashbox modules,
  // cashiers, billing, penalties and existing financial transactions.
  const { error } = await db.from("cashbox_pilot_structures").upsert({
    club_id: ctx.clubId,
    config: { ...current, accounts: parsed.accounts, routing: parsed.routing },
    updated_by: ctx.user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "club_id" });
  if (error) redirect(errorUrl("save"));

  revalidatePath("/mannschaftskasse");
  revalidatePath("/mannschaftskasse/setup");
  revalidatePath("/mannschaftskasse/konten");
  redirect("/mannschaftskasse/konten?saved=1");
}
