import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";

  if (!authorization.startsWith(prefix)) {
    return null;
  }

  const token = authorization.slice(prefix.length).trim();
  return token || null;
}

type RequestBody = {
  display_name?: string;
};

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing-user",
        },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as RequestBody | null;
    const displayName = String(body?.display_name ?? "").trim();

    if (!displayName) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing-name",
        },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing-user",
        },
        { status: 401 }
      );
    }

    const { data: existingMemberships, error: membershipsError } = await supabase
      .from("club_memberships")
      .select("club_id")
      .eq("user_id", user.id)
      .limit(2);

    if (membershipsError) {
      return NextResponse.json(
        {
          ok: false,
          error: "membership-create-failed",
        },
        { status: 500 }
      );
    }

    const membershipClubIds = Array.from(
      new Set(
        (existingMemberships ?? [])
          .map((entry) => entry.club_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    if (membershipClubIds.length === 1) {
      return NextResponse.json({
        ok: true,
        club_id: membershipClubIds[0],
        redirect_to: "/",
      });
    }

    if (membershipClubIds.length > 1) {
      return NextResponse.json({
        ok: true,
        redirect_to: "/select-club",
      });
    }

    const { data: createdClub, error: clubError } = await supabase
      .from("clubs")
      .insert({
        display_name: displayName,
      })
      .select("id")
      .single();

    if (clubError || !createdClub?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "club-create-failed",
        },
        { status: 500 }
      );
    }

    const clubId = String(createdClub.id);

    const { error: membershipError } = await supabase
      .from("club_memberships")
      .insert({
        user_id: user.id,
        club_id: clubId,
        role: "admin",
      });

    if (membershipError) {
      return NextResponse.json(
        {
          ok: false,
          error: "membership-create-failed",
        },
        { status: 500 }
      );
    }

    const { error: settingsError } = await supabase.from("club_settings").insert({
      club_id: clubId,
    });

    if (settingsError) {
      return NextResponse.json(
        {
          ok: false,
          error: "settings-create-failed",
        },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      club_id: clubId,
      redirect_to: "/",
    });

    response.cookies.set("active_club_id", clubId, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "club-create-failed",
      },
      { status: 500 }
    );
  }
}