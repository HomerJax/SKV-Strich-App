"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

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

  const { error } = await supabase.rpc("accept_club_invite", {
    p_token: token,
  });

  if (error) {
    const raw = error.message?.toLowerCase() ?? "";

    let message = "Einladung konnte nicht angenommen werden.";

    if (raw.includes("expired")) {
      message = "Diese Einladung ist abgelaufen.";
    } else if (raw.includes("already used")) {
      message = "Diese Einladung wurde bereits verwendet.";
    } else if (raw.includes("inactive")) {
      message = "Diese Einladung ist nicht mehr aktiv.";
    } else if (raw.includes("not found") || raw.includes("invalid")) {
      message = "Diese Einladung ist ungültig.";
    } else if (raw.includes("already a member")) {
      message = "Du bist bereits Mitglied dieses Clubs.";
    }

    redirect(
      buildJoinRedirect({
        token,
        error: message,
      })
    );
  }

  redirect("/?message=Club erfolgreich beigetreten.");
}