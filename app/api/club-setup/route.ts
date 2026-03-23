import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

function redirectWithError(request: NextRequest, code: string) {
  const params = new URLSearchParams();
  params.set("error", code);

  return NextResponse.redirect(buildUrl(request, "/club-setup", params), {
    status: 303,
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const displayName = String(formData.get("display_name") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();

  if (!displayName) {
    return redirectWithError(request, "missing-name");
  }

  if (!userId) {
    return redirectWithError(request, "missing-user");
  }

  const cookieStore = await cookies();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: existingMemberships } = await supabase
    .from("club_memberships")
    .select("club_id")
    .eq("user_id", userId)
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
    return redirectWithError(request, "club-create-failed");
  }

  const clubId = createdClub.id as string;

  const { error: membershipError } = await supabase
    .from("club_memberships")
    .insert({
      user_id: userId,
      club_id: clubId,
      role: "admin",
    });

  if (membershipError) {
    return redirectWithError(request, "membership-create-failed");
  }

  const { error: settingsError } = await supabase.from("club_settings").insert({
    club_id: clubId,
  });

  if (settingsError) {
    return redirectWithError(request, "settings-create-failed");
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