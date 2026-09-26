"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Player,
  SessionRow,
  TeamMap,
  TeamSide,
  SessionType,
  SessionGameResult,
} from "./session-types";
import {
  buildLineupShareText,
  getErrorMessage,
  normalizeGoalValue,
  balanceGroupPenalty,
  categoryPositionBalancePenalty,
  positionBalancePenalty,
  shuffle,
  sumTeamScore,
} from "./session-ui";
import type { BalanceCategory } from "./session-ui";
import {
  ClubSettings,
  getAutoTeamNames,
  getResultHighlight,
  getResultStory,
  sameIdSet,
  sortPlayersByFirstName,
  teamMeta,
  withDisplayNames,
} from "./session-detail-helpers";
import { fetchImageAsFile, shareImageFromUrl } from "@/lib/share/utils";
import { compressImageFile } from "@/lib/client-images/compress-image";
import { useI18n } from "@/components/i18n/I18nProvider";

type SessionDetailClientProps = {
  sessionId: number;
  initialSession: SessionRow;
  initialPlayers: Player[];
  initialPresentIds: number[];
  initialManualTeams: TeamMap;
  initialClubId: string;
  initialIsAdmin: boolean;
  initialClubSettings: ClubSettings;
  initialBalanceCategories?: BalanceCategory[];
  initialWinnerPhotoUrl: string | null;
  initialGoalsA: string;
  initialGoalsB: string;
  initialHasResult: boolean;
  initialResults: SessionGameResult[];
  initialPrimaryColor?: string | null;
  initialMvpVotingEnabled: boolean;
  initialUseNicknames?: boolean;
  initialUseFieldView?: boolean;
  initialHomeSessionRsvpEnabled?: boolean;
};

type ApiSuccess =
  | { ok: true; mode: "added" | "removed"; playerId: number }
  | { ok: true; message: string; player: Player }
  | {
      ok: true;
      message: string;
      deletedGuestPlayerId: number;
    }
  | { ok: true; message: string; hasResult: boolean; goalsA: string; goalsB: string; gameNo: number; winnerPhotoCleared?: boolean }
  | {
      ok: true;
      message: string;
      winner_photo_path: string | null;
      winnerPhotoUrl: string | null;
    }
  | {
      ok: true;
      message: string;
      deleted: true;
    }
  | {
      ok: true;
      message: string;
    };

type ApiError = {
  error: string;
};

type ImageOrientation = "portrait" | "landscape" | "square" | "unknown";

async function fetchShareImageFile(imageUrl: string, fileName: string) {
  const separator = imageUrl.includes("?") ? "&" : "?";
  const freshUrl = `${imageUrl}${separator}ts=${Date.now()}`;

  return fetchImageAsFile(freshUrl, fileName);
}

async function detectImageOrientation(file: File): Promise<ImageOrientation> {
  if (typeof window === "undefined") {
    return "unknown";
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        if (!width || !height) {
          resolve("unknown");
          return;
        }

        if (height > width) {
          resolve("portrait");
          return;
        }

        if (width > height) {
          resolve("landscape");
          return;
        }

        resolve("square");
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve("unknown");
    };

    img.src = objectUrl;
  });
}

function removePlayerFromTeamMap(source: TeamMap, playerId: number): TeamMap {
  const next = { ...source };
  delete next[playerId];
  return next;
}

function isTeamGeneratorPlayer(player: Player) {
  return (player.roster_role ?? "player") !== "staff";
}

function ensurePresentPlayersExistInTeamMap(source: TeamMap, playerIds: number[]): TeamMap {
  const next = { ...source };

  playerIds.forEach((id) => {
    next[id] = next[id] ?? null;
  });

  Object.keys(next).forEach((key) => {
    const numericId = Number(key);

    if (!playerIds.includes(numericId)) {
      delete next[numericId];
    }
  });

  return next;
}

export function useSessionDetail({
  sessionId,
  initialSession,
  initialPlayers,
  initialPresentIds,
  initialManualTeams,
  initialClubId,
  initialIsAdmin,
  initialClubSettings,
  initialBalanceCategories,
  initialWinnerPhotoUrl,
  initialGoalsA,
  initialGoalsB,
  initialHasResult,
  initialResults,
  initialPrimaryColor,
  initialMvpVotingEnabled,
  initialUseNicknames,
  initialUseFieldView,
  initialHomeSessionRsvpEnabled,
}: SessionDetailClientProps) {
  const { locale, t } = useI18n();
  const router = useRouter();

  const resultRef = useRef<HTMLDivElement | null>(null);
  const teamsRef = useRef<HTMLDivElement | null>(null);
  const attendanceRef = useRef<HTMLDivElement | null>(null);
  const winnerPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const teamSaveTimerRef = useRef<number | null>(null);
  const teamSaveRequestIdRef = useRef(0);

  const [session, setSession] = useState<SessionRow | null>(initialSession);
  const [players, setPlayers] = useState<Player[]>(
    sortPlayersByFirstName(initialPlayers)
  );

  const [presentIds, setPresentIds] = useState<number[]>(initialPresentIds);
  const [draftPresentIds, setDraftPresentIds] = useState<number[]>(initialPresentIds);

  const [manualTeams, setManualTeams] = useState<TeamMap>(initialManualTeams);
  const [clubId] = useState<string | null>(initialClubId);
  const [isAdmin] = useState(initialIsAdmin);
  const [clubSettings] = useState<ClubSettings | null>(initialClubSettings);
  const [useNicknames] = useState<boolean>(
    initialUseNicknames ?? initialClubSettings.use_nicknames ?? false
  );
  const [useFieldView] = useState<boolean>(
    initialUseFieldView ?? initialClubSettings.use_field_view ?? false
  );
  const [primaryColorKey] = useState<string | null>(initialPrimaryColor ?? "black");
  const [mvpVotingEnabled] = useState<boolean>(initialMvpVotingEnabled);
  const [homeSessionRsvpEnabled] = useState<boolean>(
    initialHomeSessionRsvpEnabled ?? false
  );
  const [attendanceMultiSelectEnabled, setAttendanceMultiSelectEnabled] =
    useState(false);

  const [winnerPhotoUrl, setWinnerPhotoUrl] = useState<string | null>(
    initialWinnerPhotoUrl
  );

  const [goalsA, setGoalsA] = useState(initialGoalsA);
  const [goalsB, setGoalsB] = useState(initialGoalsB);
  const [results, setResults] = useState<SessionGameResult[]>(initialResults);
  const [hasResult, setHasResult] = useState(initialResults.length > 0 || initialHasResult);
  const [teamsConfirmed, setTeamsConfirmed] = useState(
    initialHasResult ||
      (initialPresentIds.length > 0 &&
        Object.values(initialManualTeams).some((side) => side === "A" || side === "B"))
  );

  const [showSessionEndModal, setShowSessionEndModal] = useState(false);

  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPosition, setGuestPosition] = useState<
    Player["preferred_position"] | ""
  >("");
  const [guestAgeGroup, setGuestAgeGroup] = useState<Player["age_group"] | "">(
    ""
  );
  const [guestStrength, setGuestStrength] = useState("");
  const [guestSaving, setGuestSaving] = useState(false);
  const [deletingGuestPlayerId, setDeletingGuestPlayerId] = useState<number | null>(
    null
  );

  const [attendanceCollapsed, setAttendanceCollapsed] = useState(initialHasResult);
  const [teamsCollapsed, setTeamsCollapsed] = useState(initialHasResult);
  const [winnerPhotoCollapsed, setWinnerPhotoCollapsed] = useState(initialHasResult);
  const [resultCollapsed, setResultCollapsed] = useState(initialHasResult);

  const [saving, setSaving] = useState(false);
  const [savingTeams, setSavingTeams] = useState(false);
  const [savingPresence, setSavingPresence] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sharingLineup, setSharingLineup] = useState(false);
  const [sharingResult, setSharingResult] = useState(false);
  const [sharingInternal, setSharingInternal] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [preparedResultShareFile, setPreparedResultShareFile] = useState<File | null>(
    null
  );
  const [preparingResultShare, setPreparingResultShare] = useState(false);
  const [resultShareMessage, setResultShareMessage] = useState<string | null>(null);

  const directAttendanceSaveEnabled =
    homeSessionRsvpEnabled && !attendanceMultiSelectEnabled;

  const sessionType: SessionType = (session?.type ?? "training") as SessionType;
  const isTrainingSession = sessionType === "training";
  const isEventSession = sessionType === "event";

  const allowTeams = isTrainingSession;
  const allowResult = isTrainingSession;
  const allowWinnerPhoto = isTrainingSession;
  const allowMvp = isTrainingSession && mvpVotingEnabled;

  async function postForm(formData: FormData): Promise<ApiSuccess> {
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });

    const raw = await response.text();

    let payload: ApiSuccess | ApiError | null = null;

    if (raw) {
      try {
        payload = JSON.parse(raw) as ApiSuccess | ApiError;
      } catch {
        throw new Error(
          t("sessionHook.invalidJson", { status: response.status })
        );
      }
    }

    if (!response.ok) {
      if (payload && "error" in payload) {
        throw new Error(payload.error);
      }

      throw new Error(raw || t("sessionHook.unknownHttpError", { status: response.status }));
    }

    if (!payload) {
      throw new Error(t("sessionHook.noServerResponse"));
    }

    if ("error" in payload) {
      throw new Error(payload.error);
    }

    return payload;
  }

  function preserveScrollPosition() {
    if (typeof window === "undefined") {
      return () => {};
    }

    const x = window.scrollX;
    const y = window.scrollY;

    return () => {
      window.requestAnimationFrame(() => {
        window.scrollTo({
          left: x,
          top: y,
          behavior: "auto",
        });
      });
    };
  }

  function clearFeedback() {
    setErr(null);
    setMsg(null);
  }

  function resetPreparedResultShare() {
    setPreparedResultShareFile(null);
    setResultShareMessage(null);
  }

  function resetGuestForm() {
    setGuestName("");
    setGuestPosition("");
    setGuestAgeGroup("");
    setGuestStrength("");
    setShowGuestForm(false);
  }

  useEffect(() => {
    if (initialHasResult) {
      setAttendanceCollapsed(true);
      setTeamsCollapsed(true);
      setWinnerPhotoCollapsed(true);
      setResultCollapsed(true);
      setTeamsConfirmed(true);
    }
  }, [initialHasResult]);

  useEffect(() => {
    return () => {
      if (teamSaveTimerRef.current) {
        window.clearTimeout(teamSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  useEffect(() => {
    setPlayers(sortPlayersByFirstName(initialPlayers));
  }, [initialPlayers]);

  useEffect(() => {
    setPresentIds(initialPresentIds);
    setDraftPresentIds(initialPresentIds);
  }, [initialPresentIds]);

  useEffect(() => {
    setManualTeams(initialManualTeams);
    setTeamsConfirmed(
      initialHasResult ||
        (initialPresentIds.length > 0 &&
          Object.values(initialManualTeams).some(
            (side) => side === "A" || side === "B",
          )),
    );
  }, [initialHasResult, initialManualTeams, initialPresentIds]);

  useEffect(() => {
    setWinnerPhotoUrl(initialWinnerPhotoUrl);
  }, [initialWinnerPhotoUrl]);

  useEffect(() => {
    setResults(initialResults);
    setHasResult(initialResults.length > 0 || initialHasResult);
    setGoalsA(initialGoalsA);
    setGoalsB(initialGoalsB);

    if (initialResults.length > 0 || initialHasResult) {
      setWinnerPhotoCollapsed(true);
      setResultCollapsed(true);
      setTeamsConfirmed(true);
    }
  }, [initialResults, initialHasResult, initialGoalsA, initialGoalsB]);

  const attendanceDirty = useMemo(() => {
    if (directAttendanceSaveEnabled) {
      return false;
    }

    return !sameIdSet(draftPresentIds, presentIds);
  }, [draftPresentIds, presentIds, directAttendanceSaveEnabled]);

  const presentPlayers = useMemo(
    () => players.filter((player) => presentIds.includes(player.id)),
    [players, presentIds]
  );

  const teamGeneratorPlayers = useMemo(
    () => presentPlayers.filter(isTeamGeneratorPlayer),
    [presentPlayers]
  );

  const teamA = useMemo(
    () =>
      sortPlayersByFirstName(
        teamGeneratorPlayers.filter((player) => manualTeams[player.id] === "A")
      ),
    [presentPlayers, manualTeams]
  );

  const teamB = useMemo(
    () =>
      sortPlayersByFirstName(
        teamGeneratorPlayers.filter((player) => manualTeams[player.id] === "B")
      ),
    [presentPlayers, manualTeams]
  );

  const unassigned = useMemo(
    () =>
      sortPlayersByFirstName(
        teamGeneratorPlayers.filter((player) => !manualTeams[player.id])
      ),
    [presentPlayers, manualTeams]
  );

  const displayPlayers = useMemo(
    () => withDisplayNames(players, useNicknames),
    [players, useNicknames]
  );

  const displayTeamA = useMemo(
    () => withDisplayNames(teamA, useNicknames),
    [teamA, useNicknames]
  );

  const displayTeamB = useMemo(
    () => withDisplayNames(teamB, useNicknames),
    [teamB, useNicknames]
  );

  const displayUnassigned = useMemo(
    () => withDisplayNames(unassigned, useNicknames),
    [unassigned, useNicknames]
  );

  const canShareLineup = allowTeams && teamA.length > 0 && teamB.length > 0;
  const canShareResult =
    allowResult &&
    teamA.length > 0 &&
    teamB.length > 0 &&
    hasResult;

  const resultSummary = useMemo(() => {
    let winsA = 0;
    let winsB = 0;

    for (const result of results) {
      if (result.goals_team_a == null || result.goals_team_b == null) continue;
      if (result.goals_team_a > result.goals_team_b) winsA += 1;
      if (result.goals_team_b > result.goals_team_a) winsB += 1;
    }

    return { winsA, winsB };
  }, [results]);

  const dayWinnerSide: "A" | "B" | null =
    resultSummary.winsA > resultSummary.winsB
      ? "A"
      : resultSummary.winsB > resultSummary.winsA
        ? "B"
        : null;

  const teamsComplete =
    !allowTeams || (teamA.length > 0 && teamB.length > 0 && unassigned.length === 0);

  const hasWinnerPhoto = Boolean(winnerPhotoUrl || session?.winner_photo_path);

  const canUploadWinnerPhoto =
    allowWinnerPhoto &&
    hasResult &&
    dayWinnerSide !== null &&
    teamsComplete &&
    teamsConfirmed &&
    !photoBusy &&
    !saving &&
    !deletingSession;

  const firstSavedResult = results[0] ?? null;
  const scoreAValue =
    results.length > 1
      ? resultSummary.winsA
      : (firstSavedResult?.goals_team_a ?? (Number(goalsA) || 0));
  const scoreBValue =
    results.length > 1
      ? resultSummary.winsB
      : (firstSavedResult?.goals_team_b ?? (Number(goalsB) || 0));

  const autoTeamNames = useMemo(
    () =>
      getAutoTeamNames(
        sessionId,
        scoreAValue,
        scoreBValue,
        teamA,
        teamB,
        useNicknames
      ),
    [sessionId, scoreAValue, scoreBValue, teamA, teamB, useNicknames]
  );

  const attendanceDone = directAttendanceSaveEnabled
    ? presentIds.length > 0
    : presentIds.length > 0 && !attendanceDirty && attendanceCollapsed;

  const teamsDone = allowTeams ? teamsComplete && teamsConfirmed && teamsCollapsed : true;
  const resultDone = allowResult ? hasResult : true;
  const showMvpSection = allowMvp && hasResult;

  const nextStepLabel = !isTrainingSession
    ? attendanceDirty
      ? t("sessionHook.saveAttendance")
      : presentPlayers.length === 0
        ? t("sessionDetail.setParticipants")
        : t("sessionHook.eventReady")
    : hasResult
      ? t("sessionHook.resultSaved")
      : attendanceDirty
        ? t("sessionHook.saveAttendance")
        : teamGeneratorPlayers.length < 2
          ? t("sessionHook.morePresent")
          : !teamsComplete
            ? t("sessionHook.assignTeams")
            : !teamsConfirmed
              ? t("sessionHook.confirmTeams")
              : t("sessionHook.enterSaveResult");

  const resultShareImageUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!canShareResult) {
      return null;
    }

    return `${window.location.origin}/api/share/result/${sessionId}/image?lang=${locale}`;
  }, [canShareResult, sessionId, locale]);

  const resultShareReady = !!preparedResultShareFile && !preparingResultShare;

  const prepareResultShare = useCallback(async () => {
    if (!resultShareImageUrl) {
      setPreparedResultShareFile(null);
      setResultShareMessage(t("sessionHook.shareCardUrlFailed"));
      return {
        ok: false as const,
        message: t("sessionHook.shareCardUrlFailed"),
      };
    }

    setPreparingResultShare(true);

    try {
      const nextFile = await fetchShareImageFile(
        resultShareImageUrl,
        `strikr-result-${sessionId}.png`
      );

      setPreparedResultShareFile(nextFile);
      setResultShareMessage(t("sessionHook.shareCardReady"));

      return { ok: true as const, file: nextFile };
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        t("sessionHook.shareCardLoadFailed")
      );

      setPreparedResultShareFile(null);
      setResultShareMessage(message);

      return { ok: false as const, message };
    } finally {
      setPreparingResultShare(false);
    }
  }, [resultShareImageUrl, sessionId]);

  async function shareText(text: string, title: string) {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({
        title,
        text,
      });
      return "shared";
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }

    throw new Error(t("sessionHook.shareUnsupported"));
  }

  function toggleGuestForm() {
    if (showGuestForm) {
      resetGuestForm();
      return;
    }

    setShowGuestForm(true);
  }

  function toggleAttendanceMultiSelect() {
    if (hasResult || savingPresence) {
      return;
    }

    clearFeedback();
    setAttendanceMultiSelectEnabled((prev) => !prev);
  }

  async function persistTeamsNow(nextTeams: TeamMap) {
    if (!allowTeams || hasResult || deletingSession || deletingGuestPlayerId) {
      return;
    }

    const requestId = ++teamSaveRequestIdRef.current;

    try {
      setSavingTeams(true);

      const formData = new FormData();
      formData.set("intent", "save_teams");
      formData.set("manual_teams", JSON.stringify(nextTeams));

      await postForm(formData);
    } catch (error: unknown) {
      setErr(getErrorMessage(error, t("sessionHook.teamsSaveFailed")));
    } finally {
      if (requestId === teamSaveRequestIdRef.current) {
        setSavingTeams(false);
      }
    }
  }

  function scheduleTeamsSave(nextTeams: TeamMap) {
    if (teamSaveTimerRef.current) {
      window.clearTimeout(teamSaveTimerRef.current);
    }

    teamSaveTimerRef.current = window.setTimeout(() => {
      void persistTeamsNow({ ...nextTeams });
    }, 350);
  }

  async function handleShareLineup() {
    try {
      setSharingLineup(true);
      clearFeedback();

      if (!canShareLineup) {
        throw new Error(t("sessionHook.assignBothTeams"));
      }

      // Vor dem Teilen immer den aktuellen Stand persistieren. So nutzt die
      // Sharecard auch direkt nach dem Generieren/Verschieben exakt diese Teams.
      await persistTeamsNow({ ...manualTeams });

      const text = buildLineupShareText(
        session,
        displayTeamA,
        displayTeamB,
        useNicknames,
        locale
      );

      try {
        const result = await shareImageFromUrl({
          imageUrl: `/share/lineup/${sessionId}/image`,
          fileName: `strikr-aufstellung-${sessionId}.png`,
          title: t("sessionHook.lineupTitle"),
          text,
        });

        if (result.mode === "cancelled") {
          return;
        }

        setMsg(t("sessionHook.lineupShared"));
        return;
      } catch {
        // Falls Bild-Sharing im Browser nicht verfügbar ist, bleibt der
        // bestehende Text-Share als verlässlicher Fallback erhalten.
      }

      const result = await shareText(text, t("sessionHook.lineupShareTitle"));

      setMsg(
        result === "copied"
          ? t("sessionHook.lineupCopied")
          : t("sessionHook.lineupShared")
      );
    } catch (e: unknown) {
      setErr(getErrorMessage(e, t("sessionHook.lineupShareFailed")));
    } finally {
      setSharingLineup(false);
    }
  }

  async function handleShareInternalResult() {
    try {
      setSharingInternal(true);
      clearFeedback();

      if (!canShareResult) {
        throw new Error(
          t("sessionHook.completeTeamsResult")
        );
      }

      const highlight = getResultHighlight(scoreAValue, scoreBValue);
      const story = getResultStory(scoreAValue, scoreBValue);
      const sessionUrl = `${window.location.origin}/sessions/${sessionId}`;
      const teamLine = `${autoTeamNames.a} vs ${autoTeamNames.b}`;

      const shareTextValue = `🔥 ${scoreAValue}:${scoreBValue}

${teamLine}
${highlight}
${story}

${t("sessionHook.shareGroupText")}
${sessionUrl}`;

      const result = await shareText(
        shareTextValue,
        t("sessionHook.shareGroupTitle")
      );

      setMsg(
        result === "copied"
          ? t("sessionHook.groupCopied")
          : t("sessionHook.shareSuccess")
      );
    } catch (e: unknown) {
      setErr(
        getErrorMessage(e, t("sessionHook.shareFailed"))
      );
    } finally {
      setSharingInternal(false);
    }
  }

  async function handleShareResult() {
    try {
      setSharingResult(true);
      clearFeedback();

      if (!canShareResult) {
        throw new Error(
          t("sessionHook.completeValidTeamsResult")
        );
      }

      if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
        throw new Error(t("sessionHook.shareUnsupported"));
      }

      let shareFile = preparedResultShareFile;

      if (!shareFile) {
        setResultShareMessage(null);

        const prepared = await prepareResultShare();

        if (!prepared.ok) {
          return;
        }

        shareFile = prepared.file;
      }

      if (!shareFile) {
        throw new Error(t("sessionHook.shareCardPrepareFailed"));
      }

      if (typeof navigator.canShare === "function") {
        const canShareFiles = navigator.canShare({
          files: [shareFile],
        });

        if (!canShareFiles) {
          throw new Error(
            t("sessionHook.imageShareUnsupported")
          );
        }
      }

      await navigator.share({
        files: [shareFile],
      });

      setResultShareMessage(t("sessionHook.shareCardShared"));
    } catch (e: unknown) {
      const error =
        e instanceof Error ? e : new Error(t("sessionHook.shareCardFailed"));

      const errorName =
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        typeof (error as { name?: unknown }).name === "string"
          ? (error as { name: string }).name
          : "";

      if (errorName === "AbortError") {
        setResultShareMessage(null);
        setErr(null);
        return;
      }

      const rawMessage =
        error instanceof Error ? error.message : t("sessionHook.shareCardFailed");

      const isUserGestureIssue =
        rawMessage.includes("Must be handling a user gesture") ||
        rawMessage.includes("share") ||
        rawMessage.includes("Navigator");

      const message = isUserGestureIssue
        ? t("sessionHook.directShareBlocked")
        : getErrorMessage(error, t("sessionHook.shareCardFailed"));

      setResultShareMessage(message);
    } finally {
      setSharingResult(false);
    }
  }

  async function handleDeleteGuestPlayer(playerId: number) {
    if (!isAdmin) {
      setErr(t("sessionHook.adminDeleteGuest"));
      return;
    }

    if (hasResult) {
      setErr(
        t("sessionHook.guestDeleteLocked")
      );
      return;
    }

    const player = players.find((entry) => entry.id === playerId);

    if (!player?.is_guest) {
      setErr(t("sessionHook.onlyGuestDelete"));
      return;
    }

    if (deletingGuestPlayerId || savingPresence || saving || deletingSession) {
      return;
    }

    const playerName =
      player.name?.trim() ||
      [player.first_name, player.last_name].filter(Boolean).join(" ").trim() ||
      player.nickname?.trim() ||
      t("sessionHook.guest");

    const confirmed = window.confirm(
      t("sessionHook.deleteGuestConfirm", { name: playerName })
    );

    if (!confirmed) return;

    const restoreScroll = preserveScrollPosition();

    try {
      setDeletingGuestPlayerId(playerId);
      clearFeedback();

      const formData = new FormData();
      formData.set("intent", "delete_guest_player");
      formData.set("player_id", String(playerId));

      const result = await postForm(formData);

      if ("deletedGuestPlayerId" in result) {
        const deletedId = result.deletedGuestPlayerId;

        setPlayers((prev) => prev.filter((entry) => entry.id !== deletedId));
        setPresentIds((prev) => prev.filter((id) => id !== deletedId));
        setDraftPresentIds((prev) => prev.filter((id) => id !== deletedId));
        setManualTeams((prev) => removePlayerFromTeamMap(prev, deletedId));

        setMsg(result.message);
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, t("sessionHook.deleteGuestFailed")));
    } finally {
      setDeletingGuestPlayerId(null);
      restoreScroll();
    }
  }

  async function handleDeleteSession() {
    if (!isAdmin) {
      setErr(t("sessionHook.adminDeleteSession"));
      return;
    }

    if (deletingSession || saving || savingPresence || photoBusy) {
      return;
    }

    const okConfirm = window.confirm(
      t("sessionHook.deleteSessionConfirm")
    );

    if (!okConfirm) return;

    const restoreScroll = preserveScrollPosition();

    try {
      setDeletingSession(true);
      clearFeedback();

      const formData = new FormData();
      formData.set("intent", "delete_session");

      const result = await postForm(formData);

      if ("deleted" in result && result.deleted) {
        router.push("/sessions?deleted=1");
        router.refresh();
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, t("sessionHook.deleteSessionFailed")));
    } finally {
      setDeletingSession(false);
      restoreScroll();
    }
  }

  async function togglePresence(id: number) {
    if (hasResult) {
      setErr(
        t("sessionHook.attendanceLocked")
      );
      return;
    }

    if (deletingSession || deletingGuestPlayerId) {
      return;
    }

    clearFeedback();

    if (!directAttendanceSaveEnabled) {
      setDraftPresentIds((prev) =>
        prev.includes(id)
          ? prev.filter((playerId) => playerId !== id)
          : [...prev, id]
      );
      return;
    }

    if (savingPresence) {
      return;
    }

    const restoreScroll = preserveScrollPosition();
    const isCurrentlyPresent = presentIds.includes(id);

    try {
      setSavingPresence(true);

      const formData = new FormData();
      formData.set("intent", "toggle_presence");
      formData.set("player_id", String(id));

      await postForm(formData);

      const nextPresentIds = isCurrentlyPresent
        ? presentIds.filter((playerId) => playerId !== id)
        : [...presentIds, id];

      const nextManualTeams = isCurrentlyPresent
        ? removePlayerFromTeamMap(manualTeams, id)
        : ensurePresentPlayersExistInTeamMap(
            {
              ...manualTeams,
              [id]: manualTeams[id] ?? null,
            },
            nextPresentIds
          );

      setPresentIds(nextPresentIds);
      setDraftPresentIds(nextPresentIds);
      setManualTeams(nextManualTeams);
      setTeamsConfirmed(false);

      if (allowTeams) {
        await persistTeamsNow(nextManualTeams);
      }

      setMsg(isCurrentlyPresent ? t("sessionHook.attendanceRemoved") : t("sessionHook.attendanceSaved"));
    } catch (e: unknown) {
      setErr(getErrorMessage(e, t("sessionHook.attendanceSaveFailed")));
    } finally {
      setSavingPresence(false);
      restoreScroll();
    }
  }

  async function savePresence() {
    if (
      hasResult ||
      savingPresence ||
      !attendanceDirty ||
      deletingSession ||
      deletingGuestPlayerId
    ) {
      return;
    }

    const restoreScroll = preserveScrollPosition();

    try {
      setSavingPresence(true);
      clearFeedback();

      const toRemove = presentIds.filter((id) => !draftPresentIds.includes(id));
      const toAdd = draftPresentIds.filter((id) => !presentIds.includes(id));

      for (const id of toRemove) {
        const formData = new FormData();
        formData.set("intent", "toggle_presence");
        formData.set("player_id", String(id));
        await postForm(formData);
      }

      for (const id of toAdd) {
        const formData = new FormData();
        formData.set("intent", "toggle_presence");
        formData.set("player_id", String(id));
        await postForm(formData);
      }

      const nextManualTeams = ensurePresentPlayersExistInTeamMap(
        manualTeams,
        draftPresentIds
      );

      setPresentIds(draftPresentIds);
      setManualTeams(nextManualTeams);
      setTeamsConfirmed(false);

      if (allowTeams) {
        await persistTeamsNow(nextManualTeams);
      }

      setAttendanceCollapsed(true);
      setMsg(t("sessionHook.attendanceSaved"));
    } catch (e: unknown) {
      setErr(getErrorMessage(e, t("sessionHook.attendanceSaveFailed")));
    } finally {
      setSavingPresence(false);
      restoreScroll();
    }
  }

  async function addGuestPlayer() {
    const restoreScroll = preserveScrollPosition();

    try {
      if (!isAdmin) {
        throw new Error(
          t("sessionHook.guestAdminOnly")
        );
      }

      if (hasResult) {
        throw new Error(
          t("sessionHook.guestAddLocked")
        );
      }

      if (!clubId) {
        throw new Error(t("sessionHook.noClub"));
      }

      setGuestSaving(true);
      clearFeedback();

      const cleanName = guestName.trim();
      if (!cleanName) {
        throw new Error(t("sessionHook.guestName"));
      }

      const formData = new FormData();
      formData.set("intent", "add_guest_player");
      formData.set("guest_name", cleanName);
      formData.set("guest_position", guestPosition ?? "");
      formData.set("guest_age_group", guestAgeGroup ?? "");
      formData.set("guest_strength", guestStrength);

      const result = await postForm(formData);

      if ("player" in result) {
        const nextPlayer = result.player;
        const nextPresentIds = presentIds.includes(nextPlayer.id)
          ? presentIds
          : [...presentIds, nextPlayer.id];
        const nextDraftPresentIds = draftPresentIds.includes(nextPlayer.id)
          ? draftPresentIds
          : [...draftPresentIds, nextPlayer.id];

        setPlayers((prev) => sortPlayersByFirstName([...prev, nextPlayer]));
        setPresentIds(nextPresentIds);
        setDraftPresentIds(nextDraftPresentIds);
        setManualTeams((prev) => ({
          ...prev,
          [nextPlayer.id]: prev[nextPlayer.id] ?? null,
        }));
        setTeamsConfirmed(false);

        resetGuestForm();
        setMsg(result.message);
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, t("sessionHook.guestAddFailed")));
    } finally {
      setGuestSaving(false);
      restoreScroll();
    }
  }

  async function generateTeams() {
    if (!allowTeams) {
      setErr(t("sessionHook.noTeamsEvent"));
      return;
    }

    if (hasResult) {
      setErr(t("sessionHook.teamsLocked"));
      return;
    }

    if (attendanceDirty) {
      setErr(t("sessionHook.saveAttendanceFirst"));
      return;
    }

    const restoreScroll = preserveScrollPosition();

    clearFeedback();

    const present = teamGeneratorPlayers;
    if (present.length < 2) {
      setErr(t("sessionHook.minPlayers"));
      restoreScroll();
      return;
    }

    const targetA = Math.ceil(present.length / 2);
    const targetB = Math.floor(present.length / 2);

    const keepers = present.filter((p) => p.preferred_position === "goalkeeper");
    const field = present.filter((p) => p.preferred_position !== "goalkeeper");
    const useStrength = clubSettings?.use_strength ?? true;
    const useCategories = clubSettings?.use_categories ?? true;
    const shouldUseScore = useStrength || useCategories;
    const balanceCategories = initialBalanceCategories ?? [];

    type BalanceQuality = {
      goalkeeperDiff: number;
      scoreDiff: number;
      groupPenalty: number;
      categoryPositionPenalty: number;
      positionPenalty: number;
    };

    function evaluate(A: Player[], B: Player[]): BalanceQuality {
      const scoreDiff = shouldUseScore
        ? Math.abs(
            sumTeamScore(A, { useStrength, useCategories, balanceCategories }) -
              sumTeamScore(B, { useStrength, useCategories, balanceCategories })
          )
        : 0;

      const goalkeeperDiff = Math.abs(
        A.filter((player) => player.preferred_position === "goalkeeper").length -
          B.filter((player) => player.preferred_position === "goalkeeper").length
      );

      return {
        goalkeeperDiff,
        scoreDiff,
        groupPenalty: balanceGroupPenalty(A, B),
        categoryPositionPenalty: useCategories
          ? categoryPositionBalancePenalty(A, B, balanceCategories)
          : 0,
        positionPenalty: positionBalancePenalty(A, B),
      };
    }

    function compareQuality(left: BalanceQuality, right: BalanceQuality) {
      const priorities: (keyof BalanceQuality)[] = [
        "goalkeeperDiff",
        "scoreDiff",
        "groupPenalty",
        "categoryPositionPenalty",
        "positionPenalty",
      ];

      for (const key of priorities) {
        if (left[key] !== right[key]) {
          return left[key] - right[key];
        }
      }

      return 0;
    }

    let bestA: Player[] = [];
    let bestB: Player[] = [];
    let bestQuality: BalanceQuality | null = null;

    const attempts = Math.max(1200, Math.min(6000, present.length * 250));

    for (let k = 0; k < attempts; k += 1) {
      const A: Player[] = [];
      const B: Player[] = [];
      let keeperCountA = 0;
      let keeperCountB = 0;

      for (const goalkeeper of shuffle(keepers)) {
        if (A.length >= targetA) {
          B.push(goalkeeper);
          keeperCountB += 1;
          continue;
        }

        if (B.length >= targetB) {
          A.push(goalkeeper);
          keeperCountA += 1;
          continue;
        }

        if (keeperCountA < keeperCountB) {
          A.push(goalkeeper);
          keeperCountA += 1;
        } else if (keeperCountB < keeperCountA) {
          B.push(goalkeeper);
          keeperCountB += 1;
        } else if (Math.random() < 0.5) {
          A.push(goalkeeper);
          keeperCountA += 1;
        } else {
          B.push(goalkeeper);
          keeperCountB += 1;
        }
      }

      const shuffledField = shuffle(field);
      const remainingA = targetA - A.length;
      const remainingB = targetB - B.length;

      A.push(...shuffledField.slice(0, remainingA));
      B.push(...shuffledField.slice(remainingA, remainingA + remainingB));

      if (!(A.length === targetA && B.length === targetB)) {
        continue;
      }

      const quality = evaluate(A, B);

      if (!bestQuality || compareQuality(quality, bestQuality) < 0) {
        bestQuality = quality;
        bestA = A;
        bestB = B;
      }
    }

    if (!bestQuality || bestA.length === 0 || bestB.length === 0) {
      setErr(t("sessionHook.noValidSplit"));
      restoreScroll();
      return;
    }

    const maxSwapRounds = Math.min(40, present.length * 2);

    for (let round = 0; round < maxSwapRounds; round += 1) {
      let roundBestA = bestA;
      let roundBestB = bestB;
      let roundBestQuality: BalanceQuality = bestQuality;
      let improved = false;

      for (let aIndex = 0; aIndex < bestA.length; aIndex += 1) {
        for (let bIndex = 0; bIndex < bestB.length; bIndex += 1) {
          const candidateA = [...bestA];
          const candidateB = [...bestB];

          const playerA = candidateA[aIndex];
          const playerB = candidateB[bIndex];
          candidateA[aIndex] = playerB;
          candidateB[bIndex] = playerA;

          const candidateQuality = evaluate(candidateA, candidateB);

          if (compareQuality(candidateQuality, roundBestQuality) < 0) {
            roundBestA = candidateA;
            roundBestB = candidateB;
            roundBestQuality = candidateQuality;
            improved = true;
          }
        }
      }

      if (!improved) {
        break;
      }

      bestA = roundBestA;
      bestB = roundBestB;
      bestQuality = roundBestQuality;
    }

    const next: TeamMap = {};
    present.forEach((player) => {
      next[player.id] = null;
    });

    for (const player of bestA) next[player.id] = "A";
    for (const player of bestB) next[player.id] = "B";

    setManualTeams(next);
    setTeamsConfirmed(false);
    await persistTeamsNow(next);

    const usesBalanceGroups = present.some((player) =>
      Boolean(player.balance_group?.trim())
    );

    const balanceGroupText = usesBalanceGroups
      ? locale === "de"
        ? " und Balance-Gruppen"
        : " and balance groups"
      : "";

    if (useStrength && useCategories) {
      setMsg(
        t("sessionHook.optimizedAll", { groups: balanceGroupText })
      );
    } else if (useStrength && !useCategories) {
      setMsg(
        t("sessionHook.optimizedStrength", { groups: balanceGroupText })
      );
    } else if (!useStrength && useCategories) {
      setMsg(
        t("sessionHook.optimizedCategories", { groups: balanceGroupText })
      );
    } else {
      setMsg(
        t("sessionHook.optimizedPositions", { groups: balanceGroupText })
      );
    }

    setTeamsCollapsed(false);
    restoreScroll();
  }

  function confirmTeams() {
    if (!allowTeams) {
      return;
    }

    if (hasResult) {
      return;
    }

    if (!teamsComplete) {
      setErr(t("sessionHook.assignAllTeams"));
      return;
    }

    clearFeedback();
    setTeamsConfirmed(true);
    setTeamsCollapsed(true);
    setMsg(t("sessionHook.teamsConfirmed"));
  }

  function setSide(playerId: number, side: TeamSide | null) {
    if (!allowTeams) {
      setErr(t("sessionHook.noTeamsEvent"));
      return;
    }

    if (hasResult) {
      setErr(t("sessionHook.teamsLocked"));
      return;
    }

    if (attendanceDirty) {
      setErr(t("sessionHook.saveAttendanceFirst"));
      return;
    }

    setErr(null);

    setManualTeams((prev) => {
      const next = { ...prev, [playerId]: side };
      setTeamsConfirmed(false);
      scheduleTeamsSave(next);
      return next;
    });
  }

  async function persistGameResult(
    gameNo: number,
    rawGoalsA: string,
    rawGoalsB: string,
    isNewGame: boolean,
  ) {
    if (!allowResult) {
      setErr(t("sessionHook.noResultEvent"));
      return;
    }

    if (saving || deletingSession || deletingGuestPlayerId) return;

    const cleanA = normalizeGoalValue(rawGoalsA);
    const cleanB = normalizeGoalValue(rawGoalsB);

    if (attendanceDirty) {
      setErr(t("sessionHook.saveAttendanceFirst"));
      return;
    }

    if (!teamsComplete) {
      setErr(
        t("sessionHook.assignPresent")
      );
      return;
    }

    if (!teamsConfirmed) {
      setErr(t("sessionHook.confirmTeamsFirst"));
      return;
    }

    if (cleanA === "" || cleanB === "") {
      setErr(t("sessionHook.enterCompleteResult"));
      return;
    }

    if (isNewGame && results.length === 0) {
      const okConfirm = window.confirm(
        t("sessionHook.firstResultConfirm")
      );
      if (!okConfirm) return;
    }

    const restoreScroll = preserveScrollPosition();

    try {
      setSaving(true);
      clearFeedback();

      const formData = new FormData();
      formData.set("intent", "save_result");
      formData.set("game_no", String(gameNo));
      formData.set("goals_a", cleanA);
      formData.set("goals_b", cleanB);
      formData.set("manual_teams", JSON.stringify(manualTeams));

      const result = await postForm(formData);

      if ("gameNo" in result) {
        const nextGame: SessionGameResult = {
          game_no: result.gameNo,
          goals_team_a: Number(result.goalsA),
          goals_team_b: Number(result.goalsB),
        };

        setResults((previous) => {
          const withoutCurrent = previous.filter(
            (entry) => entry.game_no !== result.gameNo
          );
          return [...withoutCurrent, nextGame].sort(
            (a, b) => a.game_no - b.game_no
          );
        });
        setHasResult(true);
        setAttendanceCollapsed(true);
        setTeamsCollapsed(true);
        setWinnerPhotoCollapsed(false);
        setTeamsConfirmed(true);

        if (result.winnerPhotoCleared === true && session) {
          setSession({ ...session, winner_photo_path: null });
          setWinnerPhotoUrl(null);
        }
        setMsg(result.message);
        resetPreparedResultShare();

        if (isNewGame) {
          setGoalsA("");
          setGoalsB("");
        }

        setResultCollapsed(false);
        setShowSessionEndModal(false);
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, t("sessionHook.saveFailed")));
    } finally {
      setSaving(false);
      restoreScroll();
    }
  }

  async function saveResult() {
    const nextGameNo =
      results.reduce((max, entry) => Math.max(max, entry.game_no), 0) + 1;
    await persistGameResult(nextGameNo, goalsA, goalsB, true);
  }

  async function updateResult(
    gameNo: number,
    nextGoalsA: string,
    nextGoalsB: string,
  ) {
    await persistGameResult(gameNo, nextGoalsA, nextGoalsB, false);
  }

  async function deleteResult(gameNo: number) {
    if (!allowResult) {
      setErr(t("sessionHook.noResultEvent"));
      return;
    }

    if (saving || deletingSession || deletingGuestPlayerId) return;

    const okConfirm = window.confirm(t("sessionHook.deleteGameConfirm", { game: gameNo }));
    if (!okConfirm) return;

    const restoreScroll = preserveScrollPosition();

    try {
      setSaving(true);
      clearFeedback();

      const formData = new FormData();
      formData.set("intent", "delete_result");
      formData.set("game_no", String(gameNo));

      const result = await postForm(formData);

      if ("hasResult" in result) {
        const nextResults = results.filter((entry) => entry.game_no !== gameNo);
        setResults(nextResults);
        setHasResult(result.hasResult);
        setShowSessionEndModal(false);
        resetPreparedResultShare();

        if (result.winnerPhotoCleared === true && session) {
          setSession({ ...session, winner_photo_path: null });
          setWinnerPhotoUrl(null);
        }
        setMsg(result.message);

        if (!result.hasResult) {
          setAttendanceCollapsed(false);
          setTeamsCollapsed(false);
          setWinnerPhotoCollapsed(false);
          setResultCollapsed(false);
        }
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, t("sessionHook.deleteResultFailed")));
    } finally {
      setSaving(false);
      restoreScroll();
    }
  }

  async function handleWinnerPhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!allowWinnerPhoto) {
      setErr(t("sessionHook.noWinnerPhotoEvent"));
      return;
    }

    if (!hasResult) {
      setErr(t("sessionHook.saveResultFirst"));
      return;
    }

    if (!dayWinnerSide) {
      setErr(t("sessionHook.noClearWinnerPhoto"));
      return;
    }

    if (!session) {
      setErr(t("sessionHook.trainingLoadFailed"));
      return;
    }

    if (!teamsComplete) {
      setErr(
        t("sessionHook.assignTeamsBeforePhoto")
      );
      return;
    }

    if (!teamsConfirmed) {
      setErr(t("sessionHook.confirmTeamsFirst"));
      return;
    }

    if (photoBusy || saving || deletingSession || deletingGuestPlayerId) return;

    const restoreScroll = preserveScrollPosition();

    try {
      setPhotoBusy(true);
      clearFeedback();

      const orientation = await detectImageOrientation(file);
      const uploadFile = await compressImageFile(file, {
        maxWidth: 1800,
        maxHeight: 1800,
        quality: 0.84,
        outputType: "image/jpeg",
      });

      const formData = new FormData();
      formData.set("intent", "upload_winner_photo");
      formData.set("file", uploadFile);

      const result = await postForm(formData);

      if ("winner_photo_path" in result) {
        const nextSession: SessionRow = {
          ...session,
          winner_photo_path: result.winner_photo_path,
        };

        setSession(nextSession);
        setWinnerPhotoUrl(result.winnerPhotoUrl);
        resetPreparedResultShare();

        const orientationHint =
          orientation === "landscape" || orientation === "square"
            ? t("sessionHook.photoPortraitTip")
            : "";

        setMsg(t("sessionHook.photoSaved", { hint: orientationHint }));
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, t("sessionHook.photoUploadFailed")));
    } finally {
      setPhotoBusy(false);
      restoreScroll();
    }
  }

  async function handleWinnerPhotoDelete() {
    if (!allowWinnerPhoto) {
      setErr(t("sessionHook.noWinnerPhotoEvent"));
      return;
    }

    if (!session?.winner_photo_path) {
      setErr(t("sessionHook.noWinnerPhoto"));
      return;
    }

    if (photoBusy || saving || deletingSession || deletingGuestPlayerId) return;

    const okConfirm = window.confirm(t("sessionHook.deletePhotoConfirm"));
    if (!okConfirm) return;

    const restoreScroll = preserveScrollPosition();

    try {
      setPhotoBusy(true);
      clearFeedback();

      const formData = new FormData();
      formData.set("intent", "delete_winner_photo");

      const result = await postForm(formData);

      if ("winner_photo_path" in result) {
        const nextSession: SessionRow = {
          ...session,
          winner_photo_path: result.winner_photo_path,
        };

        setSession(nextSession);
        setWinnerPhotoUrl(result.winnerPhotoUrl);
        resetPreparedResultShare();
        setMsg(result.message);
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, t("sessionHook.deletePhotoFailed")));
    } finally {
      setPhotoBusy(false);
      restoreScroll();
    }
  }

  const metaA = teamMeta(teamA);
  const metaB = teamMeta(teamB);

  return {
    router,
    resultRef,
    teamsRef,
    attendanceRef,
    winnerPhotoInputRef,

    session,
    players,
    presentIds,
    draftPresentIds,
    manualTeams,
    clubId,
    isAdmin,
    clubSettings,
    useNicknames,
    useFieldView,
    primaryColorKey,
    mvpVotingEnabled,
    homeSessionRsvpEnabled,
    attendanceMultiSelectEnabled,
    directAttendanceSaveEnabled,

    sessionType,
    isTrainingSession,
    isEventSession,
    allowTeams,
    allowResult,
    allowWinnerPhoto,
    allowMvp,

    winnerPhotoUrl,
    goalsA,
    goalsB,
    setGoalsA,
    setGoalsB,
    results,
    hasResult,
    hasWinnerPhoto,
    teamsConfirmed,

    showSessionEndModal,
    setShowSessionEndModal,

    showGuestForm,
    guestName,
    setGuestName,
    guestPosition,
    setGuestPosition,
    guestAgeGroup,
    setGuestAgeGroup,
    guestStrength,
    setGuestStrength,
    guestSaving,
    deletingGuestPlayerId,

    attendanceCollapsed,
    setAttendanceCollapsed,
    teamsCollapsed,
    setTeamsCollapsed,
    winnerPhotoCollapsed,
    setWinnerPhotoCollapsed,
    resultCollapsed,
    setResultCollapsed,

    saving,
    savingTeams,
    savingPresence,
    photoBusy,
    sharingLineup,
    sharingResult,
    sharingInternal,
    deletingSession,
    msg,
    err,

    preparedResultShareFile,
    preparingResultShare,
    resultShareReady,
    resultShareMessage,
    prepareResultShare,

    attendanceDirty,
    presentPlayers,
    teamA,
    teamB,
    unassigned,
    displayPlayers,
    displayTeamA,
    displayTeamB,
    displayUnassigned,

    canShareLineup,
    canShareResult,
    teamsComplete,
    canUploadWinnerPhoto,
    scoreAValue,
    scoreBValue,
    dayWinnerSide,
    autoTeamNames,

    attendanceDone,
    teamsDone,
    resultDone,
    showMvpSection,
    nextStepLabel,

    metaA,
    metaB,

    toggleGuestForm,
    toggleAttendanceMultiSelect,
    confirmTeams,
    handleShareLineup,
    handleShareInternalResult,
    handleShareResult,
    handleDeleteGuestPlayer,
    handleDeleteSession,
    togglePresence,
    savePresence,
    addGuestPlayer,
    generateTeams,
    setSide,
    saveResult,
    updateResult,
    deleteResult,
    handleWinnerPhotoUpload,
    handleWinnerPhotoDelete,
  };
}