import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/session-detail/response";
import { requireSessionAccess } from "@/lib/session-detail/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const sessionId = Number(id);

  if (!Number.isFinite(sessionId)) {
    return fail("Ungültige Session-ID.", 400);
  }

  const access = await requireSessionAccess(sessionId);
  if ("error" in access) {
    return fail(access.error ?? "Unbekannter Fehler.", access.status);
  }

  try {
    const payload = (await request.json()) as {
      x?: unknown;
      y?: unknown;
      zoom?: unknown;
    };

    const rawX = Number(payload.x);
    const rawY = Number(payload.y);
    const rawZoom = Number(payload.zoom);

    if (![rawX, rawY, rawZoom].every(Number.isFinite)) {
      return fail("Ungültige Fokus-Daten.", 400);
    }

    const focusX = clamp(rawX, 0, 1);
    const focusY = clamp(rawY, 0, 1);
    const zoom = clamp(rawZoom, 0.75, 2.5);

    const { error } = await access.adminSupabase
      .from("sessions")
      .update({
        winner_photo_focus_x: focusX,
        winner_photo_focus_y: focusY,
        winner_photo_zoom: zoom,
      })
      .eq("id", sessionId)
      .eq("club_id", access.clubId);

    if (error) {
      return fail(error.message, 500);
    }

    return ok({
      message: "Foto-Fokus gespeichert.",
      focusX,
      focusY,
      zoom,
    });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Foto-Fokus konnte nicht gespeichert werden.",
      400
    );
  }
}
