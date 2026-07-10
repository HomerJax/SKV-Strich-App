import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type PushSubscriptionStatusRow = {
  platform: string;
  enabled: boolean;
  last_seen_at: string | null;
};

export async function GET() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("platform, enabled, last_seen_at")
    .eq("user_id", ctx.user.id)
    .order("last_seen_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Push-Status konnte nicht geladen werden." },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as PushSubscriptionStatusRow[];

  return NextResponse.json({
    ok: true,
    subscriptions: rows.map((row) => ({
      platform: row.platform,
      enabled: row.enabled,
      lastSeenAt: row.last_seen_at,
    })),
  });
}
