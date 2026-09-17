import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type PresenceBody = {
  path?: string;
};

function safePath(value: unknown) {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("/")) return null;
  return path.slice(0, 500);
}

export async function POST(request: Request) {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return new NextResponse(null, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as PresenceBody | null;
  const admin = createAdminClient();

  const { error } = await admin.from("app_user_presence").upsert(
    {
      user_id: ctx.user.id,
      club_id: ctx.activeClubId,
      path: safePath(body?.path),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("presence heartbeat failed", error);
    return NextResponse.json({ error: "presence_failed" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
