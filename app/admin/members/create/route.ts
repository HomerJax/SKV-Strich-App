import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuthContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

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

function normalizeInternalRedirect(value: FormDataEntryValue | null) {
  const target = String(value ?? "").trim();

  if (!target) return "";
  if (!target.startsWith("/")) return "";
  if (target.startsWith("//")) return "";

  return target;
}

function buildRedirectWithParams(
  origin: string,
  fallbackPath: string,
  redirectTo: string,
  params: Record<string, string>
) {
  const url = new URL(redirectTo || fallbackPath, origin);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url;
}

export async function POST(request: Request) {
  const origin = await getRequestOrigin();

  try {
    const formData = await request.formData();
    const roleValue = formData.get("role");
    const role = roleValue === "admin" ? "admin" : "member";
    const redirectTo = normalizeInternalRedirect(formData.get("redirect_to"));

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
      ctx.memberships.find(
        (membership) => membership.club_id === ctx.activeClubId
      ) ?? null;

    const hasAdminAccess =
      ctx.isPowerUser || isAdminRole(activeMembership?.role ?? null);

    if (!hasAdminAccess) {
      return NextResponse.redirect(new URL("/sessions", origin), {
        status: 303,
      });
    }

    const token = randomBytes(24).toString("hex");
    const supabase = createAdminClient();

    const { error: insertError } = await supabase.from("invites").insert({
      club_id: ctx.activeClubId,
      token,
      role,
      invited_by: ctx.user.id,
    });

    if (insertError) {
      console.error("create invite insertError:", insertError);

      if (redirectTo) {
        return NextResponse.redirect(
          buildRedirectWithParams(origin, "/admin/members", redirectTo, {
            invite_error: "invite_create_failed",
          }),
          { status: 303 }
        );
      }

      return NextResponse.redirect(
        new URL("/admin/members?error=invite_create_failed", origin),
        { status: 303 }
      );
    }

    if (redirectTo) {
      return NextResponse.redirect(
        buildRedirectWithParams(origin, "/admin/members", redirectTo, {
          invite_created: "1",
          invite_token: token,
        }),
        { status: 303 }
      );
    }

    return NextResponse.redirect(
      new URL(`/admin/members?created=${token}`, origin),
      { status: 303 }
    );
  } catch (error) {
    console.error("create invite unexpected error:", error);

    return NextResponse.redirect(
      new URL("/admin/members?error=invite_create_failed", origin),
      { status: 303 }
    );
  }
}