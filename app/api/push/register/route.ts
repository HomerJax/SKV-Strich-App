import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

type PushPlatform = "ios" | "android" | "web" | "unknown";

function normalizePlatform(value: unknown): PushPlatform {
  if (value === "ios" || value === "android" || value === "web") {
    return value;
  }

  return "unknown";
}

export async function POST(request: Request) {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const payload = body as {
    token?: unknown;
    platform?: unknown;
    appVersion?: unknown;
  };

  const token = typeof payload.token === "string" ? payload.token.trim() : "";

  if (!token || token.length < 20) {
    return NextResponse.json(
      { error: "Push Token fehlt oder ist ungültig." },
      { status: 400 },
    );
  }

  const platform = normalizePlatform(payload.platform);
  const appVersion =
    typeof payload.appVersion === "string"
      ? payload.appVersion.trim().slice(0, 80)
      : null;

  const now = new Date().toISOString();
  const supabase = createAdminClient();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: ctx.user.id,
      club_id: ctx.activeClubId,
      token,
      platform,
      app_version: appVersion,
      enabled: true,
      last_seen_at: now,
      updated_at: now,
    },
    { onConflict: "token" },
  );

  if (error) {
    console.error("Failed to register push token", error);
    return NextResponse.json(
      { error: "Push Token konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
