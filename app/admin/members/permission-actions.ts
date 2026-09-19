"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setMemberPermissionAction(formData: FormData) {
  const ctx = await requireClub();

  if (!canManageClub({ isPowerUser: ctx.isPowerUser, role: ctx.membership.role })) {
    redirect("/admin/members?error=not_allowed");
  }

  const userId = String(formData.get("user_id") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "1";

  if (!userId) {
    redirect("/admin/members?error=member_not_in_club");
  }

  const admin = createAdminClient();
  const { data: membership, error: membershipError } = await admin
    .from("club_memberships")
    .select("user_id,role")
    .eq("club_id", ctx.clubId)
    .eq("user_id", userId)
    .maybeSingle<{ user_id: string; role: string }>();

  if (membershipError || !membership) {
    redirect("/admin/members?error=member_not_in_club");
  }

  const result = enabled
    ? await admin.from("club_member_permissions").upsert(
        {
          club_id: ctx.clubId,
          user_id: userId,
          permission_key: "manage_beerkasse",
          created_by: ctx.user.id,
        },
        { onConflict: "club_id,user_id,permission_key" },
      )
    : await admin
        .from("club_member_permissions")
        .delete()
        .eq("club_id", ctx.clubId)
        .eq("user_id", userId)
        .eq("permission_key", "manage_beerkasse");

  if (result.error) {
    redirect("/admin/members?error=member_role_update_failed");
  }

  revalidatePath("/admin/members");
  revalidatePath("/mannschaftskasse");
  revalidatePath("/mannschaftskasse/bier");
  redirect("/admin/members?success=beer_permission_updated");
}
