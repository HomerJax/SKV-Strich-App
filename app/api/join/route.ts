import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function buildRedirect(url: URL, pathname: string, params?: Record<string, string>) {
  const nextUrl = new URL(pathname, url.origin);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      nextUrl.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(nextUrl, { status: 303 });
}

function isInviteExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim();
  const requestUrl = new URL(request.url);

  if (!token) {
    return buildRedirect(requestUrl, "/join", {
      error: "Einladungstoken fehlt.",
    });
  }

  const cookieStore = await cookies();

  const authSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return buildRedirect(requestUrl, "/login", {
      next: `/join?token=${encodeURIComponent(token)}`,
    });
  }

  const { data: player, error: playerError } = await authSupabase
    .from("players")
    .select("id, club_id")
    .eq("user_id", user.id)
    .eq("is_guest", false)
    .maybeSingle();

  if (playerError) {
    return buildRedirect(requestUrl, "/join", {
      token,
      error: "Spielerprofil konnte nicht geladen werden.",
    });
  }

  if (!player) {
    return buildRedirect(requestUrl, "/onboarding", {
      next: `/join?token=${encodeURIComponent(token)}`,
    });
  }

  const { data: invite, error: inviteError } = await adminSupabase
    .from("invites")
    .select("id, club_id, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invite) {
    return buildRedirect(requestUrl, "/join", {
      token,
      error: "Einladung nicht gefunden.",
    });
  }

  if (isInviteExpired(invite.expires_at)) {
    return buildRedirect(requestUrl, "/join", {
      token,
      error: "Diese Einladung ist abgelaufen.",
    });
  }

  const membershipRole = invite.role === "admin" ? "admin" : "member";

  const { error: membershipError } = await adminSupabase
    .from("club_memberships")
    .upsert(
      {
        club_id: invite.club_id,
        user_id: user.id,
        role: membershipRole,
      },
      {
        onConflict: "club_id,user_id",
      }
    );

  if (membershipError) {
    return buildRedirect(requestUrl, "/join", {
      token,
      error: "Clubbeitritt konnte nicht gespeichert werden.",
    });
  }

  if (player.club_id !== invite.club_id) {
    const { error: playerUpdateError } = await adminSupabase
      .from("players")
      .update({
        club_id: invite.club_id,
      })
      .eq("id", player.id);

    if (playerUpdateError) {
      return buildRedirect(requestUrl, "/join", {
        token,
        error: "Clubbeitritt gespeichert, aber Spielerprofil konnte nicht aktualisiert werden.",
      });
    }
  }

  if (!invite.accepted_at) {
    const { error: inviteUpdateError } = await adminSupabase
      .from("invites")
      .update({
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (inviteUpdateError) {
      return buildRedirect(requestUrl, "/join", {
        token,
        error: "Clubbeitritt gespeichert, aber Einladung konnte nicht finalisiert werden.",
      });
    }
  }

  const response = buildRedirect(requestUrl, "/", {
    message: "Club erfolgreich beigetreten.",
  });

  response.cookies.set("active_club_id", invite.club_id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}