import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type MembershipRow = {
  club_id: string;
};

function buildRedirect(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return buildRedirect(request, "/login");
  }

  const cookieStore = await cookies();

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
          }
        },
      },
    }
  );

  const { data: signInData, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error || !signInData.user) {
    return buildRedirect(request, "/login");
  }

  const user = signInData.user;

  const { data: memberships } = await supabase
    .from("club_memberships")
    .select("club_id")
    .eq("user_id", user.id);

  const typedMemberships = (memberships ?? []) as MembershipRow[];

  if (typedMemberships.length === 0) {
    return buildRedirect(request, "/club-setup");
  }

  if (typedMemberships.length === 1) {
    const response = buildRedirect(request, "/");

    response.cookies.set("active_club_id", typedMemberships[0].club_id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });

    return response;
  }

  return buildRedirect(request, "/select-club");
}