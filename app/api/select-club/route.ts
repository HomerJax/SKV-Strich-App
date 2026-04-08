import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";

function buildRedirect(request: Request, path: string) {
  return new URL(path, request.url);
}

async function powerUserCanAccessClub(clubId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("clubs")
    .select("id")
    .eq("id", clubId)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(`Club validation failed: ${error.message}`);
  }

  return Boolean(data);
}

async function resolveClubIdFromRequest(request: Request) {
  const url = new URL(request.url);

  if (request.method === "GET") {
    return (url.searchParams.get("clubId") ?? "").trim();
  }

  const formData = await request.formData();
  return String(formData.get("club_id") ?? "").trim();
}

async function handleSelectClub(request: Request) {
  const clubId = await resolveClubIdFromRequest(request);
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return NextResponse.redirect(buildRedirect(request, AUTH_ROUTES.login), {
      status: 303,
    });
  }

  if (!clubId) {
    return NextResponse.redirect(buildRedirect(request, AUTH_ROUTES.selectClub), {
      status: 303,
    });
  }

  let allowed = false;

  if (ctx.isPowerUser) {
    allowed = await powerUserCanAccessClub(clubId);
  } else {
    if (!ctx.player) {
      return NextResponse.redirect(
        buildRedirect(request, AUTH_ROUTES.onboarding),
        {
          status: 303,
        }
      );
    }

    allowed = ctx.memberships.some((membership) => membership.club_id === clubId);
  }

  if (!allowed) {
    return NextResponse.redirect(buildRedirect(request, AUTH_ROUTES.selectClub), {
      status: 303,
    });
  }

  const cookieStore = await cookies();
  cookieStore.set("active_club_id", clubId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.redirect(buildRedirect(request, AUTH_ROUTES.dashboard), {
    status: 303,
  });
}

export async function POST(request: Request) {
  return handleSelectClub(request);
}

export async function GET(request: Request) {
  return handleSelectClub(request);
}