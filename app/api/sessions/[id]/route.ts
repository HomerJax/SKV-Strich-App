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
import { sendClubPush } from "@/lib/push/club-events";
import {
  formatDeadlineForDisplay,
  getSessionDeadlineEpochMs,
  isSessionRsvpDeadlinePassed,
} from "@/lib/session-rsvp-deadline";
import { getRequiredRsvpReasonError } from "@/lib/rsvp-reason";
import { getServerI18n } from "@/lib/i18n/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_WIDTH = 1800;
const MAX_OUTPUT_HEIGHT = 1800;

type SessionType = "training" | "event";

type RsvpStatus = "in" | "out" | "open";

type PlayerNameRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
};

function getPlayerDisplayName(player: PlayerNameRow) {
  const nickname = player.nickname?.trim();
  if (nickname) return nickname;

  const fullName = [player.first_name?.trim(), player.last_name?.trim()]
    .filter(Boolean)
    .join(" ");

  return fullName || "Ein Mitspieler";
}

function formatSessionDate(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return date;
  return `${match[3]}.${match[2]}.`;
}

async function sendRsvpUpdatePush(params: {
  clubId: string;
  sessionId: number;
  sessionDate: string;
  sessionType: SessionType;
  currentUserId: string;
  playerName: string;
  status: "in" | "out";
  previousStatus: string | null;
}) {
  if (params.previousStatus === params.status) return;

  const sessionLabel = params.sessionType === "event" ? "Termin" : "Training";
  const dateLabel = formatSessionDate(params.sessionDate);
  const isIn = params.status === "in";

  try {
    await sendClubPush({
      clubId: params.clubId,
      title: isIn
        ? `${params.playerName} ist dabei ✅`
        : `${params.playerName} hat abgesagt`,
      body: isIn
        ? `${params.playerName} hat für ${sessionLabel.toLowerCase()} am ${dateLabel} zugesagt.`
        : `${params.playerName} hat für ${sessionLabel.toLowerCase()} am ${dateLabel} abgesagt.`,
      url: `/sessions/${params.sessionId}`,
      preference: "rsvp_updates",
      excludeUserIds: [params.currentUserId],
    });
  } catch (error) {
    console.error("RSVP push failed", error);
  }
}

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
  const { t } = await getServerI18n();
  const resolvedParams = await context.params;
  const sessionId = Number(resolvedParams.id);

  if (!Number.isFinite(sessionId)) {
    return fail(t("sessionAction.invalidId"), 400);
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
    currentUserId,
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
        return fail(t("sessionApi.invalidPlayerId"), 400);
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
          t("sessionApi.homeRsvpDisabled"),
          403
        );
      }

      if (session.winner_photo_path) {
        return fail(
          t("sessionApi.sessionClosed"),
          400
        );
      }

      const status = String(formData.get("status") ?? "").trim() as RsvpStatus;
      const reason = String(formData.get("reason") ?? "").trim().slice(0, 80);

      if (status !== "in" && status !== "out" && status !== "open") {
        return fail(t("sessionApi.invalidStatus"), 400);
      }

      const userEmail = currentUserEmail;

      if (!userEmail) {
        return fail(t("sessionApi.userResolveFailed"), 401);
      }

      const { data: playerData, error: playerError } = await adminSupabase
        .from("players")
        .select("id, first_name, last_name, nickname")
        .eq("club_id", clubId)
        .eq("email", userEmail)
        .maybeSingle<PlayerNameRow>();

      if (playerError) {
        return fail(
          t("sessionApi.playerLoadFailed", { error: playerError.message }),
          500
        );
      }

      const playerId = Number(playerData?.id);

      if (!Number.isFinite(playerId) || !playerData) {
        return fail(
          t("sessionApi.playerNotFound"),
          404
        );
      }

      if (sessionType === "event" && status === "in") {
        const { data: exclusion, error: exclusionError } = await adminSupabase
          .from("session_event_exclusions")
          .select("player_id")
          .eq("club_id", clubId)
          .eq("session_id", sessionId)
          .eq("player_id", playerId)
          .maybeSingle();

        if (exclusionError) {
          return fail(t("sessionApi.rosterCheckFailed"), 500);
        }

        if (exclusion) {
          return fail(t("sessionApi.notNominated"), 403);
        }
      }

      const [
        { data: existingRsvp, error: existingRsvpError },
        { data: deadlineSettings, error: deadlineSettingsError },
        { data: firstInHistory, error: firstInHistoryError },
      ] = await Promise.all([
        adminSupabase
          .from("session_rsvps")
          .select("status")
          .eq("session_id", sessionId)
          .eq("player_id", playerId)
          .maybeSingle<{ status: string }>(),
        adminSupabase
          .from("club_settings")
          .select("rsvp_deadline_minutes_before, require_rsvp_reason_on_absence")
          .eq("club_id", clubId)
          .maybeSingle<{
            rsvp_deadline_minutes_before: number | null;
            require_rsvp_reason_on_absence: boolean | null;
          }>(),
        adminSupabase
          .from("session_rsvp_first_ins")
          .select("first_in_at")
          .eq("club_id", clubId)
          .eq("session_id", sessionId)
          .eq("player_id", playerId)
          .maybeSingle<{ first_in_at: string }>(),
      ]);

      if (existingRsvpError) {
        return fail(
          t("sessionApi.rsvpCheckFailed", { error: existingRsvpError.message }),
          500,
        );
      }

      if (deadlineSettingsError) {
        return fail(t("sessionApi.deadlineCheckFailed"), 500);
      }

      if (firstInHistoryError) {
        return fail(t("sessionApi.previousRsvpCheckFailed"), 500);
      }

      const previousStatus = existingRsvp?.status ?? null;
      const playerName = getPlayerDisplayName(playerData);
      const requireAbsenceReason =
        deadlineSettings?.require_rsvp_reason_on_absence === true;

      if (status === "out" && requireAbsenceReason) {
        const reasonError = getRequiredRsvpReasonError(reason, t("rsvp.reasonRequired"));
        if (reasonError) {
          return fail(reasonError, 400);
        }
      }

      const deadlineAt = getSessionDeadlineEpochMs({
        date: session.date,
        startTime: session.start_time,
        sessionOverrideMinutes: session.rsvp_deadline_minutes_before,
        clubDefaultMinutes: deadlineSettings?.rsvp_deadline_minutes_before ?? 60,
      });
      const deadlinePassed = isSessionRsvpDeadlinePassed(deadlineAt);
      const deadlineLabel = formatDeadlineForDisplay(deadlineAt);

      if (
        deadlinePassed &&
        previousStatus === "in" &&
        status !== "in"
      ) {
        return fail(
          deadlineLabel
            ? t("sessionApi.deadlineLockedAt", { time: deadlineLabel })
            : t("sessionApi.deadlineLocked"),
          409,
        );
      }

      if (status === "in") {
        const currentSignupAt = new Date().toISOString();
        const { error: firstInInsertError } = await adminSupabase
          .from("session_rsvp_first_ins")
          .upsert(
            {
              club_id: clubId,
              session_id: sessionId,
              player_id: playerId,
              first_in_at: firstInHistory?.first_in_at ?? currentSignupAt,
            },
            {
              onConflict: "session_id,player_id",
              ignoreDuplicates: true,
            }
          );

        if (firstInInsertError) {
          console.error("First RSVP tracking failed", firstInInsertError);
        }

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
            t("sessionApi.confirmSaveFailed", { error: insertError.message }),
            500
          );
        }

        const { error: rsvpError } = await adminSupabase
          .from("session_rsvps")
          .upsert(
            {
              club_id: clubId,
              session_id: sessionId,
              player_id: playerId,
              status: "in",
              reason: null,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "session_id,player_id",
            }
          );

        if (rsvpError) {
          return fail(
            t("sessionApi.confirmSaveFailed", { error: rsvpError.message }),
            500
          );
        }

        let latePenalty:
          | { label: string; value: string; type: string; message: string }
          | null = null;

        const firstInAt = firstInHistory?.first_in_at ?? currentSignupAt;
        const firstInEpochMs = Date.parse(firstInAt);
        const isLateSignup =
          deadlinePassed &&
          deadlineAt !== null &&
          (!Number.isFinite(firstInEpochMs) || firstInEpochMs >= deadlineAt);

        if (isLateSignup && featureFlags.penalties === true) {
          const { data: rule, error: ruleError } = await adminSupabase
            .from("penalty_rules")
            .select("label,reason,type,value,escalation_after_days,escalation_value")
            .eq("club_id", clubId)
            .eq("rule_key", "late_rsvp")
            .eq("enabled", true)
            .maybeSingle<{
              label: string;
              reason: string;
              type: "beer" | "money" | "custom";
              value: string;
              escalation_after_days: number | null;
              escalation_value: string | null;
            }>();

          if (!ruleError && rule) {
            const sourceKey = `late_rsvp:${sessionId}`;
            const { data: existingPenalty } = await adminSupabase
              .from("penalties")
              .select("id")
              .eq("club_id", clubId)
              .eq("player_id", playerId)
              .eq("source_key", sourceKey)
              .maybeSingle<{ id: number }>();

            if (!existingPenalty) {
              const today = new Date();
              let dueDate: string | null = null;
              if (rule.escalation_after_days && rule.escalation_after_days > 0) {
                today.setUTCDate(today.getUTCDate() + rule.escalation_after_days);
                dueDate = today.toISOString().slice(0, 10);
              }

              const { error: penaltyError } = await adminSupabase
                .from("penalties")
                .insert({
                  club_id: clubId,
                  player_id: playerId,
                  reason: rule.reason,
                  type: rule.type,
                  value: rule.value,
                  due_date: dueDate,
                  escalation_after_days: rule.escalation_after_days,
                  escalation_value: rule.escalation_value,
                  source_key: sourceKey,
                  notes: `Automatisch: Zusage nach Anmeldeschluss für Session ${sessionId}`,
                });

              if (!penaltyError) {
                latePenalty = {
                  label: rule.label,
                  value: rule.value,
                  type: rule.type,
                  message:
                    rule.type === "money"
                      ? `${/€/.test(rule.value) ? rule.value : `${rule.value} €`} wandert in die Mannschaftskasse. 🍻`
                      : `${rule.value} geht auf dich. 😄`,
                };
              } else {
                console.error("Late RSVP penalty failed", penaltyError);
              }
            }
          } else if (ruleError) {
            console.error("Late RSVP rule lookup failed", ruleError);
          }
        }

        await sendRsvpUpdatePush({
          clubId,
          sessionId,
          sessionDate: session.date,
          sessionType,
          currentUserId,
          playerName,
          status: "in",
          previousStatus,
        });

        return ok({
          message:
            sessionType === "training"
              ? "Du bist dabei beim Training."
              : "Du bist beim Termin dabei.",
          status: "in",
          lateSignup: isLateSignup,
          latePenalty,
        });
      }

      const { error: deleteError } = await adminSupabase
        .from("session_players")
        .delete()
        .eq("session_id", sessionId)
        .eq("player_id", playerId);

      if (deleteError) {
        return fail(
          t("sessionApi.rsvpSaveFailed", { error: deleteError.message }),
          500
        );
      }

      if (status === "open") {
        const { error: clearRsvpError } = await adminSupabase
          .from("session_rsvps")
          .delete()
          .eq("session_id", sessionId)
          .eq("player_id", playerId);

        if (clearRsvpError) {
          return fail(
            t("sessionApi.rsvpResetFailed", { error: clearRsvpError.message }),
            500
          );
        }

        return ok({
          message: t("sessionApi.rsvpReset"),
          status: "open",
        });
      }

      const { error: rsvpError } = await adminSupabase
        .from("session_rsvps")
        .upsert(
          {
            club_id: clubId,
            session_id: sessionId,
            player_id: playerId,
            status: "out",
            reason: reason || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "session_id,player_id",
          }
        );

      if (rsvpError) {
        return fail(
          t("sessionApi.declineSaveFailed", { error: rsvpError.message }),
          500
        );
      }

      await sendRsvpUpdatePush({
        clubId,
        sessionId,
        sessionDate: session.date,
        sessionType,
        currentUserId,
        playerName,
        status: "out",
        previousStatus,
      });

      return ok({
        message: t("sessionApi.rsvpUpdated"),
        status: "out",
      });
    }

    if (intent === "add_guest_player") {
      const guestName = String(formData.get("guest_name") ?? "");
      const guestPosition = String(formData.get("guest_position") ?? "");
      const guestAgeGroup = String(formData.get("guest_age_group") ?? "");
      const guestStrength = String(formData.get("guest_strength") ?? "");

      return handleAddGuestPlayer({
        supabase,
        sessionId,
        clubId,
        membership,
        guestName,
        guestPosition,
        guestAgeGroup,
        guestStrength,
      });
    }

    if (intent === "delete_guest_player") {
      const hasAdminAccess = canManageClub({
        isPowerUser,
        role: membership.role,
      });

      if (!hasAdminAccess) {
        return fail(t("sessionApi.guestDeleteAdminOnly"), 403);
      }

      const requestedPlayerId = Number(String(formData.get("player_id") ?? ""));

      if (!Number.isFinite(requestedPlayerId)) {
        return fail(t("sessionApi.invalidPlayerId"), 400);
      }

      const { data: resultData, error: resultError } = await supabase
        .from("results")
        .select("session_id")
        .eq("session_id", sessionId)
        .limit(1)
        .maybeSingle();

      if (resultError) {
        return fail(
          t("sessionApi.resultStatusCheckFailed", { error: resultError.message }),
          500
        );
      }

      if (resultData) {
        return fail(
          t("sessionApi.guestDeleteAfterResult"),
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
          t("sessionApi.guestLoadFailed", { error: playerError.message }),
          500
        );
      }

      if (!playerData) {
        return fail(t("sessionApi.guestNotFound"), 404);
      }

      if (playerData.is_guest !== true) {
        return fail(t("sessionApi.guestOnlyDelete"), 400);
      }

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id")
        .eq("session_id", sessionId);

      if (teamsError) {
        return fail(
          t("sessionApi.teamsLoadFailed", { error: teamsError.message }),
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
            t("sessionApi.guestTeamDeleteFailed", { error: teamPlayersDeleteError.message }),
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
          t("sessionApi.guestAttendanceDeleteFailed", { error: sessionPlayerDeleteError.message }),
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
          t("sessionApi.guestDeleteFailed", { error: playerDeleteError.message }),
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
          t("sessionApi.teamsDisabled"),
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
          message: t("sessionApi.teamsSaved"),
        });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : t("sessionApi.teamsSaveFailed");

        return fail(message, 500);
      }
    }

    if (intent === "save_result") {
      if (!allowResult) {
        return fail(
          t("sessionApi.resultDisabled"),
          400
        );
      }

      const gameNo = Number(String(formData.get("game_no") ?? "1"));
      const goalsA = String(formData.get("goals_a") ?? "");
      const goalsB = String(formData.get("goals_b") ?? "");
      const manualTeamsRaw = String(formData.get("manual_teams") ?? "{}");

      return handleSaveResult({
        supabase,
        sessionId,
        clubId,
        gameNo,
        goalsA,
        goalsB,
        manualTeamsRaw,
        actorUserId: currentUserId,
        winnerPhotoPath: session.winner_photo_path,
      });
    }

    if (intent === "delete_result") {
      if (!allowResult) {
        return fail(
          t("sessionApi.noResult"),
          400
        );
      }

      const gameNo = Number(String(formData.get("game_no") ?? "1"));

      return handleDeleteResult({
        supabase,
        sessionId,
        clubId,
        gameNo,
        winnerPhotoPath: session.winner_photo_path,
      });
    }

    if (intent === "delete_winner_photo") {
      if (!allowWinnerPhoto) {
        return fail(
          t("sessionApi.noWinnerPhoto"),
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
        return fail(t("sessionApi.sessionDeleteAdminOnly"), 403);
      }

      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id")
        .eq("session_id", sessionId);

      if (teamsError) {
        return fail(
          t("sessionApi.teamsLoadFailed", { error: teamsError.message }),
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
            t("sessionApi.teamAssignmentsDeleteFailed", { error: teamPlayersDeleteError.message }),
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
          t("sessionApi.mvpVotesDeleteFailed", { error: mvpVotesDeleteError.message }),
          500
        );
      }

      const { error: resultsDeleteError } = await supabase
        .from("results")
        .delete()
        .eq("session_id", sessionId);

      if (resultsDeleteError) {
        return fail(
          t("sessionApi.resultDeleteFailed", { error: resultsDeleteError.message }),
          500
        );
      }

      const { error: teamsDeleteError } = await supabase
        .from("teams")
        .delete()
        .eq("session_id", sessionId);

      if (teamsDeleteError) {
        return fail(
          t("sessionApi.teamsDeleteFailed", { error: teamsDeleteError.message }),
          500
        );
      }

      const { error: sessionPlayersDeleteError } = await supabase
        .from("session_players")
        .delete()
        .eq("session_id", sessionId);

      if (sessionPlayersDeleteError) {
        return fail(
          t("sessionApi.attendanceDeleteFailed", { error: sessionPlayersDeleteError.message }),
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
          t("sessionApi.sessionDeleteFailed", { error: sessionDeleteError.message }),
          500
        );
      }

      try {
        const sessionLabel = sessionType === "event" ? "Termin" : "Training";
        await sendClubPush({
          clubId,
          title: `${sessionLabel} abgesagt`,
          body: `${sessionLabel} am ${formatSessionDate(session.date)} wurde abgesagt.`,
          url: "/sessions",
          preference: "training_reminders",
          excludeUserIds: [currentUserId],
        });
      } catch (error) {
        console.error("Session deletion push failed", error);
      }

      return ok({
        message: t("sessionApi.sessionDeleted"),
        deleted: true,
      });
    }

    if (intent === "upload_winner_photo") {
      if (!allowWinnerPhoto) {
        return fail(
          t("sessionApi.noWinnerPhoto"),
          400
        );
      }

      const { data: resultRows, error: resultRowsError } = await adminSupabase
        .from("results")
        .select("goals_team_a,goals_team_b")
        .eq("session_id", sessionId);

      if (resultRowsError) {
        return fail(t("sessionApi.winnerCheckFailed"), 500);
      }

      let winsA = 0;
      let winsB = 0;
      for (const resultRow of resultRows ?? []) {
        if (
          typeof resultRow.goals_team_a !== "number" ||
          typeof resultRow.goals_team_b !== "number"
        ) {
          continue;
        }
        if (resultRow.goals_team_a > resultRow.goals_team_b) winsA += 1;
        if (resultRow.goals_team_b > resultRow.goals_team_a) winsB += 1;
      }

      if ((resultRows ?? []).length === 0) {
        return fail(t("sessionApi.resultFirst"), 400);
      }

      if (winsA === winsB) {
        return fail(
          t("sessionApi.noClearWinner"),
          400
        );
      }

      const file = formData.get("file");

      if (!(file instanceof File)) {
        return fail(t("sessionApi.imageRequired"));
      }

      if (!file.type.startsWith("image/")) {
        return fail(t("sessionApi.imageRequired"));
      }

      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        return fail(t("sessionApi.imageTooLarge"));
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
          t("sessionApi.imageProcessFailed"),
          400
        );
      }

      const newPath = `sessions/${sessionId}/${Date.now()}-winner.${normalizedPhoto.extension}`;
      const oldPath = session.winner_photo_path ?? null;

      const { error: uploadError } = await adminSupabase.storage
        .from("session-photos")
        .upload(newPath, normalizedPhoto.buffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: normalizedPhoto.contentType,
        });

      if (uploadError) {
        return fail(uploadError.message, 500);
      }

      const { error: updateError } = await adminSupabase
        .from("sessions")
        .update({ winner_photo_path: newPath })
        .eq("id", sessionId)
        .eq("club_id", clubId);

      if (updateError) {
        await adminSupabase.storage.from("session-photos").remove([newPath]);
        return fail(updateError.message, 500);
      }

      if (oldPath) {
        await adminSupabase.storage.from("session-photos").remove([oldPath]);
      }

      const winnerPhotoUrl = await createSignedPhotoUrl(adminSupabase, newPath);

      return ok({
        message: t("sessionApi.winnerPhotoUploaded"),
        winner_photo_path: newPath,
        winnerPhotoUrl,
      });
    }

    return fail(t("sessionApi.invalidAction"), 400);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler.";
    return fail(message, 500);
  }
}