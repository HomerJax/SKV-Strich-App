import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type NotificationRow = {
  id: number;
  club_id: string | null;
  type: string;
  title: string;
  body: string | null;
  cta_href: string | null;
  cta_label: string | null;
  payload: unknown;
  created_at: string;
  seen_at: string | null;
};

type ClubRow = {
  id: string;
  name: string | null;
};

function buildClubAwareHref(clubId: string | null, href: string | null) {
  if (!clubId || !href || !href.startsWith("/") || href.startsWith("//")) {
    return href;
  }

  const params = new URLSearchParams({
    clubId,
    next: href,
  });

  return `/api/select-club?${params.toString()}`;
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_notifications")
    .select(`
      id,
      club_id,
      type,
      title,
      body,
      cta_href,
      cta_label,
      payload,
      created_at,
      seen_at
    `)
    .eq("user_id", user.id)
    .neq("type", "career_badges_launch")
    .is("seen_at", null)
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to load unseen notifications",
        details: error.message,
      },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as NotificationRow[];
  const clubIds = [...new Set(rows.map((row) => row.club_id).filter((id): id is string => Boolean(id)))];

  let clubNameById = new Map<string, string>();

  if (clubIds.length > 0) {
    const { data: clubsData } = await supabase
      .from("clubs")
      .select("id, name")
      .in("id", clubIds);

    clubNameById = new Map(
      ((clubsData ?? []) as ClubRow[])
        .filter((club) => club.name?.trim())
        .map((club) => [club.id, club.name!.trim()])
    );
  }

  const notifications = rows.map((notification) => {
    const clubName = notification.club_id
      ? clubNameById.get(notification.club_id) ?? null
      : null;

    const body =
      notification.type === "training_rsvp_reminder" && clubName
        ? `${clubName} · ${notification.body ?? "Bitte kurz zu- oder absagen."}`
        : notification.body;

    return {
      ...notification,
      body,
      cta_href: buildClubAwareHref(notification.club_id, notification.cta_href),
    };
  });

  return NextResponse.json({ notifications });
}
