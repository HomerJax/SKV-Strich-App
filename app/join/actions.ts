"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function getSafeJoinUrl(token: string) {
  const search = new URLSearchParams();
  if (token) search.set("token", token);
  return `/join?${search.toString()}`;
}

function buildJoinRedirect(params: {
  token: string;
  error?: string;
  message?: string;
}) {
  const search = new URLSearchParams();
  search.set("token", params.token);

  if (params.error) search.set("error", params.error);
  if (params.message) search.set("message", params.message);

  return `/join?${search.toString()}`;
}

export async function acceptInviteAction(formData: FormData) {
  const token = normalizeText(formData.get("token"));

  if (!token) {
    redirect("/join?error=Einladungstoken fehlt.");
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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
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
  } = await supabase.auth.getUser();

  const joinUrl = getSafeJoinUrl(token);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(joinUrl)}`);
  }

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_guest", false)
    .limit(1)
    .maybeSingle();

  if (!player) {
    redirect(`/onboarding?next=${encodeURIComponent(joinUrl)}`);
  }

  const { data: invite, error: inviteLookupError } = await adminSupabase
    .from("invites")
    .select("club_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteLookupError || !invite) {
    redirect(
      buildJoinRedirect({
        token,
        error: "Diese Einladung ist ungültig.",
      })
    );
  }

  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    redirect(
      buildJoinRedirect({
        token,
        error: "Diese Einladung ist abgelaufen.",
      })
    );
  }

  const { error } = await supabase.rpc("accept_club_invite", {
    p_token: token,
  });

  if (error) {
    const raw = error.message?.toLowerCase() ?? "";

    let message = "Einladung konnte nicht angenommen werden.";

    if (raw.includes("expired")) {
      message = "Diese Einladung ist abgelaufen.";
    } else if (raw.includes("already used")) {
      message =
        "Dieser Link wurde serverseitig bereits als verwendet markiert. Bitte prüfe die Datenbankfunktion accept_club_invite.";
    } else if (raw.includes("inactive")) {
      message = "Diese Einladung ist nicht mehr aktiv.";
    } else if (raw.includes("not found") || raw.includes("invalid")) {
      message = "Diese Einladung ist ungültig.";
    } else if (raw.includes("already a member")) {
      cookieStore.set("active_club_id", invite.club_id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });

      redirect("/?message=Du bist bereits Mitglied dieses Clubs.");
    }

    redirect(
      buildJoinRedirect({
        token,
        error: message,
      })
    );
  }

  cookieStore.set("active_club_id", invite.club_id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/?message=Club erfolgreich beigetreten.");
}