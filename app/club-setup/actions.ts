"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function createClubAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!displayName) {
    redirect("/club-setup?error=missing-name");
  }

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!player) {
    redirect("/onboarding");
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("club_memberships")
    .select("club_id")
    .eq("user_id", user.id);

  if (membershipsError) {
    redirect("/club-setup?error=membership-load-failed");
  }

  const membershipList = memberships ?? [];

  if (membershipList.length === 1) {
    const cookieStore = await cookies();
    cookieStore.set("active_club_id", membershipList[0].club_id, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    redirect("/");
  }

  if (membershipList.length > 1) {
    redirect("/select-club");
  }

  const { data: createdClub, error: clubError } = await adminClient
    .from("clubs")
    .insert({
      name: displayName,
      display_name: displayName,
    })
    .select("id")
    .single();

  if (clubError || !createdClub?.id) {
    redirect("/club-setup?error=club-create-failed");
  }

  const clubId = String(createdClub.id);

  const { error: membershipError } = await adminClient
    .from("club_memberships")
    .insert({
      user_id: user.id,
      club_id: clubId,
      role: "admin",
    });

  if (membershipError) {
    redirect("/club-setup?error=membership-create-failed");
  }

  const { error: settingsError } = await adminClient
    .from("club_settings")
    .insert({
      club_id: clubId,
    });

  if (settingsError) {
    redirect("/club-setup?error=settings-create-failed");
  }

  const cookieStore = await cookies();
  cookieStore.set("active_club_id", clubId, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/");
}