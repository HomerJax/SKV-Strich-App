import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RequestBody = {
  first_name?: string;
  last_name?: string;
  nickname?: string;
  next?: string;
};

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";

  if (!authorization.startsWith(prefix)) {
    return null;
  }

  const token = authorization.slice(prefix.length).trim();
  return token || null;
}

function getSafeNext(nextValue?: string) {
  const value = String(nextValue ?? "").trim();

  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";

  return value;
}

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
      return buildError(
        "Deine Anmeldung ist nicht mehr gültig. Bitte logge dich erneut ein.",
        "Kein Bearer-Token vorhanden.",
        401
      );
    }

    const body = (await request.json().catch(() => null)) as RequestBody | null;

    const firstName = String(body?.first_name ?? "").trim();
    const lastName = String(body?.last_name ?? "").trim();
    const nickname = String(body?.nickname ?? "").trim();
    const nextValue = getSafeNext(body?.next);

    if (!firstName || !lastName) {
      return buildError(
        "Vorname und Nachname sind erforderlich.",
        undefined,
        400
      );
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
        "Deine Anmeldung ist nicht mehr gültig. Bitte logge dich erneut ein.",
        userError?.message ?? "User konnte nicht aus dem Token gelesen werden.",
        401
      );
    }

    const activeClubId = request.cookies.get("active_club_id")?.value ?? null;

    if (!activeClubId) {
      return buildError(
        "Kein aktives Team gefunden.",
        "active_club_id Cookie fehlt.",
        400
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

    const { data: membership, error: membershipError } = await adminClient
      .from("club_memberships")
      .select("club_id")
      .eq("user_id", user.id)
      .eq("club_id", activeClubId)
      .maybeSingle();

    if (membershipError || !membership) {
      return buildError(
        "Dein aktives Team konnte nicht geprüft werden.",
        membershipError?.message ?? "Keine Membership für aktiven Club gefunden.",
        403
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const { data: existingPlayerByUser, error: existingByUserError } =
      await adminClient
        .from("players")
        .select("id")
        .eq("club_id", activeClubId)
        .eq("user_id", user.id)
        .eq("is_guest", false)
        .limit(1)
        .maybeSingle();

    if (existingByUserError) {
      return buildError(
        "Spielerprofil konnte nicht geladen werden.",
        existingByUserError.message
      );
    }

    if (existingPlayerByUser) {
      const { error: updateError } = await adminClient
        .from("players")
        .update({
          first_name: firstName,
          last_name: lastName,
          nickname: nickname || null,
          name: fullName,
          email: user.email ?? null,
          user_id: user.id,
          is_guest: false,
          is_active: true,
        })
        .eq("id", existingPlayerByUser.id);

      if (updateError) {
        return buildError(
          "Profil konnte nicht aktualisiert werden.",
          updateError.message
        );
      }

      return NextResponse.json({
        ok: true,
        redirect_to: nextValue,
      });
    }

    const { data: existingPlayerByMail, error: existingByMailError } =
      await adminClient
        .from("players")
        .select("id")
        .eq("club_id", activeClubId)
        .eq("email", user.email ?? "")
        .eq("is_guest", false)
        .limit(1)
        .maybeSingle();

    if (existingByMailError) {
      return buildError(
        "Spielerprofil konnte nicht geladen werden.",
        existingByMailError.message
      );
    }

    if (existingPlayerByMail) {
      const { error: updateByMailError } = await adminClient
        .from("players")
        .update({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          nickname: nickname || null,
          name: fullName,
          email: user.email ?? null,
          is_guest: false,
          is_active: true,
        })
        .eq("id", existingPlayerByMail.id);

      if (updateByMailError) {
        return buildError(
          "Profil konnte nicht verknüpft werden.",
          updateByMailError.message
        );
      }

      return NextResponse.json({
        ok: true,
        redirect_to: nextValue,
      });
    }

    const { error: insertError } = await adminClient.from("players").insert({
      club_id: activeClubId,
      user_id: user.id,
      email: user.email ?? null,
      first_name: firstName,
      last_name: lastName,
      nickname: nickname || null,
      name: fullName,
      is_guest: false,
      is_active: true,
    });

    if (insertError) {
      return buildError(
        "Spielerprofil konnte nicht erstellt werden.",
        insertError.message
      );
    }

    return NextResponse.json({
      ok: true,
      redirect_to: nextValue,
    });
  } catch (error) {
    return buildError(
      "Onboarding konnte nicht gespeichert werden.",
      error instanceof Error ? error.message : "Unbekannter Serverfehler."
    );
  }
}