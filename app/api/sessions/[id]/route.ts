import { NextRequest } from "next/server";
import sharp from "sharp";
import { fail, ok } from "@/lib/session-detail/response";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { createSignedPhotoUrl } from "@/lib/session-detail/photo";
import { handleTogglePresence } from "@/lib/session-detail/actions/toggle-presence";
import { handleAddGuestPlayer } from "@/lib/session-detail/actions/add-guest-player";
import { handleSaveResult } from "@/lib/session-detail/actions/save-result";
import { handleDeleteResult } from "@/lib/session-detail/actions/delete-result";
import { handleDeleteWinnerPhoto } from "@/lib/session-detail/actions/delete-winner-photo";
import { canManageClub } from "@/lib/auth/access";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_WIDTH = 1800;
const MAX_OUTPUT_HEIGHT = 1800;

async function normalizeWinnerPhoto(file: File): Promise<{
  buffer: Buffer;
  contentType: "image/jpeg";
  extension: "jpg";
}> {
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  const normalizedBuffer = await sharp(inputBuffer, {
    failOn: "none",
    limitInputPixels: 40_000_000,
  })
    .rotate()
    .resize({
      width: MAX_OUTPUT_WIDTH,
      height: MAX_OUTPUT_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 88,
      mozjpeg: true,
    })
    .toBuffer();

  return {
    buffer: normalizedBuffer,
    contentType: "image/jpeg",
    extension: "jpg",
  };
}

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

  const {
    supabase,
    adminSupabase,
    clubId,
    membership,
    session,
    isPowerUser,
    currentUserEmail,
  } = access;

  try {
    const formData = await request.formData();
    const intent = String(formData.get("intent") ?? "").trim();

    if (intent === "toggle_presence") {
      const requestedPlayerId = Number(String(formData.get("player_id") ?? ""));

      if (!Number.isFinite(requestedPlayerId)) {
        return fail("Ungültige Spieler-ID.", 400);
      }

      return handleTogglePresence({
        supabase: adminSupabase,
        sessionId,
        clubId,
        playerId: requestedPlayerId,
      });
    }

    if (intent === "set_self_presence") {
      const featureFlags = await getFeatureFlagsForClub(clubId);
      const homeSessionRsvpEnabled = featureFlags.home_session_rsvp === true;

      if (!homeSessionRsvpEnabled) {
        return fail(
          "Die Zu-/Absage über den Homescreen ist für dieses Team noch nicht freigeschaltet.",
          403
        );
      }

      if (session.winner_photo_path) {
        return fail(
          "Für diese Session ist bereits alles abgeschlossen. Deine Rückmeldung kann nicht mehr geändert werden.",
          400
        );
      }

      const status = String(formData.get("status") ?? "").trim();

      if (status !== "in" && status !== "out") {
        return fail("Ungültiger Status.", 400);
      }

      const userEmail = currentUserEmail;

      if (!userEmail) {
        return fail("Benutzer konnte nicht aufgelöst werden.", 401);
      }

      const { data: playerData, error: playerError } = await adminSupabase
        .from("players")
        .select("id")
        .eq("club_id", clubId)
        .eq("email", userEmail)
        .maybeSingle();

      if (playerError) {
        return fail(
          `Spielerprofil konnte nicht geladen werden: ${playerError.message}`,
          500
        );
      }

      const playerId = Number(playerData?.id);

      if (!Number.isFinite(playerId)) {
        return fail(
          "Dein Spielerprofil konnte nicht gefunden werden. Bitte wende dich an einen Admin.",
          404
        );
      }

      if (status === "in") {
        const { error: insertError } = await adminSupabase
          .from("session_players")
          .upsert(
            {
              session_id: sessionId,
              player_id: playerId,
            },
            {
              onConflict: "session_id,player_id",
            }
          );

        if (insertError) {
          return fail(
            `Zusage konnte nicht gespeichert werden: ${insertError.message}`,
            500
          );
        }

        return ok({
          message: "Du bist dabei beim Training.",
          status: "in",
        });
      }

      const { error: deleteError } = await adminSupabase
        .from("session_players")
        .delete()
        .eq("session_id", sessionId)
        .eq("player_id", playerId);

      if (deleteError) {
        return fail(
          `Absage konnte nicht gespeichert werden: ${deleteError.message}`,
          500
        );
      }

      return ok({
        message: "Du setzt dieses Mal aus.",
        status: "out",
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

    if (intent === "delete_session") {
      const hasAdminAccess = canManageClub({
        isPowerUser,
        role: membership.role,
      });

      if (!hasAdminAccess) {
        return fail("Nur Admins dürfen eine Session löschen.", 403);
      }

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id")
        .eq("session_id", sessionId);

      if (teamsError) {
        return fail(
          `Teams konnten nicht geladen werden: ${teamsError.message}`,
          500
        );
      }

      const teamIds = (teamsData ?? [])
        .map((team) => Number(team.id))
        .filter(Boolean);

      if (teamIds.length > 0) {
        const { error: teamPlayersDeleteError } = await supabase
          .from("team_players")
          .delete()
          .in("team_id", teamIds);

        if (teamPlayersDeleteError) {
          return fail(
            `Team-Zuordnungen konnten nicht gelöscht werden: ${teamPlayersDeleteError.message}`,
            500
          );
        }
      }

      const { error: mvpVotesDeleteError } = await supabase
        .from("session_mvp_votes")
        .delete()
        .eq("session_id", sessionId);

      if (mvpVotesDeleteError) {
        return fail(
          `MVP-Stimmen konnten nicht gelöscht werden: ${mvpVotesDeleteError.message}`,
          500
        );
      }

      const { error: resultsDeleteError } = await supabase
        .from("results")
        .delete()
        .eq("session_id", sessionId);

      if (resultsDeleteError) {
        return fail(
          `Ergebnis konnte nicht gelöscht werden: ${resultsDeleteError.message}`,
          500
        );
      }

      const { error: teamsDeleteError } = await supabase
        .from("teams")
        .delete()
        .eq("session_id", sessionId);

      if (teamsDeleteError) {
        return fail(
          `Teams konnten nicht gelöscht werden: ${teamsDeleteError.message}`,
          500
        );
      }

      const { error: sessionPlayersDeleteError } = await supabase
        .from("session_players")
        .delete()
        .eq("session_id", sessionId);

      if (sessionPlayersDeleteError) {
        return fail(
          `Anwesenheiten konnten nicht gelöscht werden: ${sessionPlayersDeleteError.message}`,
          500
        );
      }

      if (session.winner_photo_path) {
        await supabase.storage
          .from("session-photos")
          .remove([session.winner_photo_path]);
      }

      const { error: sessionDeleteError } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId)
        .eq("club_id", clubId);

      if (sessionDeleteError) {
        return fail(
          `Session konnte nicht gelöscht werden: ${sessionDeleteError.message}`,
          500
        );
      }

      return ok({
        message: "Session wurde gelöscht.",
        deleted: true,
      });
    }

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

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        return fail("Das Bild ist zu groß. Bitte maximal 10 MB verwenden.");
      }

      let normalizedPhoto: {
        buffer: Buffer;
        contentType: "image/jpeg";
        extension: "jpg";
      };

      try {
        normalizedPhoto = await normalizeWinnerPhoto(file);
      } catch (error) {
        console.error("normalizeWinnerPhoto failed", error);
        return fail(
          "Das Bild konnte nicht verarbeitet werden. Bitte ein anderes Foto versuchen.",
          400
        );
      }

      const newPath = `sessions/${sessionId}/${Date.now()}-winner.${normalizedPhoto.extension}`;
      const oldPath = session.winner_photo_path ?? null;

      const { error: uploadError } = await supabase.storage
        .from("session-photos")
        .upload(newPath, normalizedPhoto.buffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: normalizedPhoto.contentType,
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler.";
    return fail(message, 500);
  }
}