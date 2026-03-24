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

function buildError(error: string, detail?: string, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      error,
      detail: detail ?? null,
    },
    { status }
  );
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return buildError("missing-user", "Kein Bearer-Token vorhanden.", 401);
    }

    const body = (await request.json().catch(() => null)) as RequestBody | null;
    const displayName = String(body?.display_name ?? "").trim();

    if (!displayName) {
      return buildError("missing-name", "Kein Teamname übergeben.", 400);
    }

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
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
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return buildError(
        "missing-user",
        userError?.message ?? "User konnte nicht aus dem Token gelesen werden.",
        401
      );
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: existingMemberships, error: membershipsError } =
      await adminClient
        .from("club_memberships")
        .select("club_id")
        .eq("user_id", user.id)
        .limit(2);

    if (membershipsError) {
      return buildError(
        "membership-load-failed",
        membershipsError.message,
        500
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
      const clubId = membershipClubIds[0];

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
    }

    if (membershipClubIds.length > 1) {
      return NextResponse.json({
        ok: true,
        redirect_to: "/select-club",
      });
    }

    const { data: createdClub, error: clubError } = await adminClient
      .from("clubs")
      .insert({
        name: displayName,
        display_name: displayName,
      })
      .select("id")
      .single();

    if (clubError || !createdClub?.id) {
      return buildError(
        "club-create-failed",
        clubError?.message ?? "Insert in clubs fehlgeschlagen."
      );
    }

    const clubId = String(createdClub.id);

    const { error: membershipError } = await adminClient
      .from("club_memberships")
      .insert({
        user_id: user.id,
        club_id: clubId,
        role: "admin",
      });

    if (membershipError) {
      return buildError(
        "membership-create-failed",
        membershipError.message
      );
    }

    const { error: settingsError } = await adminClient
      .from("club_settings")
      .insert({
        club_id: clubId,
      });

    if (settingsError) {
      return buildError(
        "settings-create-failed",
        settingsError.message
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
  } catch (error) {
    return buildError(
      "club-create-failed",
      error instanceof Error ? error.message : "Unbekannter Serverfehler."
    );
  }
}