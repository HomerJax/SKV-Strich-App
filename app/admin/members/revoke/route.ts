import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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
  return role === "admin" || role === "owner";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const inviteId = String(formData.get("inviteId") || "").trim();

    const origin = await getRequestOrigin();

    if (!inviteId) {
      return NextResponse.redirect(
        new URL("/admin/members?error=invite_delete_failed", origin)
      );
    }

    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(new URL("/login", origin));
    }

    const { data: membership, error: membershipError } = await supabase
      .from("club_memberships")
      .select("club_id, role")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership || !isAdminRole(membership.role)) {
      return NextResponse.redirect(new URL("/sessions", origin));
    }

    const { error: deleteError } = await supabase
      .from("invites")
      .delete()
      .eq("id", inviteId)
      .eq("club_id", membership.club_id);

    if (deleteError) {
      console.error("revoke invite deleteError:", deleteError);
      return NextResponse.redirect(
        new URL("/admin/members?error=invite_delete_failed", origin)
      );
    }

    return NextResponse.redirect(new URL("/admin/members", origin));
  } catch (error) {
    console.error("revoke invite unexpected error:", error);

    const origin = await getRequestOrigin();

    return NextResponse.redirect(
      new URL("/admin/members?error=invite_delete_failed", origin)
    );
  }
}