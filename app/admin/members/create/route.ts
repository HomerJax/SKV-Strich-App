import { randomBytes } from "crypto";
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
    const roleValue = formData.get("role");
    const role = roleValue === "admin" ? "admin" : "member";

    const supabase = await getSupabaseServerClient();
    const origin = await getRequestOrigin();

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

    const token = randomBytes(24).toString("hex");

    const { error: insertError } = await supabase.from("invites").insert({
      club_id: membership.club_id,
      token,
      role,
      invited_by: user.id,
    });

    if (insertError) {
      console.error("create invite insertError:", insertError);
      return NextResponse.redirect(
        new URL("/admin/members?error=invite_create_failed", origin)
      );
    }

    return NextResponse.redirect(
      new URL(`/admin/members?created=${token}`, origin)
    );
  } catch (error) {
    console.error("create invite unexpected error:", error);

    const origin = await getRequestOrigin();

    return NextResponse.redirect(
      new URL("/admin/members?error=invite_create_failed", origin)
    );
  }
}