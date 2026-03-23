import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function redirectWithError(request: NextRequest, code: string) {
  const url = new URL("/club-setup", request.url);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!displayName) {
    return redirectWithError(request, "missing-name");
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectWithError(request, "not-authenticated");
  }

  const { data: existingMemberships } = await supabase
    .from("club_memberships")
    .select("club_id")
    .eq("user_id", user.id)
    .limit(2);

  if ((existingMemberships ?? []).length === 1) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  if ((existingMemberships ?? []).length > 1) {
    return NextResponse.redirect(new URL("/select-club", request.url), {
      status: 303,
    });
  }

  const { data: createdClub, error: clubError } = await supabase
    .from("clubs")
    .insert({
      display_name: displayName,
    })
    .select("id")
    .single();

  if (clubError || !createdClub) {
    return redirectWithError(request, "club-create-failed");
  }

  const clubId = createdClub.id as string;

  const { error: membershipError } = await supabase
    .from("club_memberships")
    .insert({
      user_id: user.id,
      club_id: clubId,
      role: "admin",
    });

  if (membershipError) {
    return redirectWithError(request, "membership-create-failed");
  }

  const { error: settingsError } = await supabase.from("club_settings").insert({
    club_id: clubId,
  });

  const redirectResponse = NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });

  redirectResponse.cookies.set("active_club_id", clubId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  if (settingsError) {
    const fallbackUrl = new URL("/club-setup", request.url);
    fallbackUrl.searchParams.set("error", "settings-create-failed");
    return NextResponse.redirect(fallbackUrl, { status: 303 });
  }

  return redirectResponse;
}