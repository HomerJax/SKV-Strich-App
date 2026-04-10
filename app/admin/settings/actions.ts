"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { slugifyKey } from "./helpers";

function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}

async function getAdminContext() {
  const { clubId, membership, memberships } = await requireClub();

  if (!isAdminRole(membership.role)) {
    redirect("/admin");
  }

  const supabase = await createClient();

  return { supabase, clubId, membership, memberships };
}

export async function addCategoryAction(formData: FormData) {
  const { supabase, clubId } = await getAdminContext();

  const label = String(formData.get("label") ?? "").trim();
  const keyInput = String(formData.get("key") ?? "").trim();

  if (!label) {
    redirect("/admin/settings?category_error=Bitte%20Bezeichnung%20eingeben");
  }

  const key = slugifyKey(keyInput || label);

  if (!key) {
    redirect("/admin/settings?category_error=Ung%C3%BCltiger%20Schl%C3%BCssel");
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
      `/admin/settings?category_error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/categories");
  revalidatePath("/onboarding");

  redirect("/admin/settings?category_saved=1");
}

export async function updateCategoryAction(formData: FormData) {
  const { supabase, clubId } = await getAdminContext();

  const id = Number(String(formData.get("id") ?? ""));
  const label = String(formData.get("label") ?? "").trim();
  const keyInput = String(formData.get("key") ?? "").trim();
  const sortOrder = Number(String(formData.get("sort_order") ?? "0"));
  const isActive = formData.get("is_active") === "on";

  if (!id || !label) {
    redirect("/admin/settings?category_error=Ung%C3%BCltige%20Kategorie");
  }

  const key = slugifyKey(keyInput || label);

  if (!key) {
    redirect("/admin/settings?category_error=Ung%C3%BCltiger%20Schl%C3%BCssel");
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
      `/admin/settings?category_error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/categories");
  revalidatePath("/onboarding");

  redirect("/admin/settings?category_saved=1");
}