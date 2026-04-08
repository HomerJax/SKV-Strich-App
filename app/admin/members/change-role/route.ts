import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAuthContext } from "@/lib/auth/context";

async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // in Route Handler hier nicht benötigt
        },
      },
    }
  );
}

async function buildRedirectUrl(path: string) {
  const headerStore = await headers();

  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = headerStore.get("host");

  if (forwardedProto && forwardedHost) {
    return new URL(path, `${forwardedProto}://${forwardedHost}`);
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return new URL(path, process.env.NEXT_PUBLIC_APP_URL);
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return new URL(path, process.env.NEXT_PUBLIC_SITE_URL);
  }

  return new URL(path, `http://${host ?? "localhost:3000"}`);
}

function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "owner";
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const userId = formData.get("userId");
  const role = formData.get("role");

  if (
    typeof userId !== "string" ||
    !userId.trim() ||
    (role !== "admin" && role !== "member")
  ) {
    return NextResponse.redirect(
      await buildRedirectUrl("/admin/members?error=member_role_update_failed"),
      { status: 303 }
    );
  }

  const supabase = await getSupabaseServerClient();
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return NextResponse.redirect(await buildRedirectUrl("/login"), {
      status: 303,
    });
  }

  if (!ctx.activeClubId) {
    return NextResponse.redirect(await buildRedirectUrl("/select-club"), {
      status: 303,
    });
  }

  const activeMembership =
    ctx.memberships.find((membership) => membership.club_id === ctx.activeClubId) ??
    null;

  const hasAdminAccess =
    ctx.isPowerUser || isAdminRole(activeMembership?.role ?? null);

  if (!hasAdminAccess) {
    return NextResponse.redirect(
      await buildRedirectUrl("/admin/members?error=not_allowed"),
      { status: 303 }
    );
  }

  const { data, error } = await supabase.rpc("admin_update_member_role", {
    target_user_id: userId,
    new_role: role,
    target_club_id: ctx.activeClubId,
  });

  if (error) {
    return NextResponse.redirect(
      await buildRedirectUrl("/admin/members?error=member_role_update_failed"),
      { status: 303 }
    );
  }

  if (data === "cannot_change_own_role") {
    return NextResponse.redirect(
      await buildRedirectUrl("/admin/members?error=cannot_change_own_role"),
      { status: 303 }
    );
  }

  if (data === "last_admin_must_remain") {
    return NextResponse.redirect(
      await buildRedirectUrl("/admin/members?error=last_admin_must_remain"),
      { status: 303 }
    );
  }

  if (data !== "ok") {
    return NextResponse.redirect(
      await buildRedirectUrl("/admin/members?error=not_allowed"),
      { status: 303 }
    );
  }

  return NextResponse.redirect(
    await buildRedirectUrl("/admin/members?success=role_updated"),
    { status: 303 }
  );
}