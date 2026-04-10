import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type NotificationRow = {
  id: number;
  user_id: string;
  club_id: string | null;
  type: string;
  title: string;
  body: string;
  created_at: string;
  read_at?: string | null;
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
    .select("id, user_id, club_id, type, title, body, created_at, read_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

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
    createdAt: item.created_at,
    readAt: item.read_at ?? null,
  }));

  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((item) => !item.readAt).length,
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
  const notificationId =
    typeof body?.notificationId === "number" ? body.notificationId : null;
  const markAll = body?.markAll === true;

  if (!markAll && !notificationId) {
    return NextResponse.json(
      { error: "Es wurde keine Notification-ID übergeben." },
      { status: 400 }
    );
  }

  if (markAll) {
    const { error } = await supabase
      .from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, markAll: true });
  }

  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    notificationId,
  });
}