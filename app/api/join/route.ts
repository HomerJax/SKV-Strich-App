import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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
      error: "Invite-Token fehlt.",
    });
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(requestUrl, "/login", {
      next: `/join?token=${encodeURIComponent(token)}`,
    });
  }

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_guest", false)
    .limit(1)
    .maybeSingle();

  if (!player) {
    return buildRedirect(requestUrl, "/onboarding", {
      next: `/join?token=${encodeURIComponent(token)}`,
    });
  }

  const { data: invite, error: inviteError } = await supabase
    .from("club_invites")
    .select("id, club_id, role, expires_at, used_at, is_active")
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invite) {
    return buildRedirect(requestUrl, "/join", {
      token,
      error: "Einladung nicht gefunden.",
    });
  }

  if (invite.is_active === false) {
    return buildRedirect(requestUrl, "/join", {
      token,
      error: "Diese Einladung ist nicht mehr aktiv.",
    });
  }

  if (invite.used_at) {
    return buildRedirect(requestUrl, "/join", {
      token,
      error: "Diese Einladung wurde bereits verwendet.",
    });
  }

  if (isInviteExpired(invite.expires_at)) {
    return buildRedirect(requestUrl, "/join", {
      token,
      error: "Diese Einladung ist abgelaufen.",
    });
  }

  const membershipPayload = {
    club_id: invite.club_id,
    user_id: user.id,
    role: invite.role === "admin" ? "admin" : "member",
  };

  const { error: membershipError } = await supabase
    .from("club_memberships")
    .upsert(membershipPayload, {
      onConflict: "club_id,user_id",
    });

  if (membershipError) {
    return buildRedirect(requestUrl, "/join", {
      token,
      error: "Clubbeitritt konnte nicht gespeichert werden.",
    });
  }

  const { error: inviteUpdateError } = await supabase
    .from("club_invites")
    .update({
      used_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("id", invite.id);

  if (inviteUpdateError) {
    return buildRedirect(requestUrl, "/join", {
      token,
      error: "Clubbeitritt gespeichert, aber Invite konnte nicht finalisiert werden.",
    });
  }

  return buildRedirect(requestUrl, "/", {
    message: "Einladung erfolgreich angenommen.",
  });
}