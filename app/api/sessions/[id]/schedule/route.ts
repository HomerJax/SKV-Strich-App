import { NextRequest, NextResponse } from "next/server";
import { canManageClub } from "@/lib/auth/access";
import { requireClub } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

type Scope = "single" | "future" | "series";

type SessionScheduleRow = {
  id: number;
  date: string;
  start_time: string | null;
  series_id: string | null;
  winner_photo_path: string | null;
};

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizeScope(value: unknown): Scope {
  if (value === "future" || value === "series") return value;
  return "single";
}

function toUtcDate(date: string) {
  return new Date(`${date}T12:00:00Z`);
}

function shiftDate(date: string, dayDelta: number) {
  const value = toUtcDate(date);
  value.setUTCDate(value.getUTCDate() + dayDelta);
  return value.toISOString().slice(0, 10);
}

async function getTargetSessions(params: {
  admin: ReturnType<typeof createAdminClient>;
  clubId: string;
  current: SessionScheduleRow;
  scope: Scope;
}) {
  const { admin, clubId, current } = params;
  const scope = current.series_id ? params.scope : "single";

  if (scope === "single") {
    return [current];
  }

  let query = admin
    .from("sessions")
    .select("id,date,start_time,series_id,winner_photo_path")
    .eq("club_id", clubId)
    .eq("series_id", current.series_id!)
    .order("date", { ascending: true });

  if (scope === "future") {
    query = query.gte("date", current.date);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as SessionScheduleRow[];
}

async function requireAdminSession(sessionId: number) {
  const ctx = await requireClub();
  if (
    !canManageClub({
      isPowerUser: ctx.isPowerUser,
      role: ctx.membership.role,
    })
  ) {
    return { error: "Nur Admins dürfen Termine ändern.", status: 403 as const };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sessions")
    .select("id,date,start_time,series_id,winner_photo_path")
    .eq("id", sessionId)
    .eq("club_id", ctx.clubId)
    .maybeSingle<SessionScheduleRow>();

  if (error) {
    return { error: error.message, status: 500 as const };
  }

  if (!data) {
    return { error: "Termin nicht gefunden.", status: 404 as const };
  }

  return { ctx, admin, session: data };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: "Ungültige Session-ID." }, { status: 400 });
  }

  const access = await requireAdminSession(sessionId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await request.json().catch(() => null)) as
    | { date?: string; startTime?: string; scope?: Scope }
    | null;
  const date = String(body?.date ?? "").trim();
  const startTime = String(body?.startTime ?? "").trim();
  const scope = normalizeScope(body?.scope);

  if (!isDate(date) || !isTime(startTime)) {
    return NextResponse.json(
      { error: "Bitte gültiges Datum und Uhrzeit angeben." },
      { status: 400 },
    );
  }

  try {
    const targets = await getTargetSessions({
      admin: access.admin,
      clubId: access.ctx.clubId,
      current: access.session,
      scope,
    });

    const dayDelta = Math.round(
      (toUtcDate(date).getTime() - toUtcDate(access.session.date).getTime()) /
        86_400_000,
    );

    const updates = targets.map((target) => ({
      id: target.id,
      date:
        target.id === access.session.id
          ? date
          : shiftDate(target.date, dayDelta),
      start_time: startTime,
    }));

    for (const update of updates) {
      const { error } = await access.admin
        .from("sessions")
        .update({
          date: update.date,
          start_time: update.start_time,
        })
        .eq("id", update.id)
        .eq("club_id", access.ctx.clubId);

      if (error) throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      updated: updates.length,
      message:
        updates.length === 1
          ? "Termin aktualisiert."
          : `${updates.length} Termine der Serie aktualisiert.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Termin konnte nicht geändert werden.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: "Ungültige Session-ID." }, { status: 400 });
  }

  const access = await requireAdminSession(sessionId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await request.json().catch(() => null)) as
    | { scope?: Scope }
    | null;
  const scope = normalizeScope(body?.scope);

  try {
    const targets = await getTargetSessions({
      admin: access.admin,
      clubId: access.ctx.clubId,
      current: access.session,
      scope,
    });
    const ids = targets.map((entry) => entry.id);
    const photoPaths = targets
      .map((entry) => entry.winner_photo_path)
      .filter((value): value is string => Boolean(value));

    if (photoPaths.length > 0) {
      await access.admin.storage.from("session-photos").remove(photoPaths);
    }

    const { error } = await access.admin
      .from("sessions")
      .delete()
      .eq("club_id", access.ctx.clubId)
      .in("id", ids);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      deleted: ids.length,
      message:
        ids.length === 1
          ? "Termin gelöscht."
          : `${ids.length} Termine der Serie gelöscht.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Termin konnte nicht gelöscht werden.",
      },
      { status: 500 },
    );
  }
}
