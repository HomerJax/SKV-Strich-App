import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToProfile(
  request: NextRequest,
  accountDeleteError: string
) {
  const url = new URL("/profile", request.nextUrl.origin);
  url.searchParams.set("account_delete_error", accountDeleteError);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const confirmation = String(formData.get("confirmation") ?? "").trim();
    const acknowledgement = formData.get("acknowledgement") === "1";

    if (confirmation !== "KONTO LÖSCHEN" || !acknowledgement) {
      return redirectToProfile(request, "confirmation");
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(
        new URL("/login", request.nextUrl.origin),
        { status: 303 }
      );
    }

    const admin = createAdminClient();

    const { data: adminMemberships, error: adminMembershipsError } =
      await admin
        .from("club_memberships")
        .select("club_id")
        .eq("user_id", user.id)
        .eq("role", "admin");

    if (adminMembershipsError) {
      console.error(
        "Account deletion: admin memberships could not be loaded",
        adminMembershipsError
      );
      return redirectToProfile(request, "delete_failed");
    }

    for (const membership of adminMemberships ?? []) {
      const { count, error: otherAdminsError } = await admin
        .from("club_memberships")
        .select("id", { count: "exact", head: true })
        .eq("club_id", membership.club_id)
        .eq("role", "admin")
        .neq("user_id", user.id);

      if (otherAdminsError) {
        console.error(
          "Account deletion: other admins could not be checked",
          otherAdminsError
        );
        return redirectToProfile(request, "delete_failed");
      }

      if ((count ?? 0) === 0) {
        return redirectToProfile(request, "sole_admin");
      }
    }

    const { error: anonymizeError } = await admin
      .from("players")
      .update({
        user_id: null,
        email: null,
        first_name: "Gelöschter",
        last_name: "Spieler",
        nickname: null,
        name: "Gelöschter Spieler",
        is_active: false,
      })
      .eq("user_id", user.id);

    if (anonymizeError) {
      console.error(
        "Account deletion: players could not be anonymized",
        anonymizeError
      );
      return redirectToProfile(request, "delete_failed");
    }

    const { error: notificationsError } = await admin
      .from("user_notifications")
      .delete()
      .eq("user_id", user.id);

    if (notificationsError) {
      console.error(
        "Account deletion: notifications could not be deleted",
        notificationsError
      );
      return redirectToProfile(request, "delete_failed");
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      console.error(
        "Account deletion: auth user could not be deleted",
        deleteUserError
      );
      return redirectToProfile(request, "delete_failed");
    }

    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.warn("Account deletion: local sign-out failed", signOutError);
    }

    const response = NextResponse.redirect(
      new URL("/login?account_deleted=1", request.nextUrl.origin),
      { status: 303 }
    );
    response.cookies.delete("active_club_id");

    return response;
  } catch (error) {
    console.error("POST /api/account/delete failed", error);
    return redirectToProfile(request, "delete_failed");
  }
}
