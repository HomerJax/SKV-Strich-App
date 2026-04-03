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

  return NextResponse.redirect(nextUrl);
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
    .limit(1)
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
    .select("id, club_id, role, expires_at")
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

  const { error: membershipError } = await adminSupabase
    .from("club_memberships")
    .upsert(
      {
        club_id: invite.club_id,
        user_id: user.id,
        role: invite.role === "admin" ? "admin" : "member",
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

  const response = buildRedirect(requestUrl, "/", {
    message: "Club erfolgreich beigetreten.",
  });

  response.cookies.set("active_club_id", invite.club_id, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });

  return response;
}