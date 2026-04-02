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

function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "owner";
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

  const { supabase, clubId, membership, session } = access;

  try {
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

    if (intent === "delete_session") {
      if (!isAdminRole(membership.role)) {
        return fail("Nur Admins dürfen eine Session löschen.", 403);
      }

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id")
        .eq("session_id", sessionId);

      if (teamsError) {
        return fail(`Teams konnten nicht geladen werden: ${teamsError.message}`, 500);
      }

      const teamIds = (teamsData ?? []).map((team) => Number(team.id)).filter(Boolean);

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
        return fail(`Teams konnten nicht gelöscht werden: ${teamsDeleteError.message}`, 500);
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
        await supabase.storage.from("session-photos").remove([session.winner_photo_path]);
      }

      const { error: sessionDeleteError } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId)
        .eq("club_id", clubId);

      if (sessionDeleteError) {
        return fail(`Session konnte nicht gelöscht werden: ${sessionDeleteError.message}`, 500);
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler.";
    return fail(message, 500);
  }
}