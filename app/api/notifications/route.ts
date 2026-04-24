import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type NotificationRow = {
  id: number;
  user_id: string;
  club_id: string | null;
  type: string;
  title: string;
  body: string | null;
  cta_href: string | null;
  cta_label: string | null;
  secondary_cta_href: string | null;
  secondary_cta_label: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  seen_at: string | null;
};

export async function GET(_request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_notifications")
    .select(
      `
      id,
      user_id,
      club_id,
      type,
      title,
      body,
      cta_href,
      cta_label,
      secondary_cta_href,
      secondary_cta_label,
      payload,
      created_at,
      seen_at
    `
    )
    .eq("user_id", user.id)
    .is("seen_at", null)
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const notifications = ((data ?? []) as NotificationRow[]).map((item) => ({
    id: item.id,
    userId: item.user_id,
    clubId: item.club_id ?? null,
    type: item.type,
    title: item.title,
    body: item.body,
    cta_href: item.cta_href,
    cta_label: item.cta_label,
    secondary_cta_href: item.secondary_cta_href,
    secondary_cta_label: item.secondary_cta_label,
    payload: item.payload,
    created_at: item.created_at,
    seen_at: item.seen_at,
  }));

  return NextResponse.json({
    notifications,
    unreadCount: notifications.length,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const intent = typeof body?.intent === "string" ? body.intent : null;
  const notificationId =
    typeof body?.notificationId === "number" ? body.notificationId : null;
  const markAll = body?.markAll === true || intent === "mark_all_seen";

  if (markAll) {
    const { error } = await supabase
      .from("user_notifications")
      .update({ seen_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("seen_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, markAll: true });
  }

  if (intent !== "mark_seen" || !notificationId) {
    return NextResponse.json(
      { error: "Es wurde keine gültige Notification-Aktion übergeben." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("user_notifications")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("seen_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    notificationId,
  });
}