import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { canManageClub } from "@/lib/auth/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function toNullableText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function toBool(value: FormDataEntryValue | null) {
  return String(value ?? "") === "1";
}

function getRequestOrigin(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (host) {
    const proto = host.includes("localhost") ? "http" : forwardedProto;
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}

function redirectToPath(
  request: NextRequest,
  pathname: string,
  params?: Record<string, string>
) {
  const url = new URL(pathname, getRequestOrigin(request));

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(url, { status: 303 });
}

function redirectToAdminPlayers(
  request: NextRequest,
  params?: { error?: string; message?: string }
) {
  const nextParams: Record<string, string> = {};

  if (params?.error) nextParams.error = params.error;
  if (params?.message) nextParams.message = params.message;

  return redirectToPath(request, "/admin/players", nextParams);
}

async function requireAdminClubContext() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return { error: "login" as const };
  }

  if (!ctx.player && !ctx.isPowerUser) {
    return { error: "onboarding" as const };
  }

  if (!ctx.activeClubId) {
    return { error: "select_club" as const };
  }

  if (!ctx.memberships.length && !ctx.isPowerUser) {
    return { error: "select_club" as const };
  }

  const membership =
    ctx.memberships.find((m) => m.club_id === ctx.activeClubId) ??
    (ctx.isPowerUser
      ? {
          club_id: ctx.activeClubId,
          role: "power_user",
        }
      : null);

  const hasAdminAccess = canManageClub({
    isPowerUser: ctx.isPowerUser,
    role: membership?.role ?? null,
  });

  if (!hasAdminAccess) {
    return { error: "unauthorized" as const };
  }

  return {
    clubId: ctx.activeClubId,
  };
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdminClubContext();

    if ("error" in access) {
      if (access.error === "login") {
        return redirectToPath(request, AUTH_ROUTES.login);
      }

      if (access.error === "onboarding") {
        return redirectToPath(request, AUTH_ROUTES.onboarding);
      }

      if (access.error === "select_club") {
        return redirectToPath(request, AUTH_ROUTES.selectClub);
      }

      return redirectToPath(request, AUTH_ROUTES.dashboard);
    }

    const formData = await request.formData();

    const playerId = Number(toText(formData.get("player_id")));
    const firstName = toNullableText(formData.get("first_name"));
    const lastName = toNullableText(formData.get("last_name"));
    const nickname = toNullableText(formData.get("nickname"));
    const emailRaw = toNullableText(formData.get("email"));
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    const preferredPosition = toNullableText(formData.get("preferred_position"));
    const categoryKey = toNullableText(formData.get("category_key"));
    const strengthRaw = toNullableText(formData.get("strength"));
    const isActive = toBool(formData.get("is_active"));
    const isGuest = toBool(formData.get("is_guest"));

    if (!playerId || Number.isNaN(playerId)) {
      return redirectToAdminPlayers(request, {
        error: "Ungültige Spieler-ID.",
      });
    }

    const supabase = await createClient();
    const clubId = access.clubId;

    const { data: existingPlayer, error: existingPlayerError } = await supabase
      .from("players")
      .select("id, club_id")
      .eq("id", playerId)
      .eq("club_id", clubId)
      .limit(1)
      .maybeSingle();

    if (existingPlayerError) {
      return redirectToAdminPlayers(request, {
        error: "Spieler konnte nicht geladen werden.",
      });
    }

    if (!existingPlayer) {
      return redirectToAdminPlayers(request, {
        error: "Spieler nicht gefunden.",
      });
    }

    if (email) {
      const { data: emailConflict, error: emailConflictError } = await supabase
        .from("players")
        .select("id")
        .eq("club_id", clubId)
        .eq("email", email)
        .neq("id", playerId)
        .limit(1)
        .maybeSingle();

      if (emailConflictError) {
        return redirectToAdminPlayers(request, {
          error: "E-Mail konnte nicht geprüft werden.",
        });
      }

      if (emailConflict) {
        return redirectToAdminPlayers(request, {
          error: "Diese E-Mail ist bereits einem anderen Spieler zugeordnet.",
        });
      }
    }

    const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();

    const updatePayload: Record<string, unknown> = {
      first_name: firstName,
      last_name: lastName,
      nickname,
      email,
      preferred_position: preferredPosition,
      category_key: categoryKey,
      is_active: isActive,
      is_guest: isGuest,
      name: displayName || nickname || null,
    };

    if (strengthRaw) {
      const parsedStrength = Number(strengthRaw);

      if (!Number.isNaN(parsedStrength)) {
        updatePayload.strength = parsedStrength;
      }
    } else {
      updatePayload.strength = null;
    }

    const { error: updateError } = await supabase
      .from("players")
      .update(updatePayload)
      .eq("id", playerId)
      .eq("club_id", clubId);

    if (updateError) {
      return redirectToAdminPlayers(request, {
        error: "Spieler konnte nicht gespeichert werden.",
      });
    }

    return redirectToAdminPlayers(request, {
      message: "Spieler erfolgreich gespeichert.",
    });
  } catch (error) {
    console.error("POST /admin/players/update failed", error);

    return redirectToAdminPlayers(request, {
      error: "Spieler konnte nicht gespeichert werden.",
    });
  }
}