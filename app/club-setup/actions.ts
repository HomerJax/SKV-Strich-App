"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth/context";
import { ensureDefaultSeasonForClub } from "@/lib/seasons/default-season";

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function splitName(fullName: string | null | undefined) {
  const value = (fullName ?? "").trim();

  if (!value) {
    return {
      firstName: "Spieler",
      lastName: "",
    };
  }

  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function getFallbackNameFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;

  if (fullName && fullName.trim()) {
    return splitName(fullName);
  }

  const emailPrefix = user.email?.split("@")[0]?.trim();

  if (emailPrefix) {
    return splitName(emailPrefix);
  }

  return {
    firstName: "Spieler",
    lastName: "",
  };
}

export async function createClubAction(formData: FormData) {
  const auth = await getAuthContext();

  if (!auth.user) {
    redirect("/login");
  }

  const name = getStringValue(formData.get("name"));

  if (!name) {
    redirect("/club-setup?error=missing-name");
  }

  const supabase = await createClient();

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .insert({
      display_name: name,
      sport_type: "football",
    })
    .select("id")
    .single();

  if (clubError || !club?.id) {
    redirect("/club-setup?error=club-create-failed");
  }

  const clubId = club.id as string;

  const { error: membershipError } = await supabase
    .from("club_memberships")
    .insert({
      club_id: clubId,
      user_id: auth.user.id,
      role: "admin",
    });

  if (membershipError) {
    redirect("/club-setup?error=membership-create-failed");
  }

  const { error: settingsError } = await supabase.from("club_settings").insert({
    club_id: clubId,
  });

  if (settingsError) {
    redirect("/club-setup?error=settings-create-failed");
  }

  const adminSupabase = createAdminClient();

  const { error: defaultSeasonError } = await ensureDefaultSeasonForClub(
    adminSupabase,
    clubId
  );

  if (defaultSeasonError) {
    console.error("default season create failed:", defaultSeasonError);
    redirect("/club-setup?error=season-create-failed");
  }

  const { error: billingError } = await adminSupabase
    .from("club_billing")
    .upsert(
      {
        club_id: clubId,
        plan_key: "supercup_trial",
        status: "active",
        trial_ends_at: "2026-07-31T21:59:59.000Z",
        pro_ends_at: "2026-07-31T21:59:59.000Z",
        billing_note: "Automatisch beim Club-Setup als Supercup Trial bis Ende Juli angelegt.",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "club_id",
      }
    );

  if (billingError) {
    redirect("/club-setup?error=settings-create-failed");
  }

  const existingPlayer = auth.player;
  const fallbackName = getFallbackNameFromUser(auth.user);

  const firstName =
    existingPlayer?.first_name?.trim() || fallbackName.firstName || "Spieler";
  const lastName = existingPlayer?.last_name?.trim() || fallbackName.lastName || "";
  const nickname = existingPlayer?.nickname?.trim() || null;

  const { error: playerError } = await supabase.from("players").insert({
    club_id: clubId,
    user_id: auth.user.id,
    first_name: firstName,
    last_name: lastName,
    nickname,
    is_guest: false,
    is_active: true,
  });

  if (playerError) {
    redirect("/club-setup?error=player-link-failed");
  }

  const cookieStore = await cookies();

  cookieStore.set("active_club_id", clubId, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  revalidatePath("/club-setup");

  redirect("/club-setup?created=1");
}