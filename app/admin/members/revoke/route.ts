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
          // Für diesen Route Handler müssen wir hier keine Cookies setzen.
        },
      },
    }
  );
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const host = forwardedHost || headerStore.get("host") || "localhost:3000";
  const proto =
    forwardedProto || (host.includes("localhost") ? "http" : "https");

  return `${proto}://${host}`;
}

function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const inviteId = String(formData.get("inviteId") || "").trim();

    const origin = await getRequestOrigin();

    if (!inviteId) {
      return NextResponse.redirect(
        new URL("/admin/members?error=invite_delete_failed", origin),
        { status: 303 }
      );
    }

    const supabase = await getSupabaseServerClient();
    const ctx = await getAuthContext();

    if (!ctx.user) {
      return NextResponse.redirect(new URL("/login", origin), { status: 303 });
    }

    if (!ctx.activeClubId) {
      return NextResponse.redirect(new URL("/select-club", origin), {
        status: 303,
      });
    }

    const activeMembership =
      ctx.memberships.find((membership) => membership.club_id === ctx.activeClubId) ??
      null;

    const hasAdminAccess =
      ctx.isPowerUser || isAdminRole(activeMembership?.role ?? null);

    if (!hasAdminAccess) {
      return NextResponse.redirect(new URL("/sessions", origin), { status: 303 });
    }

    const { error: deleteError } = await supabase
      .from("invites")
      .delete()
      .eq("id", inviteId)
      .eq("club_id", ctx.activeClubId);

    if (deleteError) {
      console.error("revoke invite deleteError:", deleteError);
      return NextResponse.redirect(
        new URL("/admin/members?error=invite_delete_failed", origin),
        { status: 303 }
      );
    }

    return NextResponse.redirect(new URL("/admin/members", origin), {
      status: 303,
    });
  } catch (error) {
    console.error("revoke invite unexpected error:", error);

    const origin = await getRequestOrigin();

    return NextResponse.redirect(
      new URL("/admin/members?error=invite_delete_failed", origin),
      { status: 303 }
    );
  }
}