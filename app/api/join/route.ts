import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getServerI18n } from "@/lib/i18n/server";

type PlayerProfileRow = {
  id: number;
  club_id: string | null;
  user_id: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
  preferred_position: "attack" | "defense" | "goalkeeper" | null;
  category_key: string | null;
  strength: number | null;
  is_active: boolean | null;
  age_group: string | null;
};

type ClubCategoryRow = {
  key: string;
};

function buildRedirect(
  url: URL,
  pathname: string,
  params?: Record<string, string>
) {
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
  const { t } = await getServerI18n();
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim();
  const requestUrl = new URL(request.url);

  if (!token) {
    return buildRedirect(requestUrl, "/join", {
      error: t("joinAction.tokenMissing"),
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

  const { data: playerProfiles, error: playerError } = await adminSupabase
    .from("players")
    .select(
      "id, club_id, user_id, name, first_name, last_name, nickname, email, preferred_position, category_key, strength, is_active, age_group"
    )
    .eq("user_id", user.id)
    .eq("is_guest", false);

  if (playerError) {
    console.error("JOIN PLAYER LOAD ERROR:", playerError);

    return buildRedirect(requestUrl, "/join", {
      token,
      error: t("joinAction.playerLoadFailed"),
    });
  }

  const existingProfiles = (playerProfiles as PlayerProfileRow[] | null) ?? [];

  if (existingProfiles.length === 0) {
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
    console.error("JOIN INVITE LOAD ERROR:", inviteError);

    return buildRedirect(requestUrl, "/join", {
      token,
      error: t("joinAction.notFound"),
    });
  }

  if (isInviteExpired(invite.expires_at)) {
    return buildRedirect(requestUrl, "/join", {
      token,
      error: t("joinAction.expired"),
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
    console.error("JOIN MEMBERSHIP UPSERT ERROR:", membershipError);

    return buildRedirect(requestUrl, "/join", {
      token,
      error: t("joinAction.membershipFailed"),
    });
  }

  const existingPlayerInTargetClub = existingProfiles.find(
    (profile) => profile.club_id === invite.club_id
  );

  if (!existingPlayerInTargetClub) {
    const sourceProfile = existingProfiles[0];

    const displayName =
      [sourceProfile.first_name?.trim(), sourceProfile.last_name?.trim()]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      sourceProfile.nickname?.trim() ||
      sourceProfile.name?.trim() ||
      sourceProfile.email?.trim() ||
      user.email?.split("@")[0]?.trim() ||
      t("joinAction.playerFallback");

    let safeCategoryKey: string | null = null;

    if (sourceProfile.category_key) {
      const { data: categoryData, error: categoryError } = await adminSupabase
        .from("club_categories")
        .select("key")
        .eq("club_id", invite.club_id)
        .eq("key", sourceProfile.category_key)
        .eq("is_active", true)
        .maybeSingle<ClubCategoryRow>();

      if (categoryError) {
        console.error("JOIN CATEGORY LOOKUP ERROR:", categoryError);

        return buildRedirect(requestUrl, "/join", {
          token,
          error:
            t("joinAction.categoryCheckFailed"),
        });
      }

      safeCategoryKey = categoryData?.key ?? null;
    }

    const { error: insertError } = await adminSupabase.from("players").insert({
      user_id: user.id,
      club_id: invite.club_id,
      name: displayName,
      first_name: sourceProfile.first_name ?? null,
      last_name: sourceProfile.last_name ?? null,
      nickname: sourceProfile.nickname ?? null,
      email: sourceProfile.email ?? user.email ?? null,
      preferred_position: sourceProfile.preferred_position ?? null,
      category_key: safeCategoryKey,
      strength: sourceProfile.strength ?? null,
      is_guest: false,
      is_active: sourceProfile.is_active ?? true,
      age_group: sourceProfile.age_group ?? null,
    });

    if (insertError) {
      console.error("JOIN PLAYER INSERT ERROR:", insertError);

      return buildRedirect(requestUrl, "/join", {
        token,
        error:
          t("joinAction.playerCreateFailed"),
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
      console.error("JOIN INVITE FINALIZE ERROR:", inviteUpdateError);

      return buildRedirect(requestUrl, "/join", {
        token,
        error:
          t("joinAction.finalizeFailed"),
      });
    }
  }

  const response = buildRedirect(requestUrl, "/", {
    message: t("joinAction.joined"),
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