import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";
import { fail, ok } from "@/lib/session-detail/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NotificationRow = {
  id: number;
  user_id: string;
  club_id: string;
  type: string;
  title: string;
  body: string | null;
  cta_href: string | null;
  cta_label: string | null;
  secondary_cta_href: string | null;
  secondary_cta_label: string | null;
  payload: Record<string, unknown> | null;
  seen_at: string | null;
  read_at: string | null;
  created_at: string;
};

export async function GET() {
  try {
    const ctx = await getAuthContext();

    if (!ctx.user) {
      return fail("Nicht eingeloggt.", 401);
    }

    if (!ctx.activeClubId) {
      return ok({ notifications: [] });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_notifications")
      .select(
        "id, user_id, club_id, type, title, body, cta_href, cta_label, secondary_cta_href, secondary_cta_label, payload, seen_at, read_at, created_at"
      )
      .eq("user_id", ctx.user.id)
      .eq("club_id", ctx.activeClubId)
      .is("seen_at", null)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      return fail(`Notifications konnten nicht geladen werden: ${error.message}`, 500);
    }

    return ok({
      notifications: (data ?? []) as NotificationRow[],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler.";
    return fail(message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext();

    if (!ctx.user) {
      return fail("Nicht eingeloggt.", 401);
    }

    if (!ctx.activeClubId) {
      return fail("Kein aktiver Club gesetzt.", 400);
    }

    const body = (await request.json().catch(() => null)) as
      | { intent?: string; notificationId?: number | string | null }
      | null;

    const intent = body?.intent;
    const notificationId = Number(body?.notificationId);

    if (intent !== "mark_seen") {
      return fail("Ungültige Aktion.", 400);
    }

    if (!Number.isFinite(notificationId)) {
      return fail("Ungültige Notification-ID.", 400);
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("user_notifications")
      .update({
        seen_at: new Date().toISOString(),
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("user_id", ctx.user.id)
      .eq("club_id", ctx.activeClubId);

    if (error) {
      return fail(`Notification konnte nicht aktualisiert werden: ${error.message}`, 500);
    }

    return ok({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler.";
    return fail(message, 500);
  }
}