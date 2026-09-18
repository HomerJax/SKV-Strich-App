import "server-only";

import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";

export async function requireCashboxAccess(options?: { manage?: boolean }) {
  const ctx = await requireClub();
  const flags = await getFeatureFlagsForClub(ctx.clubId);

  if (!(flags.penalties ?? false)) {
    redirect("/home");
  }

  const isClubAdmin = canManageClub({
    isPowerUser: ctx.isPowerUser,
    role: ctx.membership.role,
  });

  let isCashboxManager = false;

  if (!isClubAdmin) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("cashbox_managers")
      .select("user_id")
      .eq("club_id", ctx.clubId)
      .eq("user_id", ctx.user.id)
      .maybeSingle<{ user_id: string }>();

    isCashboxManager = Boolean(data);
  }

  const canManageCashbox = isClubAdmin || isCashboxManager;

  if (options?.manage && !canManageCashbox) {
    redirect("/mannschaftskasse");
  }

  return {
    ...ctx,
    isClubAdmin,
    isCashboxManager,
    canManageCashbox,
  };
}
