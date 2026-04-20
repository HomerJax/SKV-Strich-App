"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { slugifyKey } from "./helpers";

async function getAdminContext() {
  const { clubId, membership, memberships, isPowerUser } = await requireClub();

  const hasAdminAccess = canManageClub({
    isPowerUser,
    role: membership.role,
  });

  if (!hasAdminAccess) {
    redirect("/admin");
  }

  const supabase = await createClient();

  return { supabase, clubId, membership, memberships, isPowerUser };
}

function buildRedirectUrlWithParams(
  redirectTo: string | null | undefined,
  params: Record<string, string>
) {
  const target = redirectTo?.trim() || "/admin/settings";
  const separator = target.includes("?") ? "&" : "?";
  const query = new URLSearchParams(params).toString();
  return `${target}${separator}${query}`;
}

export async function addCategoryAction(formData: FormData) {
  const { supabase, clubId } = await getAdminContext();
  const redirectTo = String(formData.get("redirect_to") ?? "/admin/settings").trim();

  const label = String(formData.get("label") ?? "").trim();
  const keyInput = String(formData.get("key") ?? "").trim();

  if (!label) {
    redirect(
      buildRedirectUrlWithParams(redirectTo, {
        category_error: "Bitte Bezeichnung eingeben",
      })
    );
  }

  const key = slugifyKey(keyInput || label);

  if (!key) {
    redirect(
      buildRedirectUrlWithParams(redirectTo, {
        category_error: "Ungültiger Schlüssel",
      })
    );
  }

  const { data: maxRow } = await supabase
    .from("club_categories")
    .select("sort_order")
    .eq("club_id", clubId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("club_categories").insert({
    club_id: clubId,
    key,
    label,
    sort_order: nextSortOrder,
    is_active: true,
  });

  if (error) {
    redirect(
      buildRedirectUrlWithParams(redirectTo, {
        category_error: error.message,
      })
    );
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/categories");
  revalidatePath("/club-setup");
  revalidatePath("/onboarding");

  redirect(
    buildRedirectUrlWithParams(redirectTo, {
      category_saved: "1",
    })
  );
}

export async function updateCategoryAction(formData: FormData) {
  const { supabase, clubId } = await getAdminContext();
  const redirectTo = String(formData.get("redirect_to") ?? "/admin/settings").trim();

  const id = Number(String(formData.get("id") ?? ""));
  const label = String(formData.get("label") ?? "").trim();
  const keyInput = String(formData.get("key") ?? "").trim();
  const sortOrder = Number(String(formData.get("sort_order") ?? "0"));
  const isActive = formData.get("is_active") === "on";

  if (!id || !label) {
    redirect(
      buildRedirectUrlWithParams(redirectTo, {
        category_error: "Ungültige Kategorie",
      })
    );
  }

  const key = slugifyKey(keyInput || label);

  if (!key) {
    redirect(
      buildRedirectUrlWithParams(redirectTo, {
        category_error: "Ungültiger Schlüssel",
      })
    );
  }

  const safeSortOrder = Number.isFinite(sortOrder) ? sortOrder : 0;

  const { error } = await supabase
    .from("club_categories")
    .update({
      label,
      key,
      sort_order: safeSortOrder,
      is_active: isActive,
    })
    .eq("id", id)
    .eq("club_id", clubId);

  if (error) {
    redirect(
      buildRedirectUrlWithParams(redirectTo, {
        category_error: error.message,
      })
    );
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/categories");
  revalidatePath("/club-setup");
  revalidatePath("/onboarding");

  redirect(
    buildRedirectUrlWithParams(redirectTo, {
      category_saved: "1",
    })
  );
}