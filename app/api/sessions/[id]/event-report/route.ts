import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { canManageClub } from "@/lib/auth/access";
import { createSignedPhotoUrl } from "@/lib/session-detail/photo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function parseScore(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (!/^\d{1,3}$/.test(value)) throw new Error("Bitte ein gültiges Ergebnis von 0 bis 999 eintragen.");
  return Number(value);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const sessionId = Number(id);
  if (!Number.isSafeInteger(sessionId) || sessionId <= 0) return badRequest("Ungültiger Termin.");

  const access = await requireSessionAccess(sessionId);
  if ("error" in access) return badRequest(access.error ?? "Zugriff verweigert.", access.status);
  const { adminSupabase, clubId, membership, isPowerUser, canLeadTraining, session } = access;

  if (session.type !== "event") return badRequest("Spielberichte sind nur für Events verfügbar.");
  if (!canManageClub({ isPowerUser, role: membership.role }) && !canLeadTraining) {
    return badRequest("Nur Admins und Trainingsleiter dürfen diesen Bericht bearbeiten.", 403);
  }

  let uploadedPath: string | null = null;
  try {
    const form = await request.formData();
    const kind = form.get("kind") === "match" ? "match" : "event";
    const title = String(form.get("title") ?? "").trim().slice(0, 160) || null;
    const report = String(form.get("report") ?? "").trim().slice(0, 500) || null;
    const scoreFor = kind === "match" ? parseScore(form.get("score_for")) : null;
    const scoreAgainst = kind === "match" ? parseScore(form.get("score_against")) : null;
    if ((scoreFor === null) !== (scoreAgainst === null)) {
      return badRequest("Bitte entweder beide Tore eintragen oder beide Felder leer lassen.");
    }

    // Re-read under the authenticated club scope before changing the stored photo.
    const { data: current, error: loadError } = await adminSupabase.from("sessions")
      .select("event_photo_path")
      .eq("id", sessionId).eq("club_id", clubId).single();
    if (loadError || !current) return badRequest("Termin konnte nicht geladen werden.", 404);

    const oldPath: string | null = current.event_photo_path ?? null;
    let photoPath: string | null = form.get("delete_photo") === "true" ? null : oldPath;
    const file = form.get("photo");

    if (file instanceof File && file.size > 0) {
      if (!file.type.startsWith("image/") || file.size > MAX_FILE_BYTES) {
        return badRequest("Bitte ein Bild mit maximal 10 MB auswählen.");
      }
      let normalized: Buffer;
      try {
        normalized = await sharp(Buffer.from(await file.arrayBuffer()), {
          failOn: "none",
          limitInputPixels: 40_000_000,
        })
          .rotate()
          .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer();
      } catch {
        return badRequest("Das Bild konnte nicht verarbeitet werden.");
      }
      uploadedPath = "sessions/" + sessionId + "/" + randomUUID() + "-event.jpg";
      const { error: uploadError } = await adminSupabase.storage.from("session-photos")
        .upload(uploadedPath, normalized, {
          cacheControl: "3600",
          contentType: "image/jpeg",
          upsert: false,
        });
      if (uploadError) return badRequest("Foto-Upload fehlgeschlagen.", 500);
      photoPath = uploadedPath;
    }

    // Match scores deliberately stay out of the results table (stats/MVP/badges).
    const { error: saveError } = await adminSupabase.from("sessions")
      .update({
        event_kind: kind,
        event_title: title,
        event_score_for: scoreFor,
        event_score_against: scoreAgainst,
        event_report: report,
        event_photo_path: photoPath,
      })
      .eq("id", sessionId).eq("club_id", clubId);
    if (saveError) {
      if (uploadedPath) await adminSupabase.storage.from("session-photos").remove([uploadedPath]);
      return badRequest("Spielbericht konnte nicht gespeichert werden.", 500);
    }
    if (oldPath && oldPath !== photoPath) {
      await adminSupabase.storage.from("session-photos").remove([oldPath]);
    }
    const photoUrl = await createSignedPhotoUrl(adminSupabase, photoPath);
    return NextResponse.json({
      ok: true,
      kind, title, report,
      scoreFor, scoreAgainst,
      photoUrl,
    });
  } catch (error) {
    if (uploadedPath) await adminSupabase.storage.from("session-photos").remove([uploadedPath]);
    return badRequest(error instanceof Error ? error.message : "Unbekannter Fehler.", 400);
  }
}
