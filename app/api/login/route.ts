import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type MembershipRow = {
  club_id: string;
};

function buildUrl(
  request: NextRequest,
  pathname: string,
  search?: URLSearchParams
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search ? search.toString() : "";
  return url;
}

function buildErrorRedirect(
  request: NextRequest,
  code: string,
  email?: string
) {
  const params = new URLSearchParams();
  params.set("error", code);

  if (email) {
    params.set("email", email);
  }

  return NextResponse.redirect(buildUrl(request, "/login", params), {
    status: 303,
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return buildErrorRedirect(request, "missing-fields", email);
  }

  const cookieStore = await cookies();

  let targetPath = "/";
  let activeClubId: string | null = null;

  const response = NextResponse.redirect(buildUrl(request, "/"), {
    status: 303,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
            response.cookies.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    }
  );

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError || !signInData.user) {
    return buildErrorRedirect(request, "invalid-credentials", email);
  }

  const user = signInData.user;

  const { data: memberships, error: membershipsError } = await supabase
    .from("club_memberships")
    .select("club_id")
    .eq("user_id", user.id);

  if (membershipsError) {
    return buildErrorRedirect(request, "membership-load-failed", email);
  }

  const typedMemberships = (memberships ?? []) as MembershipRow[];

  if (typedMemberships.length === 0) {
    targetPath = "/club-setup";
  } else if (typedMemberships.length === 1) {
    targetPath = "/";
    activeClubId = typedMemberships[0].club_id;
  } else {
    targetPath = "/select-club";
  }

  response.headers.set("Location", buildUrl(request, targetPath).toString());

  if (activeClubId) {
    response.cookies.set("active_club_id", activeClubId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }

  response.headers.set("Cache-Control", "private, no-store");

  return response;
}