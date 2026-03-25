import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/session-detail/response";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { createSignedPhotoUrl } from "@/lib/session-detail/photo";
import { handleTogglePresence } from "@/lib/session-detail/actions/toggle-presence";
import { handleAddGuestPlayer } from "@/lib/session-detail/actions/add-guest-player";
import { handleSaveResult } from "@/lib/session-detail/actions/save-result";
import { handleDeleteResult } from "@/lib/session-detail/actions/delete-result";
import { handleDeleteWinnerPhoto } from "@/lib/session-detail/actions/delete-winner-photo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await context.params;
  const sessionId = Number(resolvedParams.id);

  if (!Number.isFinite(sessionId)) {
    return fail("Ungültige Session-ID.", 400);
  }

  const access = await requireSessionAccess(sessionId);

  if ("error" in access) {
    return fail(access.error ?? "Unbekannter Fehler.", access.status);
  }

  const { supabase, clubId, membership, session } = access;

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const intent = String(formData.get("intent") ?? "").trim();

      if (intent === "upload_winner_photo") {
        const { data: existingResult, error: existingResultError } = await supabase
          .from("results")
          .select("id")
          .eq("session_id", sessionId)
          .maybeSingle();

        if (existingResultError) {
          return fail(existingResultError.message, 500);
        }

        if (!existingResult?.id) {
          return fail(
            "Ein Siegerfoto kann erst hochgeladen werden, wenn ein Ergebnis gespeichert wurde."
          );
        }

        const file = formData.get("file");

        if (!(file instanceof File)) {
          return fail("Bitte ein Bild auswählen.");
        }

        if (!file.type.startsWith("image/")) {
          return fail("Bitte ein Bild auswählen.");
        }

        if (file.size > 10 * 1024 * 1024) {
          return fail("Das Bild ist zu groß. Bitte maximal 10 MB verwenden.");
        }

        const extension = file.name.includes(".")
          ? file.name.split(".").pop()?.toLowerCase() || "jpg"
          : "jpg";

        const safeExt = extension.replace(/[^a-z0-9]/gi, "") || "jpg";
        const newPath = `sessions/${sessionId}/${Date.now()}-winner.${safeExt}`;
        const oldPath = session.winner_photo_path ?? null;

        const { error: uploadError } = await supabase.storage
          .from("session-photos")
          .upload(newPath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          return fail(uploadError.message, 500);
        }

        const { error: updateError } = await supabase
          .from("sessions")
          .update({ winner_photo_path: newPath })
          .eq("id", sessionId)
          .eq("club_id", clubId);

        if (updateError) {
          await supabase.storage.from("session-photos").remove([newPath]);
          return fail(updateError.message, 500);
        }

        if (oldPath) {
          await supabase.storage.from("session-photos").remove([oldPath]);
        }

        const winnerPhotoUrl = await createSignedPhotoUrl(supabase, newPath);

        return ok({
          message: "Siegerfoto hochgeladen.",
          winner_photo_path: newPath,
          winnerPhotoUrl,
        });
      }

      return fail("Ungültige Aktion.", 400);
    }

    const formData = await request.formData();
    const intent = String(formData.get("intent") ?? "").trim();

    if (intent === "toggle_presence") {
      const playerId = Number(String(formData.get("player_id") ?? ""));

      return handleTogglePresence({
        supabase,
        sessionId,
        playerId,
      });
    }

    if (intent === "add_guest_player") {
      const guestName = String(formData.get("guest_name") ?? "");
      const guestPosition = String(formData.get("guest_position") ?? "");
      const guestAgeGroup = String(formData.get("guest_age_group") ?? "");

      return handleAddGuestPlayer({
        supabase,
        sessionId,
        clubId,
        membership,
        guestName,
        guestPosition,
        guestAgeGroup,
      });
    }

    if (intent === "save_result") {
      const goalsA = String(formData.get("goals_a") ?? "");
      const goalsB = String(formData.get("goals_b") ?? "");
      const manualTeamsRaw = String(formData.get("manual_teams") ?? "{}");

      return handleSaveResult({
        supabase,
        sessionId,
        clubId,
        goalsA,
        goalsB,
        manualTeamsRaw,
      });
    }

    if (intent === "delete_result") {
      return handleDeleteResult({
        supabase,
        sessionId,
      });
    }

    if (intent === "delete_winner_photo") {
      return handleDeleteWinnerPhoto({
        supabase,
        sessionId,
        clubId,
        winnerPhotoPath: session.winner_photo_path,
      });
    }

    return fail("Ungültige Aktion.", 400);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler.";
    return fail(message, 500);
  }
}