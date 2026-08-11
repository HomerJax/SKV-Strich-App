import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { canManageClub } from "@/lib/auth/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExistingPlayer = {
  id: number;
  category_key: string | null;
  strength: number | null;
};

function toText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function toNullableText(value: FormDataEntryValue | null) {
  const text = toText(value);
  return text.length ? text : null;
}

function toBool(value: FormDataEntryValue | null) {
  return toText(value) === "1";
}

function redirectToAdminPlayers(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/admin/players", request.url);

  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url, { status: 303 });
}

async function requireAdminClubContext() {
  const ctx = await getAuthContext();

  if (!ctx.user) return { error: "login" as const };
  if (!ctx.player && !ctx.isPowerUser) return { error: "onboarding" as const };
  if (!ctx.activeClubId) return { error: "select_club" as const };

  const membership =
    ctx.memberships.find((item) => item.club_id === ctx.activeClubId) ??
    (ctx.isPowerUser ? { club_id: ctx.activeClubId, role: "power_user" } : null);

  if (!canManageClub({ isPowerUser: ctx.isPowerUser, role: membership?.role ?? null })) {
    return { error: "unauthorized" as const };
  }

  return { clubId: ctx.activeClubId };
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdminClubContext();

    if ("error" in access) {
      if (access.error === "login") {
        return NextResponse.redirect(new URL(AUTH_ROUTES.login, request.url), { status: 303 });
      }
      if (access.error === "onboarding") {
        return NextResponse.redirect(new URL(AUTH_ROUTES.onboarding, request.url), { status: 303 });
      }
      if (access.error === "select_club") {
        return NextResponse.redirect(new URL(AUTH_ROUTES.selectClub, request.url), { status: 303 });
      }
      return NextResponse.redirect(new URL(AUTH_ROUTES.dashboard, request.url), { status: 303 });
    }

    const formData = await request.formData();
    const playerIds = formData
      .getAll("player_id")
      .map((value) => Number(toText(value)))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (playerIds.length === 0) {
      return redirectToAdminPlayers(request, {
        error: "Keine Spieler zum Speichern gefunden.",
      });
    }

    const supabase = await createClient();
    const { data: existingPlayers, error: existingError } = await supabase
      .from("players")
      .select("id, category_key, strength")
      .eq("club_id", access.clubId)
      .in("id", playerIds);

    if (existingError || (existingPlayers ?? []).length !== playerIds.length) {
      return redirectToAdminPlayers(request, {
        error: "Kader konnte nicht vollständig geprüft werden.",
      });
    }

    const existingById = new Map(
      ((existingPlayers ?? []) as ExistingPlayer[]).map((player) => [player.id, player])
    );
    const seenEmails = new Map<string, number>();

    const updates = playerIds.map((playerId) => {
      const existing = existingById.get(playerId);
      if (!existing) throw new Error("Spieler nicht gefunden.");

      const firstName = toNullableText(formData.get(`first_name_${playerId}`));
      const lastName = toNullableText(formData.get(`last_name_${playerId}`));
      const nickname = toNullableText(formData.get(`nickname_${playerId}`));
      const rawEmail = toNullableText(formData.get(`email_${playerId}`));
      const email = rawEmail ? rawEmail.toLowerCase() : null;
      const rosterRoleRaw = toNullableText(formData.get(`roster_role_${playerId}`));

      if (email) {
        const existingPlayerId = seenEmails.get(email);
        if (existingPlayerId && existingPlayerId !== playerId) {
          throw new Error(`Doppelte E-Mail im Kader: ${email}`);
        }
        seenEmails.set(email, playerId);
      }

      const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();
      const payload: Record<string, unknown> = {
        first_name: firstName,
        last_name: lastName,
        nickname,
        email,
        preferred_position: toNullableText(
          formData.get(`preferred_position_${playerId}`)
        ),
        balance_group: toNullableText(formData.get(`balance_group_${playerId}`)),
        roster_role: rosterRoleRaw === "staff" ? "staff" : "player",
        is_active: toBool(formData.get(`is_active_${playerId}`)),
        is_guest: toBool(formData.get(`is_guest_${playerId}`)),
        name: displayName || nickname || null,
      };

      const categoryField = `category_key_${playerId}`;
      payload.category_key = formData.has(categoryField)
        ? toNullableText(formData.get(categoryField))
        : existing.category_key;

      const strengthField = `strength_${playerId}`;
      if (formData.has(strengthField)) {
        const strengthRaw = toNullableText(formData.get(strengthField));
        const parsedStrength = strengthRaw ? Number(strengthRaw) : null;
        payload.strength =
          parsedStrength != null && Number.isFinite(parsedStrength)
            ? parsedStrength
            : null;
      } else {
        payload.strength = existing.strength;
      }

      return { playerId, payload };
    });

    const results = await Promise.all(
      updates.map(({ playerId, payload }) =>
        supabase
          .from("players")
          .update(payload)
          .eq("id", playerId)
          .eq("club_id", access.clubId)
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      console.error("Bulk roster update failed", failed.error);
      return redirectToAdminPlayers(request, {
        error: "Kader konnte nicht vollständig gespeichert werden.",
      });
    }

    return redirectToAdminPlayers(request, {
      message: `${playerIds.length} Kader-Einträge gespeichert.`,
    });
  } catch (error) {
    console.error("POST /admin/players/update-all failed", error);
    const message =
      error instanceof Error && error.message.startsWith("Doppelte E-Mail")
        ? error.message
        : "Kader konnte nicht gespeichert werden.";
    return redirectToAdminPlayers(request, { error: message });
  }
}
