import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function buildRedirect(request: Request, pathname: string) {
  const url = new URL(pathname, request.url);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const clubId = String(formData.get("club_id") || "").trim();

  if (!clubId) {
    return buildRedirect(request, "/select-club");
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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request, "/login");
  }

  const { data: membership, error } = await supabase
    .from("club_memberships")
    .select("club_id")
    .eq("user_id", user.id)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error || !membership) {
    return buildRedirect(request, "/select-club");
  }

  const response = buildRedirect(request, "/");
  response.cookies.set("active_club_id", clubId, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}