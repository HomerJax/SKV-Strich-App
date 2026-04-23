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
import { persistSessionTeams } from "@/lib/session-detail/actions/persist-teams";
import { canManageClub } from "@/lib/auth/access";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_WIDTH = 1800;
const MAX_OUTPUT_HEIGHT = 1800;

type SessionType = "training" | "event";

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

function normalizeSessionType(
  value: unknown,
  sessionTypesEnabled: boolean
): SessionType {
  if (!sessionTypesEnabled) {
    return "training";
  }

  return value === "event" ? "event" : "training";
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

  const featureFlags = await getFeatureFlagsForClub(clubId);
  const sessionTypesEnabled = featureFlags.session_types === true;
  const sessionType = normalizeSessionType(session.type, sessionTypesEnabled);

  const allowTeams = sessionType === "training";
  const allowResult = sessionType === "training";
  const allowWinnerPhoto = sessionType === "training";

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
          message:
            sessionType === "training"
              ? "Du bist dabei beim Training."
              : "Du bist beim Termin dabei.",
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
        message: "Deine Rückmeldung wurde aktualisiert.",
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

    if (intent === "delete_guest_player") {
      const hasAdminAccess = canManageClub({
        isPowerUser,
        role: membership.role,
      });

      if (!hasAdminAccess) {
        return fail("Nur Admins dürfen Gastspieler löschen.", 403);
      }

      const requestedPlayerId = Number(String(formData.get("player_id") ?? ""));

      if (!Number.isFinite(requestedPlayerId)) {
        return fail("Ungültige Spieler-ID.", 400);
      }

      const { data: resultData, error: resultError } = await supabase
        .from("results")
        .select("session_id")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (resultError) {
        return fail(
          `Ergebnisstatus konnte nicht geprüft werden: ${resultError.message}`,
          500
        );
      }

      if (resultData) {
        return fail(
          "Gastspieler können nicht mehr gelöscht werden, wenn bereits ein Ergebnis gespeichert ist.",
          400
        );
      }

      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("id, club_id, is_guest")
        .eq("id", requestedPlayerId)
        .eq("club_id", clubId)
        .maybeSingle();

      if (playerError) {
        return fail(
          `Gastspieler konnte nicht geladen werden: ${playerError.message}`,
          500
        );
      }

      if (!playerData) {
        return fail("Gastspieler nicht gefunden.", 404);
      }

      if (playerData.is_guest !== true) {
        return fail("Nur Gastspieler können hier gelöscht werden.", 400);
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
        .filter((value) => Number.isFinite(value));

      if (teamIds.length > 0) {
        const { error: teamPlayersDeleteError } = await supabase
          .from("team_players")
          .delete()
          .in("team_id", teamIds)
          .eq("player_id", requestedPlayerId);

        if (teamPlayersDeleteError) {
          return fail(
            `Team-Zuordnungen des Gastspielers konnten nicht gelöscht werden: ${teamPlayersDeleteError.message}`,
            500
          );
        }
      }

      const { error: sessionPlayerDeleteError } = await supabase
        .from("session_players")
        .delete()
        .eq("session_id", sessionId)
        .eq("player_id", requestedPlayerId);

      if (sessionPlayerDeleteError) {
        return fail(
          `Anwesenheit des Gastspielers konnte nicht gelöscht werden: ${sessionPlayerDeleteError.message}`,
          500
        );
      }

      const { error: playerDeleteError } = await supabase
        .from("players")
        .delete()
        .eq("id", requestedPlayerId)
        .eq("club_id", clubId)
        .eq("is_guest", true);

      if (playerDeleteError) {
        return fail(
          `Gastspieler konnte nicht gelöscht werden: ${playerDeleteError.message}`,
          500
        );
      }

      return ok({
        message: "Gastspieler wurde entfernt.",
        deletedGuestPlayerId: requestedPlayerId,
      });
    }

    if (intent === "save_teams") {
      if (!allowTeams) {
        return fail(
          "Für diesen Termin ist keine Teamaufteilung aktiv.",
          400
        );
      }

      const manualTeamsRaw = String(formData.get("manual_teams") ?? "{}");

      try {
        await persistSessionTeams({
          supabase,
          sessionId,
          clubId,
          manualTeamsRaw,
          requireComplete: false,
        });

        return ok({
          message: "Teams gespeichert.",
        });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Teams konnten nicht gespeichert werden.";

        return fail(message, 500);
      }
    }

    if (intent === "save_result") {
      if (!allowResult) {
        return fail(
          "Für diesen Termin kann kein Ergebnis gespeichert werden.",
          400
        );
      }

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
      if (!allowResult) {
        return fail(
          "Für diesen Termin gibt es kein Ergebnis.",
          400
        );
      }

      return handleDeleteResult({
        supabase,
        sessionId,
      });
    }

    if (intent === "delete_winner_photo") {
      if (!allowWinnerPhoto) {
        return fail(
          "Für diesen Termin gibt es kein Siegerfoto.",
          400
        );
      }

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
      if (!allowWinnerPhoto) {
        return fail(
          "Für diesen Termin gibt es kein Siegerfoto.",
          400
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
        message: "Siegerfoto hochgeladen. Jetzt noch Ergebnis eintragen.",
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