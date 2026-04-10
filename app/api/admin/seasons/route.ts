import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdminRole(role: string | null | undefined) {
  return role === "admin";
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

function getSafeRedirectPath(value: FormDataEntryValue | null) {
  const fallback = "/admin/seasons";

  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  if (trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed || fallback;
}

async function requireSeasonAdmin() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return { error: "login" as const };
  }

  if (!ctx.player) {
    return { error: "onboarding" as const };
  }

  if (!ctx.memberships.length || !ctx.activeClubId) {
    return { error: "select_club" as const };
  }

  const membership =
    ctx.memberships.find((m) => m.club_id === ctx.activeClubId) ?? null;

  if (!membership || !isAdminRole(membership.role)) {
    return { error: "unauthorized" as const };
  }

  return {
    clubId: ctx.activeClubId,
  };
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireSeasonAdmin();

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
    const intent = String(formData.get("intent") ?? "").trim();
    const redirectPath = getSafeRedirectPath(formData.get("redirect_to"));
    const supabase = await createClient();

    if (intent === "create") {
      const name = String(formData.get("name") ?? "").trim();
      const startDate = String(formData.get("start_date") ?? "").trim();
      const endDate = String(formData.get("end_date") ?? "").trim();

      if (!name) {
        return redirectToPath(request, redirectPath, {
          season_error: "Name darf nicht leer sein.",
        });
      }

      const { error } = await supabase.from("seasons").insert({
        club_id: access.clubId,
        name,
        start_date: startDate || null,
        end_date: endDate || null,
      });

      if (error) {
        return redirectToPath(request, redirectPath, {
          season_error: error.message || "Fehler beim Anlegen.",
        });
      }

      return redirectToPath(request, redirectPath, {
        season_message: "Saison angelegt.",
      });
    }

    if (intent === "update") {
      const id = Number(formData.get("season_id") ?? 0);
      const name = String(formData.get("name") ?? "").trim();
      const startDate = String(formData.get("start_date") ?? "").trim();
      const endDate = String(formData.get("end_date") ?? "").trim();

      if (!Number.isFinite(id) || id <= 0) {
        return redirectToPath(request, redirectPath, {
          season_error: "Ungültige Saison.",
        });
      }

      if (!name) {
        return redirectToPath(request, redirectPath, {
          season_error: "Name darf nicht leer sein.",
        });
      }

      const { error } = await supabase
        .from("seasons")
        .update({
          name,
          start_date: startDate || null,
          end_date: endDate || null,
        })
        .eq("id", id)
        .eq("club_id", access.clubId);

      if (error) {
        return redirectToPath(request, redirectPath, {
          season_error: error.message || "Fehler beim Speichern.",
        });
      }

      return redirectToPath(request, redirectPath, {
        season_message: "Saison aktualisiert.",
      });
    }

    if (intent === "delete") {
      const id = Number(formData.get("season_id") ?? 0);

      if (!Number.isFinite(id) || id <= 0) {
        return redirectToPath(request, redirectPath, {
          season_error: "Ungültige Saison.",
        });
      }

      const { error } = await supabase
        .from("seasons")
        .delete()
        .eq("id", id)
        .eq("club_id", access.clubId);

      if (error) {
        return redirectToPath(request, redirectPath, {
          season_error: error.message || "Fehler beim Löschen.",
        });
      }

      return redirectToPath(request, redirectPath, {
        season_message: "Saison gelöscht.",
      });
    }

    return redirectToPath(request, redirectPath, {
      season_error: "Ungültige Aktion.",
    });
  } catch (error) {
    console.error("POST /api/admin/seasons failed", error);

    return redirectToPath(request, "/admin/settings", {
      season_error: "Fehler beim Speichern.",
    });
  }
}