"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export type CreateClubState = {
  error: string;
};

function normalizeClubName(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createClubAction(
  _prevState: CreateClubState,
  formData: FormData
): Promise<CreateClubState> {
  const clubName = normalizeClubName(formData.get("name"));

  if (!clubName) {
    return { error: "missing-name" };
  }

  if (clubName.length < 2) {
    return { error: "name-too-short" };
  }

  const supabase = await createClient();
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "not-authenticated" };
  }

  const { data: club, error: clubError } = await adminSupabase
    .from("clubs")
    .insert({
      name: clubName,
      display_name: clubName,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (clubError || !club) {
    return { error: "club-create-failed" };
  }

  const { error: membershipError } = await adminSupabase
    .from("club_memberships")
    .insert({
      club_id: club.id,
      user_id: user.id,
      role: "admin",
    });

  if (membershipError) {
    return { error: "membership-create-failed" };
  }

  const cookieStore = await cookies();
  cookieStore.set("active_club_id", club.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  redirect(AUTH_ROUTES.dashboard);
}