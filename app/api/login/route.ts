import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type MembershipRow = {
  club_id: string;
};

type PendingCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
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

function redirectResponse(
  request: NextRequest,
  pathname: string,
  pendingCookies: PendingCookie[],
  search?: URLSearchParams
) {
  const response = NextResponse.redirect(buildUrl(request, pathname, search), {
    status: 303,
  });

  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}

function errorParams(code: string, email?: string) {
  const params = new URLSearchParams();
  params.set("error", code);

  if (email) {
    params.set("email", email);
  }

  return params;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextParam = safeNextPath(String(formData.get("next") ?? "") || null);

  if (!email || !password) {
    return NextResponse.redirect(
      buildUrl(request, "/login", errorParams("missing-fields", email)),
      { status: 303 }
    );
  }

  const cookieStore = await cookies();
  const pendingCookies: PendingCookie[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies.length = 0;

          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
            pendingCookies.push({
              name: cookie.name,
              value: cookie.value,
              options: cookie.options,
            });
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
    return NextResponse.redirect(
      buildUrl(request, "/login", errorParams("invalid-credentials", email)),
      { status: 303 }
    );
  }

  const user = signInData.user;

  const { data: memberships, error: membershipsError } = await supabase
    .from("club_memberships")
    .select("club_id")
    .eq("user_id", user.id);

  if (membershipsError) {
    return NextResponse.redirect(
      buildUrl(request, "/login", errorParams("membership-load-failed", email)),
      { status: 303 }
    );
  }

  const typedMemberships = (memberships ?? []) as MembershipRow[];

  if (typedMemberships.length === 0) {
    return redirectResponse(request, "/club-setup", pendingCookies);
  }

  if (typedMemberships.length === 1) {
    const clubId = typedMemberships[0].club_id;
    const response = redirectResponse(
      request,
      nextParam === "/" ? "/" : nextParam,
      pendingCookies
    );

    response.cookies.set("active_club_id", clubId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });

    return response;
  }

  return redirectResponse(request, "/select-club", pendingCookies);
}