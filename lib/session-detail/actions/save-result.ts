import { createClient } from "@/lib/supabase/server";
import { syncClubAchievements } from "@/lib/badges/engine";
import { fail, ok } from "@/lib/session-detail/response";
import { getServerI18n } from "@/lib/i18n/server";
import { sendClubPush } from "@/lib/push/club-events";
import { persistSessionTeams } from "./persist-teams";

type SessionDetailSupabase = Awaited<ReturnType<typeof createClient>>;

function normalizeGoalValue(value: string | null | undefined) {
  const clean = String(value ?? "").trim();
  if (clean === "") return "";
  if (!/^\d+$/.test(clean)) return null;
  return clean;
}

type SaveResultInput = {
  supabase: SessionDetailSupabase;
  sessionId: number;
  clubId: string;
  gameNo: number;
  goalsA: string;
  goalsB: string;
  manualTeamsRaw: string;
  actorUserId: string;
  winnerPhotoPath?: string | null;
};

export async function handleSaveResult({
  supabase,
  sessionId,
  clubId,
  gameNo,
  goalsA,
  goalsB,
  manualTeamsRaw,
  actorUserId,
  winnerPhotoPath = null,
}: SaveResultInput) {
  const { t } = await getServerI18n();
  try {
    const cleanA = normalizeGoalValue(goalsA);
    const cleanB = normalizeGoalValue(goalsB);

    if (cleanA === null || cleanB === null || cleanA === "" || cleanB === "") {
      return fail(t("sessionAction.resultInvalid"));
    }

    if (!Number.isInteger(gameNo) || gameNo < 1 || gameNo > 99) {
      return fail(t("sessionAction.gameNumberInvalid"));
    }

    const [{ data: existingResult, error: existingResultError }, { data: anyResult, error: anyResultError }] =
      await Promise.all([
        supabase
          .from("results")
          .select("id")
          .eq("session_id", sessionId)
          .eq("game_no", gameNo)
          .maybeSingle(),
        supabase
          .from("results")
          .select("id")
          .eq("session_id", sessionId)
          .limit(1)
          .maybeSingle(),
      ]);

    if (existingResultError) return fail(existingResultError.message, 500);
    if (anyResultError) return fail(anyResultError.message, 500);

    const { teamAId, teamBId } = await persistSessionTeams({
      supabase,
      sessionId,
      clubId,
      manualTeamsRaw,
      requireComplete: true,
    });

    const payload = {
      session_id: sessionId,
      game_no: gameNo,
      team_a_id: teamAId,
      team_b_id: teamBId,
      goals_team_a: Number(cleanA),
      goals_team_b: Number(cleanB),
      club_id: clubId,
    };

    if (existingResult?.id) {
      const { error } = await supabase
        .from("results")
        .update(payload)
        .eq("session_id", sessionId)
        .eq("game_no", gameNo);

      if (error) return fail(error.message, 500);
    } else {
      const { error } = await supabase.from("results").insert(payload);
      if (error) return fail(error.message, 500);

      if (!anyResult) {
        try {
          await sendClubPush({
            clubId,
            title: "Ergebnis verfügbar ⚽",
            body: `Das erste Ergebnis ist da: ${cleanA}:${cleanB}.`,
            url: `/sessions/${sessionId}`,
            preference: "results",
            excludeUserIds: [actorUserId],
          });
        } catch (error) {
          console.error("Result push failed", error);
        }
      }
    }

    let winnerPhotoCleared = false;
    if (winnerPhotoPath) {
      const { error: photoResetError } = await supabase
        .from("sessions")
        .update({ winner_photo_path: null })
        .eq("id", sessionId)
        .eq("club_id", clubId);

      if (!photoResetError) {
        winnerPhotoCleared = true;
        await supabase.storage.from("session-photos").remove([winnerPhotoPath]);
      } else {
        console.error("Winner photo reset after result change failed", photoResetError);
      }
    }

    try {
      await syncClubAchievements(clubId);
    } catch (error) {
      console.error("Badge sync after result failed", error);
    }

    return ok({
      message:
        gameNo === 1
          ? t("sessionAction.gameOneSaved")
          : t("sessionAction.gameSaved", { game: gameNo }),
      hasResult: true,
      goalsA: cleanA,
      goalsB: cleanB,
      gameNo,
      winnerPhotoCleared,
    });
  } catch (error) {
    return fail(
      error instanceof Error && error.message
        ? error.message
        : t("sessionAction.resultSaveFailed"),
      500,
    );
  }
}
