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
  club_id?: string;
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
    const clubId = String(body?.club_id ?? "").trim();

    if (!clubId) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing-club",
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

    const { data: membership, error: membershipError } = await supabase
      .from("club_memberships")
      .select("club_id")
      .eq("user_id", user.id)
      .eq("club_id", clubId)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid-club",
        },
        { status: 403 }
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
        error: "select-club-failed",
      },
      { status: 500 }
    );
  }
}