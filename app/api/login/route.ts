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

function buildErrorRedirect(request: NextRequest, code: string, email?: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", code);

  if (email) {
    url.searchParams.set("email", email);
  }

  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextParam = safeNextPath(String(formData.get("next") ?? "") || null);

  if (!email || !password) {
    return buildErrorRedirect(request, "missing-fields", email);
  }

  const cookieStore = await cookies();
  const response = NextResponse.next();

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
    return NextResponse.redirect(new URL("/club-setup", request.url), {
      status: 303,
    });
  }

  if (typedMemberships.length === 1) {
    const clubId = typedMemberships[0].club_id;
    const redirectTo = nextParam === "/" ? "/" : nextParam;

    const redirectResponse = NextResponse.redirect(
      new URL(redirectTo, request.url),
      { status: 303 }
    );

    redirectResponse.cookies.set("active_club_id", clubId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });

    return redirectResponse;
  }

  return NextResponse.redirect(new URL("/select-club", request.url), {
    status: 303,
  });
}