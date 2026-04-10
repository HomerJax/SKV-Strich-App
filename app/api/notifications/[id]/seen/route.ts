import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const notificationId = Number(id);

  if (!Number.isFinite(notificationId)) {
    return NextResponse.json(
      { error: "Invalid notification id" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("user_notifications")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("seen_at", null);

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to mark notification as seen",
        details: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}