"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { slugifyKey } from "./helpers";

function normalizeInternalRedirect(value: FormDataEntryValue | null) {
  const target = String(value ?? "/admin/settings").trim();

  if (!target) return "/admin/settings";
  if (!target.startsWith("/")) return "/admin/settings";
  if (target.startsWith("//")) return "/admin/settings";

  return target;
}

async function getAdminContext() {
  const { clubId, membership, isPowerUser } = await requireClub();

  const hasAdminAccess = canManageClub({
    isPowerUser,
    role: membership.role,
  });

  if (!hasAdminAccess) {
    redirect("/admin");
  }

  const supabase = createAdminClient();

  return { supabase, clubId };
}

function buildRedirectUrlWithParams(
  redirectTo: string | null | undefined,
  params: Record<string, string>
) {
  const target = normalizeInternalRedirect(redirectTo ?? "/admin/settings");
  const separator = target.includes("?") ? "&" : "?";
  const query = new URLSearchParams(params).toString();

  return `${target}${separator}${query}`;
}

async function getActiveCategoryCount(
  supabase: ReturnType<typeof createAdminClient>,
  clubId: string,
  excludeCategoryId?: number
) {
  let query = supabase
    .from("club_categories")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("is_active", true);

  if (excludeCategoryId) {
    query = query.neq("id", excludeCategoryId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

function revalidateSettingsPaths() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/categories");
  revalidatePath("/club-setup");
  revalidatePath("/onboarding");
}

export async function addCategoryAction(formData: FormData) {
  const { supabase, clubId } = await getAdminContext();
  const redirectTo = normalizeInternalRedirect(formData.get("redirect_to"));

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

  const { data: maxRow, error: maxRowError } = await supabase
    .from("club_categories")
    .select("sort_order")
    .eq("club_id", clubId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number | null }>();

  if (maxRowError) {
    redirect(
      buildRedirectUrlWithParams(redirectTo, {
        category_error: maxRowError.message,
      })
    );
  }

  const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;

  let activeCount = 0;

  try {
    activeCount = await getActiveCategoryCount(supabase, clubId);
  } catch (error) {
    redirect(
      buildRedirectUrlWithParams(redirectTo, {
        category_error:
          error instanceof Error ? error.message : "Aktive Kategorien konnten nicht geprüft werden",
      })
    );
  }

  const shouldActivateNewCategory = activeCount < 2;

  const { error } = await supabase.from("club_categories").insert({
    club_id: clubId,
    key,
    label,
    sort_order: nextSortOrder,
    is_active: shouldActivateNewCategory,
  });

  if (error) {
    redirect(
      buildRedirectUrlWithParams(redirectTo, {
        category_error: error.message,
      })
    );
  }

  revalidateSettingsPaths();

  redirect(
    buildRedirectUrlWithParams(redirectTo, {
      category_saved: "1",
      ...(shouldActivateNewCategory
        ? {}
        : {
            category_error:
              "Kategorie wurde angelegt, aber nicht aktiviert. Für die Team-Balance können maximal zwei Kategorien aktiv sein.",
          }),
    })
  );
}

export async function updateCategoryAction(formData: FormData) {
  const { supabase, clubId } = await getAdminContext();
  const redirectTo = normalizeInternalRedirect(formData.get("redirect_to"));

  const id = Number(String(formData.get("id") ?? ""));
  const label = String(formData.get("label") ?? "").trim();
  const keyInput = String(formData.get("key") ?? "").trim();
  const sortOrder = Number(String(formData.get("sort_order") ?? "0"));
  const isActive = formData.get("is_active") === "on";

  if (!Number.isFinite(id) || id <= 0 || !label) {
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

  if (isActive) {
    let activeCountWithoutCurrent = 0;

    try {
      activeCountWithoutCurrent = await getActiveCategoryCount(
        supabase,
        clubId,
        id
      );
    } catch (error) {
      redirect(
        buildRedirectUrlWithParams(redirectTo, {
          category_error:
            error instanceof Error ? error.message : "Aktive Kategorien konnten nicht geprüft werden",
        })
      );
    }

    if (activeCountWithoutCurrent >= 2) {
      redirect(
        buildRedirectUrlWithParams(redirectTo, {
          category_error:
            "Maximal zwei Kategorien können gleichzeitig aktiv sein. Deaktiviere zuerst eine andere Kategorie.",
        })
      );
    }
  }

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

  revalidateSettingsPaths();

  redirect(
    buildRedirectUrlWithParams(redirectTo, {
      category_saved: "1",
    })
  );
}