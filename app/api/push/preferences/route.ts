import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const DEFAULT_PREFERENCES = {
  trainingReminders: true,
  rsvpUpdates: true,
  results: true,
  badges: true,
  announcements: true,
};

type PushPreferenceRow = {
  training_reminders: boolean;
  rsvp_updates: boolean;
  results: boolean;
  badges: boolean;
  announcements: boolean;
};

type PushPreferencePayload = {
  trainingReminders?: unknown;
  rsvpUpdates?: unknown;
  results?: unknown;
  badges?: unknown;
  announcements?: unknown;
};

function mapRow(row: PushPreferenceRow | null) {
  if (!row) return DEFAULT_PREFERENCES;

  return {
    trainingReminders: row.training_reminders,
    rsvpUpdates: row.rsvp_updates,
    results: row.results,
    badges: row.badges,
    announcements: row.announcements,
  };
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export async function GET() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("push_preferences")
    .select("training_reminders, rsvp_updates, results, badges, announcements")
    .eq("user_id", ctx.user.id)
    .maybeSingle<PushPreferenceRow>();

  if (error) {
    return NextResponse.json(
      { error: "Benachrichtigungseinstellungen konnten nicht geladen werden." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, preferences: mapRow(data) });
}

export async function POST(request: Request) {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let payload: PushPreferencePayload;

  try {
    payload = (await request.json()) as PushPreferencePayload;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const values = [
    payload.trainingReminders,
    payload.rsvpUpdates,
    payload.results,
    payload.badges,
    payload.announcements,
  ];

  if (!values.every(isBoolean)) {
    return NextResponse.json(
      { error: "Ungültige Benachrichtigungseinstellungen." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("push_preferences").upsert(
    {
      user_id: ctx.user.id,
      training_reminders: payload.trainingReminders,
      rsvp_updates: payload.rsvpUpdates,
      results: payload.results,
      badges: payload.badges,
      announcements: payload.announcements,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json(
      { error: "Benachrichtigungseinstellungen konnten nicht gespeichert werden." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
