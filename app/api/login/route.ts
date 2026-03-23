import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type MembershipRow = {
  club_id: string;
};

function safeNextPath(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.startsWith("/login")) return "/";
  if (value.startsWith("/signup")) return "/";
  return value;
}

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

function createRedirectResponse(
  request: NextRequest,
  pathname: string,
  search?: URLSearchParams
) {
  return NextResponse.redirect(buildUrl(request, pathname, search), {
    status: 303,
  });
}

function buildErrorParams(code: string, email?: string) {
  const params = new URLSearchParams();
  params.set("error", code);

  if (email) {
    params.set("email", email);
  }

  return params;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextParam = safeNextPath(String(formData.get("next") ?? "") || null);

  if (!email || !password) {
    return createRedirectResponse(
      request,
      "/login",
      buildErrorParams("missing-fields", email)
    );
  }

  const cookieStore = await cookies();
  const response = createRedirectResponse(request, "/");

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
    return createRedirectResponse(
      request,
      "/login",
      buildErrorParams("invalid-credentials", email)
    );
  }

  const user = signInData.user;

  const { data: memberships, error: membershipsError } = await supabase
    .from("club_memberships")
    .select("club_id")
    .eq("user_id", user.id);

  if (membershipsError) {
    return createRedirectResponse(
      request,
      "/login",
      buildErrorParams("membership-load-failed", email)
    );
  }

  const typedMemberships = (memberships ?? []) as MembershipRow[];

  if (typedMemberships.length === 0) {
    const noClubResponse = createRedirectResponse(request, "/club-setup");

    for (const cookie of response.cookies.getAll()) {
      noClubResponse.cookies.set(cookie);
    }

    return noClubResponse;
  }

  if (typedMemberships.length === 1) {
    const clubId = typedMemberships[0].club_id;
    const targetPath = nextParam === "/" ? "/" : nextParam;
    const targetResponse = createRedirectResponse(request, targetPath);

    for (const cookie of response.cookies.getAll()) {
      targetResponse.cookies.set(cookie);
    }

    targetResponse.cookies.set("active_club_id", clubId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });

    return targetResponse;
  }

  const multiClubResponse = createRedirectResponse(request, "/select-club");

  for (const cookie of response.cookies.getAll()) {
    multiClubResponse.cookies.set(cookie);
  }

  return multiClubResponse;
}