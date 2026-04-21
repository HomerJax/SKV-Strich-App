"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Player,
  SessionRow,
  TeamMap,
  TeamSide,
  SessionType,
} from "./session-types";
import {
  buildLineupShareText,
  getErrorMessage,
  normalizeGoalValue,
  positionBalancePenalty,
  shuffle,
  sumTeamScore,
} from "./session-ui";
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
import { fetchImageAsFile } from "@/lib/share/utils";

type SessionDetailClientProps = {
  sessionId: number;
  initialSession: SessionRow;
  initialPlayers: Player[];
  initialPresentIds: number[];
  initialManualTeams: TeamMap;
  initialClubId: string;
  initialIsAdmin: boolean;
  initialClubSettings: ClubSettings;
  initialWinnerPhotoUrl: string | null;
  initialGoalsA: string;
  initialGoalsB: string;
  initialHasResult: boolean;
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
  | { ok: true; message: string; hasResult: boolean; goalsA: string; goalsB: string }
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

export function useSessionDetail({
  sessionId,
  initialSession,
  initialPlayers,
  initialPresentIds,
  initialManualTeams,
  initialClubId,
  initialIsAdmin,
  initialClubSettings,
  initialWinnerPhotoUrl,
  initialGoalsA,
  initialGoalsB,
  initialHasResult,
  initialPrimaryColor,
  initialMvpVotingEnabled,
  initialUseNicknames,
  initialUseFieldView,
  initialHomeSessionRsvpEnabled,
}: SessionDetailClientProps) {
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
  const [hasResult, setHasResult] = useState(initialHasResult);

  const [showSessionEndModal, setShowSessionEndModal] = useState(false);

  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPosition, setGuestPosition] = useState<
    Player["preferred_position"] | ""
  >("");
  const [guestAgeGroup, setGuestAgeGroup] = useState<Player["age_group"] | "">(
    ""
  );
  const [guestSaving, setGuestSaving] = useState(false);
  const [deletingGuestPlayerId, setDeletingGuestPlayerId] = useState<number | null>(
    null
  );

  const [attendanceCollapsed, setAttendanceCollapsed] = useState(initialHasResult);
  const [teamsCollapsed, setTeamsCollapsed] = useState(initialHasResult);

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
          `Server hat keine gültige JSON-Antwort geliefert (HTTP ${response.status}).`
        );
      }
    }

    if (!response.ok) {
      if (payload && "error" in payload) {
        throw new Error(payload.error);
      }

      throw new Error(raw || `Unbekannter Fehler (HTTP ${response.status}).`);
    }

    if (!payload) {
      throw new Error("Server hat keine Antwort geliefert.");
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

  useEffect(() => {
    if (initialHasResult) {
      setAttendanceCollapsed(true);
      setTeamsCollapsed(true);
    }
  }, [initialHasResult]);

  useEffect(() => {
    return () => {
      if (teamSaveTimerRef.current) {
        window.clearTimeout(teamSaveTimerRef.current);
      }
    };
  }, []);

  // 🔥 WICHTIG: Wenn der Server nach Session-Type-Switch neue Props liefert,
  // muss die lokale Session-State darauf reagieren.
  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  // Diese Syncs helfen zusätzlich, damit UI nach Server Action sauber nachzieht.
  useEffect(() => {
    setWinnerPhotoUrl(initialWinnerPhotoUrl);
  }, [initialWinnerPhotoUrl]);

  useEffect(() => {
    setHasResult(initialHasResult);
    setGoalsA(initialGoalsA);
    setGoalsB(initialGoalsB);
  }, [initialHasResult, initialGoalsA, initialGoalsB]);

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

  const teamA = useMemo(
    () =>
      sortPlayersByFirstName(
        presentPlayers.filter((player) => manualTeams[player.id] === "A")
      ),
    [presentPlayers, manualTeams]
  );

  const teamB = useMemo(
    () =>
      sortPlayersByFirstName(
        presentPlayers.filter((player) => manualTeams[player.id] === "B")
      ),
    [presentPlayers, manualTeams]
  );

  const unassigned = useMemo(
    () =>
      sortPlayersByFirstName(
        presentPlayers.filter((player) => !manualTeams[player.id])
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
    goalsA.trim() !== "" &&
    goalsB.trim() !== "";

  const teamsComplete =
    !allowTeams || (teamA.length > 0 && teamB.length > 0 && unassigned.length === 0);

  const canUploadWinnerPhoto =
    allowWinnerPhoto && teamsComplete && !photoBusy && !saving && !deletingSession;

  const scoreAValue = Number(goalsA) || 0;
  const scoreBValue = Number(goalsB) || 0;

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

  const teamsDone = allowTeams ? teamsComplete && teamsCollapsed : true;
  const resultDone = allowResult ? hasResult : true;
  const showMvpSection = allowMvp && hasResult;

  const nextStepLabel = !isTrainingSession
    ? attendanceDirty
      ? "Anwesenheit speichern"
      : presentPlayers.length === 0
        ? "Teilnehmer festlegen"
        : "Termin ist organisatorisch bereit"
    : hasResult
      ? "Ergebnis ist gespeichert"
      : attendanceDirty
        ? "Anwesenheit speichern"
        : presentPlayers.length < 2
          ? "Mehr Spieler auf anwesend setzen"
          : !teamsComplete
            ? "Teams fertig zuweisen"
            : "Ergebnis eintragen und speichern";

  const resultShareImageUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!canShareResult) {
      return null;
    }

    return `${window.location.origin}/api/share/result/${sessionId}/image`;
  }, [canShareResult, sessionId]);

  const resultShareReady = !!preparedResultShareFile && !preparingResultShare;

  const prepareResultShare = useCallback(async () => {
    if (!resultShareImageUrl) {
      setPreparedResultShareFile(null);
      setResultShareMessage("SiegerCard-URL konnte nicht erzeugt werden.");
      return {
        ok: false as const,
        message: "SiegerCard-URL konnte nicht erzeugt werden.",
      };
    }

    setPreparingResultShare(true);

    try {
      const nextFile = await fetchShareImageFile(
        resultShareImageUrl,
        `strikr-result-${sessionId}.png`
      );

      setPreparedResultShareFile(nextFile);
      setResultShareMessage("SiegerCard ist bereit.");

      return { ok: true as const, file: nextFile };
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "SiegerCard konnte nicht geladen werden."
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

    throw new Error("Teilen wird auf diesem Gerät/Browser nicht unterstützt.");
  }

  function resetGuestForm() {
    setGuestName("");
    setGuestPosition("");
    setGuestAgeGroup("");
    setShowGuestForm(false);
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

    setErr(null);
    setMsg(null);

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
      setErr(getErrorMessage(error, "Teams konnten nicht gespeichert werden."));
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
      setErr(null);
      setMsg(null);

      if (!canShareLineup) {
        throw new Error("Bitte zuerst beide Teams zuweisen.");
      }

      const text = buildLineupShareText(
        session,
        displayTeamA,
        displayTeamB,
        useNicknames
      );

      const result = await shareText(text, "Aufstellung teilen");

      setMsg(
        result === "copied"
          ? "Aufstellungs-Text in die Zwischenablage kopiert."
          : "Aufstellung erfolgreich geteilt."
      );
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Aufstellung konnte nicht geteilt werden."));
    } finally {
      setSharingLineup(false);
    }
  }

  async function handleShareInternalResult() {
    try {
      setSharingInternal(true);
      setErr(null);
      setMsg(null);

      if (!canShareResult) {
        throw new Error(
          "Bitte zuerst Teams und Ergebnis vollständig eintragen."
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

Schau dir das Ergebnis an, prüf deine Stats und teile die SiegerCard weiter 👀
${sessionUrl}`;

      const result = await shareText(
        shareTextValue,
        "Ergebnis & Stats in Gruppe teilen"
      );

      setMsg(
        result === "copied"
          ? "Text zum Gruppenteilen in die Zwischenablage kopiert."
          : "Ergebnis erfolgreich in der Gruppe geteilt."
      );
    } catch (e: unknown) {
      setErr(
        getErrorMessage(e, "Ergebnis konnte nicht in der Gruppe geteilt werden.")
      );
    } finally {
      setSharingInternal(false);
    }
  }

  async function handleShareResult() {
    try {
      setSharingResult(true);
      setErr(null);
      setMsg(null);

      if (!canShareResult) {
        throw new Error(
          "Bitte zuerst Teams und Ergebnis vollständig und gültig eintragen."
        );
      }

      if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
        throw new Error("Teilen wird auf diesem Gerät oder Browser nicht unterstützt.");
      }

      let shareFile = preparedResultShareFile;

      if (!shareFile) {
        setResultShareMessage("SiegerCard wird vorbereitet ...");

        const prepared = await prepareResultShare();

        if (!prepared.ok) {
          return;
        }

        shareFile = prepared.file;
      }

      if (!shareFile) {
        throw new Error("SiegerCard konnte nicht vorbereitet werden.");
      }

      if (typeof navigator.canShare === "function") {
        const canShareFiles = navigator.canShare({
          files: [shareFile],
        });

        if (!canShareFiles) {
          throw new Error(
            "Dieser Browser unterstützt das direkte Teilen von Bilddateien hier nicht."
          );
        }
      }

      await navigator.share({
        files: [shareFile],
      });

      setResultShareMessage("SiegerCard erfolgreich geteilt.");
    } catch (e: unknown) {
      const error =
        e instanceof Error ? e : new Error("SiegerCard konnte nicht geteilt werden.");

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

      const message = getErrorMessage(error, "SiegerCard konnte nicht geteilt werden.");
      setErr(message);
      setResultShareMessage(message);
    } finally {
      setSharingResult(false);
    }
  }

  async function handleDeleteGuestPlayer(playerId: number) {
    if (!isAdmin) {
      setErr("Nur Admins dürfen Gastspieler löschen.");
      return;
    }

    if (hasResult) {
      setErr(
        "Gastspieler können nicht mehr gelöscht werden, wenn bereits ein Ergebnis gespeichert ist."
      );
      return;
    }

    const player = players.find((entry) => entry.id === playerId);

    if (!player?.is_guest) {
      setErr("Nur Gastspieler können hier gelöscht werden.");
      return;
    }

    if (deletingGuestPlayerId || savingPresence || saving || deletingSession) {
      return;
    }

    const playerName =
      player.name?.trim() ||
      [player.first_name, player.last_name].filter(Boolean).join(" ").trim() ||
      player.nickname?.trim() ||
      "Gast";

    const confirmed = window.confirm(
      `Gastspieler "${playerName}" wirklich löschen?\n\nDer Gast wird aus dieser Session entfernt.`
    );

    if (!confirmed) return;

    const restoreScroll = preserveScrollPosition();

    try {
      setDeletingGuestPlayerId(playerId);
      setErr(null);
      setMsg(null);

      const formData = new FormData();
      formData.set("intent", "delete_guest_player");
      formData.set("player_id", String(playerId));

      const result = await postForm(formData);

      if ("deletedGuestPlayerId" in result) {
        const deletedId = result.deletedGuestPlayerId;

        setPlayers((prev) => prev.filter((entry) => entry.id !== deletedId));
        setPresentIds((prev) => prev.filter((id) => id !== deletedId));
        setDraftPresentIds((prev) => prev.filter((id) => id !== deletedId));
        setManualTeams((prev) => {
          const next = { ...prev };
          delete next[deletedId];
          return next;
        });

        setMsg(result.message);
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Gastspieler konnte nicht gelöscht werden."));
    } finally {
      setDeletingGuestPlayerId(null);
      restoreScroll();
    }
  }

  async function handleDeleteSession() {
    if (!isAdmin) {
      setErr("Nur Admins dürfen eine Session löschen.");
      return;
    }

    if (deletingSession || saving || savingPresence || photoBusy) {
      return;
    }

    const okConfirm = window.confirm(
      "Session wirklich komplett löschen?\n\nDabei werden Anwesenheit, Teams, Ergebnis und Siegerfoto endgültig entfernt."
    );

    if (!okConfirm) return;

    const restoreScroll = preserveScrollPosition();

    try {
      setDeletingSession(true);
      setErr(null);
      setMsg(null);

      const formData = new FormData();
      formData.set("intent", "delete_session");

      const result = await postForm(formData);

      if ("deleted" in result && result.deleted) {
        router.push("/sessions?deleted=1");
        router.refresh();
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Session konnte nicht gelöscht werden."));
    } finally {
      setDeletingSession(false);
      restoreScroll();
    }
  }

  async function togglePresence(id: number) {
    if (hasResult) {
      setErr(
        "Anwesenheit ist gesperrt, weil bereits ein Ergebnis gespeichert ist. Lösche das Ergebnis, um wieder zu entsperren."
      );
      return;
    }

    if (deletingSession || deletingGuestPlayerId) {
      return;
    }

    setErr(null);
    setMsg(null);

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

      const nextManualTeams = { ...manualTeams };

      if (isCurrentlyPresent) {
        delete nextManualTeams[id];
      } else {
        nextManualTeams[id] = nextManualTeams[id] ?? null;
      }

      setPresentIds(nextPresentIds);
      setDraftPresentIds(nextPresentIds);
      setManualTeams(nextManualTeams);

      if (allowTeams) {
        await persistTeamsNow(nextManualTeams);
      }

      setMsg(isCurrentlyPresent ? "Anwesenheit entfernt." : "Anwesenheit gespeichert.");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Anwesenheit konnte nicht gespeichert werden."));
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
      setErr(null);
      setMsg(null);

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

      const nextManualTeams = { ...manualTeams };

      Object.keys(nextManualTeams).forEach((key) => {
        const numericId = Number(key);
        if (!draftPresentIds.includes(numericId)) {
          delete nextManualTeams[numericId];
        }
      });

      draftPresentIds.forEach((id) => {
        nextManualTeams[id] = nextManualTeams[id] ?? null;
      });

      setPresentIds(draftPresentIds);
      setManualTeams(nextManualTeams);

      if (allowTeams) {
        await persistTeamsNow(nextManualTeams);
      }

      setAttendanceCollapsed(true);
      setMsg("Anwesenheit gespeichert.");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Anwesenheit konnte nicht gespeichert werden."));
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
          "Gastspieler können aktuell nur von Admins angelegt werden."
        );
      }

      if (hasResult) {
        throw new Error(
          "Gastspieler können nicht mehr hinzugefügt werden, wenn bereits ein Ergebnis gespeichert ist."
        );
      }

      if (!clubId) {
        throw new Error("Kein Club gefunden.");
      }

      setGuestSaving(true);
      setErr(null);
      setMsg(null);

      const cleanName = guestName.trim();
      if (!cleanName) {
        throw new Error("Bitte einen Namen für den Gastspieler eingeben.");
      }

      const formData = new FormData();
      formData.set("intent", "add_guest_player");
      formData.set("guest_name", cleanName);
      formData.set("guest_position", guestPosition ?? "");
      formData.set("guest_age_group", guestAgeGroup ?? "");

      const result = await postForm(formData);

      if ("player" in result) {
        const nextPlayer = result.player;

        setPlayers((prev) => sortPlayersByFirstName([...prev, nextPlayer]));

        setPresentIds((prev) =>
          prev.includes(nextPlayer.id) ? prev : [...prev, nextPlayer.id]
        );
        setDraftPresentIds((prev) =>
          prev.includes(nextPlayer.id) ? prev : [...prev, nextPlayer.id]
        );

        setManualTeams((prev) => ({
          ...prev,
          [nextPlayer.id]: prev[nextPlayer.id] ?? null,
        }));

        resetGuestForm();
        setMsg(result.message);
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Gastspieler konnte nicht angelegt werden."));
    } finally {
      setGuestSaving(false);
      restoreScroll();
    }
  }

  async function generateTeams() {
    if (!allowTeams) {
      setErr("Für diesen Termin gibt es keine Teamaufteilung.");
      return;
    }

    if (hasResult) {
      setErr(
        "Teams sind gesperrt, weil bereits ein Ergebnis gespeichert ist. Lösche das Ergebnis, um Teams zu ändern."
      );
      return;
    }

    if (attendanceDirty) {
      setErr("Bitte zuerst die Anwesenheit speichern.");
      return;
    }

    const restoreScroll = preserveScrollPosition();

    setErr(null);
    setMsg(null);

    const present = presentPlayers;
    if (present.length < 2) {
      setErr("Mindestens 2 Spieler nötig.");
      restoreScroll();
      return;
    }

    const targetA = Math.ceil(present.length / 2);
    const targetB = Math.floor(present.length / 2);

    const keepers = present.filter((p) => p.preferred_position === "goalkeeper");
    const field = present.filter((p) => p.preferred_position !== "goalkeeper");

    function evaluate(A: Player[], B: Player[]) {
      const useStrength = clubSettings?.use_strength ?? true;
      const useCategories = clubSettings?.use_categories ?? true;

      const shouldUseScore = useStrength || useCategories;

      const scoreDiff = shouldUseScore
        ? Math.abs(sumTeamScore(A) - sumTeamScore(B))
        : 0;

      const posPenalty = positionBalancePenalty(A, B);

      return scoreDiff * 10 + posPenalty * 3;
    }

    let bestA: Player[] = [];
    let bestB: Player[] = [];
    let bestScore = Infinity;

    for (let k = 0; k < 400; k += 1) {
      const A: Player[] = [];
      const B: Player[] = [];

      const shuffledKeepers = shuffle(keepers);

      for (const gk of shuffledKeepers) {
        if (
          A.length < targetA &&
          (A.length <= B.length || B.length >= targetB)
        ) {
          A.push(gk);
        } else if (B.length < targetB) {
          B.push(gk);
        } else if (A.length < targetA) {
          A.push(gk);
        }
      }

      const shuffledField = shuffle(field);

      for (const p of shuffledField) {
        if (A.length >= targetA) {
          if (B.length < targetB) B.push(p);
          continue;
        }

        if (B.length >= targetB) {
          if (A.length < targetA) A.push(p);
          continue;
        }

        const scoreIfA = evaluate([...A, p], B);
        const scoreIfB = evaluate(A, [...B, p]);

        if (scoreIfA < scoreIfB) {
          A.push(p);
        } else if (scoreIfB < scoreIfA) {
          B.push(p);
        } else {
          (A.length <= B.length ? A : B).push(p);
        }
      }

      if (!(A.length === targetA && B.length === targetB)) continue;

      const score = evaluate(A, B);

      if (score < bestScore) {
        bestScore = score;
        bestA = A;
        bestB = B;
      }
    }

    if (bestA.length === 0 && bestB.length === 0) {
      setErr("Konnte keine gültige Aufteilung finden (unerwartet).");
      restoreScroll();
      return;
    }

    const next: TeamMap = {};
    present.forEach((player) => {
      next[player.id] = null;
    });

    for (const player of bestA) next[player.id] = "A";
    for (const player of bestB) next[player.id] = "B";

    setManualTeams(next);
    await persistTeamsNow(next);

    const useStrength = clubSettings?.use_strength ?? true;
    const useCategories = clubSettings?.use_categories ?? true;

    if (useStrength && useCategories) {
      setMsg(
        "Teams automatisch verteilt. Kategorie, Stärke und Positionsverteilung wurden berücksichtigt."
      );
    } else if (useStrength && !useCategories) {
      setMsg(
        "Teams automatisch verteilt. Stärke und Positionsverteilung wurden berücksichtigt."
      );
    } else if (!useStrength && useCategories) {
      setMsg(
        "Teams automatisch verteilt. Kategorien und Positionsverteilung wurden berücksichtigt."
      );
    } else {
      setMsg(
        "Teams automatisch verteilt. Positionsverteilung wurde berücksichtigt."
      );
    }

    setTeamsCollapsed(false);
    restoreScroll();
  }

  function setSide(playerId: number, side: TeamSide | null) {
    if (!allowTeams) {
      setErr("Für diesen Termin gibt es keine Teamaufteilung.");
      return;
    }

    if (hasResult) {
      setErr(
        "Teams sind gesperrt, weil bereits ein Ergebnis gespeichert ist. Lösche das Ergebnis, um Teams zu ändern."
      );
      return;
    }

    if (attendanceDirty) {
      setErr("Bitte zuerst die Anwesenheit speichern.");
      return;
    }

    setErr(null);

    setManualTeams((prev) => {
      const next = { ...prev, [playerId]: side };
      scheduleTeamsSave(next);
      return next;
    });
  }

  async function saveResult() {
    if (!allowResult) {
      setErr("Für diesen Termin gibt es kein Ergebnis.");
      return;
    }

    if (saving || deletingSession || deletingGuestPlayerId) return;

    const cleanA = normalizeGoalValue(goalsA);
    const cleanB = normalizeGoalValue(goalsB);

    if (attendanceDirty) {
      setErr("Bitte zuerst die Anwesenheit speichern.");
      return;
    }

    if (!teamsComplete) {
      setErr(
        "Bitte weise zuerst alle anwesenden Spieler einem Team zu. Beide Teams müssen mindestens einen Spieler haben."
      );
      return;
    }

    if (cleanA === "" || cleanB === "") {
      setErr("Bitte trage zuerst ein vollständiges Ergebnis ein.");
      return;
    }

    const okConfirm = window.confirm(
      "Ergebnis speichern? Danach sind Aufstellungen & Anwesenheit gesperrt."
    );
    if (!okConfirm) return;

    const restoreScroll = preserveScrollPosition();

    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const formData = new FormData();
      formData.set("intent", "save_result");
      formData.set("goals_a", cleanA);
      formData.set("goals_b", cleanB);
      formData.set("manual_teams", JSON.stringify(manualTeams));

      const result = await postForm(formData);

      if ("hasResult" in result) {
        setHasResult(result.hasResult);
        setGoalsA(result.goalsA);
        setGoalsB(result.goalsB);
        setAttendanceCollapsed(true);
        setTeamsCollapsed(true);
        setMsg(result.message);
        setPreparedResultShareFile(null);
        setResultShareMessage(null);

        if (result.hasResult) {
          setShowSessionEndModal(true);
        }
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Fehler beim Speichern."));
    } finally {
      setSaving(false);
      restoreScroll();
    }
  }

  async function deleteResult() {
    if (!allowResult) {
      setErr("Für diesen Termin gibt es kein Ergebnis.");
      return;
    }

    if (saving || deletingSession || deletingGuestPlayerId) return;

    const okConfirm = window.confirm(
      "Ergebnis wirklich löschen?\nDanach sind Aufstellungen & Anwesenheit wieder bearbeitbar."
    );
    if (!okConfirm) return;

    const restoreScroll = preserveScrollPosition();

    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const formData = new FormData();
      formData.set("intent", "delete_result");

      const result = await postForm(formData);

      if ("hasResult" in result) {
        setHasResult(result.hasResult);
        setGoalsA(result.goalsA);
        setGoalsB(result.goalsB);
        setAttendanceCollapsed(false);
        setTeamsCollapsed(false);
        setShowSessionEndModal(false);
        setPreparedResultShareFile(null);
        setResultShareMessage(null);
        setMsg(result.message);
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Fehler beim Löschen des Ergebnisses."));
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
      setErr("Für diesen Termin gibt es kein Siegerfoto.");
      return;
    }

    if (!session) {
      setErr("Training konnte nicht geladen werden.");
      return;
    }

    if (!teamsComplete) {
      setErr(
        "Bitte zuerst die Teams vollständig zuweisen, bevor du ein Siegerfoto hochlädst."
      );
      return;
    }

    if (photoBusy || saving || deletingSession || deletingGuestPlayerId) return;

    const restoreScroll = preserveScrollPosition();

    try {
      setPhotoBusy(true);
      setErr(null);
      setMsg(null);

      const orientation = await detectImageOrientation(file);

      const formData = new FormData();
      formData.set("intent", "upload_winner_photo");
      formData.set("file", file);

      const result = await postForm(formData);

      if ("winner_photo_path" in result) {
        const nextSession: SessionRow = {
          ...session,
          winner_photo_path: result.winner_photo_path,
        };

        setSession(nextSession);
        setWinnerPhotoUrl(result.winnerPhotoUrl);
        setPreparedResultShareFile(null);
        setResultShareMessage(null);

        const orientationHint =
          orientation === "landscape" || orientation === "square"
            ? " Tipp: Für die Share Card funktioniert ein Hochformat-Foto meistens deutlich besser."
            : "";

        setMsg(`${result.message}${orientationHint}`);
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Siegerfoto konnte nicht hochgeladen werden."));
    } finally {
      setPhotoBusy(false);
      restoreScroll();
    }
  }

  async function handleWinnerPhotoDelete() {
    if (!allowWinnerPhoto) {
      setErr("Für diesen Termin gibt es kein Siegerfoto.");
      return;
    }

    if (!session?.winner_photo_path) {
      setErr("Kein Siegerfoto vorhanden.");
      return;
    }

    if (photoBusy || saving || deletingSession || deletingGuestPlayerId) return;

    const okConfirm = window.confirm("Siegerfoto wirklich löschen?");
    if (!okConfirm) return;

    const restoreScroll = preserveScrollPosition();

    try {
      setPhotoBusy(true);
      setErr(null);
      setMsg(null);

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
        setPreparedResultShareFile(null);
        setResultShareMessage(null);
        setMsg(result.message);
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Siegerfoto konnte nicht gelöscht werden."));
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
    hasResult,

    showSessionEndModal,
    setShowSessionEndModal,

    showGuestForm,
    guestName,
    setGuestName,
    guestPosition,
    setGuestPosition,
    guestAgeGroup,
    setGuestAgeGroup,
    guestSaving,
    deletingGuestPlayerId,

    attendanceCollapsed,
    setAttendanceCollapsed,
    teamsCollapsed,
    setTeamsCollapsed,

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
    deleteResult,
    handleWinnerPhotoUpload,
    handleWinnerPhotoDelete,
  };
}