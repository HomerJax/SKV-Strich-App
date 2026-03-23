import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

function errorParams(code: string) {
  const params = new URLSearchParams();
  params.set("error", code);
  return params;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!displayName) {
    return NextResponse.redirect(
      buildUrl(request, "/club-setup", errorParams("missing-name")),
      { status: 303 }
    );
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      buildUrl(request, "/club-setup", errorParams("not-authenticated")),
      { status: 303 }
    );
  }

  const { data: existingMemberships } = await supabase
    .from("club_memberships")
    .select("club_id")
    .eq("user_id", user.id)
    .limit(2);

  if ((existingMemberships ?? []).length === 1) {
    const clubId = existingMemberships?.[0]?.club_id ?? null;
    const response = NextResponse.redirect(buildUrl(request, "/"), {
      status: 303,
    });

    if (clubId) {
      response.cookies.set("active_club_id", clubId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
      });
    }

    return response;
  }

  if ((existingMemberships ?? []).length > 1) {
    return NextResponse.redirect(buildUrl(request, "/select-club"), {
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
    return NextResponse.redirect(
      buildUrl(request, "/club-setup", errorParams("club-create-failed")),
      { status: 303 }
    );
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
    return NextResponse.redirect(
      buildUrl(request, "/club-setup", errorParams("membership-create-failed")),
      { status: 303 }
    );
  }

  const { error: settingsError } = await supabase.from("club_settings").insert({
    club_id: clubId,
  });

  if (settingsError) {
    return NextResponse.redirect(
      buildUrl(request, "/club-setup", errorParams("settings-create-failed")),
      { status: 303 }
    );
  }

  const response = NextResponse.redirect(buildUrl(request, "/"), {
    status: 303,
  });

  response.cookies.set("active_club_id", clubId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  return response;
}