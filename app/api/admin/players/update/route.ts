import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

function getOriginFromHeaders(
  headerStore: Awaited<ReturnType<typeof headers>>,
  request: Request
) {
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = headerStore.get("host");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (host) {
    const protocol =
      host.includes("localhost") || host.includes(":3000") ? "http" : "https";
    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
}

function redirectToAdminPlayers(
  origin: string,
  params?: { error?: string; message?: string }
) {
  const search = new URLSearchParams();

  if (params?.error) search.set("error", params.error);
  if (params?.message) search.set("message", params.message);

  const query = search.toString();

  return NextResponse.redirect(
    new URL(query ? `/admin/players?${query}` : "/admin/players", origin),
    { status: 303 }
  );
}

export async function POST(request: Request) {
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

  const cookieStore = await cookies();
  const headerStore = await headers();
  const origin = getOriginFromHeaders(headerStore, request);

  if (!playerId || Number.isNaN(playerId)) {
    return redirectToAdminPlayers(origin, {
      error: "Ungültige Spieler-ID.",
    });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/", origin), { status: 303 });
  }

  const { data: membership } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (!membership?.club_id) {
    return redirectToAdminPlayers(origin, {
      error: "Kein Admin-Zugriff vorhanden.",
    });
  }

  const clubId = membership.club_id;

  const { data: existingPlayer } = await supabase
    .from("players")
    .select("id, club_id")
    .eq("id", playerId)
    .eq("club_id", clubId)
    .limit(1)
    .maybeSingle();

  if (!existingPlayer) {
    return redirectToAdminPlayers(origin, {
      error: "Spieler nicht gefunden.",
    });
  }

  if (email) {
    const { data: emailConflict } = await supabase
      .from("players")
      .select("id")
      .eq("club_id", clubId)
      .eq("email", email)
      .neq("id", playerId)
      .limit(1)
      .maybeSingle();

    if (emailConflict) {
      return redirectToAdminPlayers(origin, {
        error: "Diese E-Mail ist bereits einem anderen Spieler zugeordnet.",
      });
    }
  }

  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();

  const updatePayload: Record<string, unknown> = {
    first_name: firstName,
    last_name: lastName,
    nickname: nickname,
    email: email,
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
  }

  const { error: updateError } = await supabase
    .from("players")
    .update(updatePayload)
    .eq("id", playerId)
    .eq("club_id", clubId);

  if (updateError) {
    return redirectToAdminPlayers(origin, {
      error: "Spieler konnte nicht gespeichert werden.",
    });
  }

  return redirectToAdminPlayers(origin, {
    message: "Spieler erfolgreich gespeichert.",
  });
}