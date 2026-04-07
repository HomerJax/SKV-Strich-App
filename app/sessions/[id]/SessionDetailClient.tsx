"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Player, SessionRow, TeamMap, TeamSide } from "./session-types";
import {
  buildLineupShareText,
  getErrorMessage,
  normalizeGoalValue,
  positionBalancePenalty,
  shuffle,
  sumTeamScore,
} from "./session-ui";
import { getPlayerDisplayName } from "@/lib/player-display";
import { shareImageFromUrl } from "@/lib/share/utils";
import SessionHeaderCard from "./SessionHeaderCard";
import SessionAttendanceCard from "./SessionAttendanceCard";
import SessionTeamsCard from "./SessionTeamsCard";
import SessionResultCard from "./SessionResultCard";
import SessionMvpCard from "./SessionMvpCard";
import SessionEndModal from "@/components/SessionEndModal";

type ClubSettings = {
  use_strength: boolean;
  strength_default: number;
  use_categories: boolean;
  category_label: string | null;
  position_label: string | null;
  attack_label: string | null;
  defense_label: string | null;
  goalkeeper_label: string | null;
  use_nicknames?: boolean;
  use_field_view?: boolean;
};

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
};

type ApiSuccess =
  | { ok: true; mode: "added" | "removed"; playerId: number }
  | { ok: true; message: string; player: Player }
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
    };

type ApiError = {
  error: string;
};

function sameIdSet(a: number[], b: number[]) {
  if (a.length !== b.length) return false;

  const aSorted = [...a].sort((x, y) => x - y);
  const bSorted = [...b].sort((x, y) => x - y);

  return aSorted.every((value, index) => value === bSorted[index]);
}

function getResultHighlight(scoreA: number, scoreB: number) {
  const diff = Math.abs(scoreA - scoreB);

  if (scoreA === scoreB) return "🤝 Alles offen";
  if (diff >= 3) return "💪 Dominanter Sieg";
  if (diff === 1) return "😮 Knappe Kiste";
  return "⚡ Klar entschieden";
}

function getResultStory(scoreA: number, scoreB: number) {
  const diff = Math.abs(scoreA - scoreB);

  if (scoreA === scoreB) return "Zwei Teams auf Augenhöhe.";
  if (diff >= 3) return "Klare Sache heute.";
  if (diff === 1) return "Bis zum Schluss spannend.";
  return "Verdient durchgesetzt.";
}

function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
}

function pickVariant(seed: string, options: string[]) {
  if (options.length === 0) return "";
  return options[hashString(seed) % options.length];
}

function getAutoTeamNames(
  sessionId: number,
  goalsA: number,
  goalsB: number,
  teamAPlayers: Player[],
  teamBPlayers: Player[],
  useNicknames: boolean
) {
  const seed = `${sessionId}-${goalsA}:${goalsB}-${teamAPlayers.length}-${teamBPlayers.length}`;
  const diff = Math.abs(goalsA - goalsB);
  const isDraw = goalsA === goalsB;

  const teamAFirst = teamAPlayers[0]
    ? getPlayerDisplayName(teamAPlayers[0], { useNicknames })
    : null;
  const teamBFirst = teamBPlayers[0]
    ? getPlayerDisplayName(teamBPlayers[0], { useNicknames })
    : null;

  const neutralA = [
    "Die Roten",
    "Die Flinken",
    "Die Kämpfer",
    "Die Wilden",
    "Die Maschinen",
    "Die Eisernen",
  ];

  const neutralB = [
    "Die Blauen",
    "Die Herausforderer",
    "Die Raketen",
    "Die Unbequemen",
    "Die Jäger",
    "Die Unermüdlichen",
  ];

  const stronger = [
    "Die Favoriten",
    "Die Dominanten",
    "Die Formstarken",
    "Die Titeljäger",
  ];

  const weaker = [
    "Die Underdogs",
    "Die Außenseiter",
    "Die Herausforderer",
    "Die Spätstarter",
  ];

  if (teamAFirst && teamBFirst && diff <= 1) {
    return {
      a: `Team ${teamAFirst}`,
      b: `Team ${teamBFirst}`,
    };
  }

  if (isDraw) {
    return {
      a: pickVariant(`${seed}-a`, neutralA),
      b: pickVariant(`${seed}-b`, neutralB),
    };
  }

  if (diff >= 3) {
    const winnerIsA = goalsA > goalsB;

    return winnerIsA
      ? {
          a: pickVariant(`${seed}-strong-a`, stronger),
          b: pickVariant(`${seed}-weak-b`, weaker),
        }
      : {
          a: pickVariant(`${seed}-weak-a`, weaker),
          b: pickVariant(`${seed}-strong-b`, stronger),
        };
  }

  return {
    a: pickVariant(`${seed}-neutral-a`, neutralA),
    b: pickVariant(`${seed}-neutral-b`, neutralB),
  };
}

function SectionDoneHint({
  label,
  detail,
}: {
  label: string;
  detail?: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white"
        >
          ✓
        </span>
        <div className="text-sm font-semibold text-emerald-900">{label}</div>
      </div>
      {detail ? (
        <div className="text-xs font-medium text-emerald-700">{detail}</div>
      ) : null}
    </div>
  );
}

function sortPlayersByFirstName(players: Player[]) {
  return [...players].sort((a, b) => {
    const firstA = (a.first_name || "").trim().toLocaleLowerCase("de");
    const firstB = (b.first_name || "").trim().toLocaleLowerCase("de");

    const firstCompare = firstA.localeCompare(firstB, "de");
    if (firstCompare !== 0) return firstCompare;

    const lastA = (a.last_name || "").trim().toLocaleLowerCase("de");
    const lastB = (b.last_name || "").trim().toLocaleLowerCase("de");

    const lastCompare = lastA.localeCompare(lastB, "de");
    if (lastCompare !== 0) return lastCompare;

    const nameA = (a.name || "").trim().toLocaleLowerCase("de");
    const nameB = (b.name || "").trim().toLocaleLowerCase("de");

    return nameA.localeCompare(nameB, "de");
  });
}

function withDisplayName(player: Player, useNicknames: boolean): Player {
  return {
    ...player,
    name: getPlayerDisplayName(player, { useNicknames }),
  };
}

function withDisplayNames(players: Player[], useNicknames: boolean): Player[] {
  return players.map((player) => withDisplayName(player, useNicknames));
}

export default function SessionDetailClient({
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
}: SessionDetailClientProps) {
  const router = useRouter();

  const resultRef = useRef<HTMLDivElement | null>(null);
  const teamsRef = useRef<HTMLDivElement | null>(null);
  const attendanceRef = useRef<HTMLDivElement | null>(null);
  const winnerPhotoInputRef = useRef<HTMLInputElement | null>(null);

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

  const [attendanceCollapsed, setAttendanceCollapsed] = useState(initialHasResult);
  const [teamsCollapsed, setTeamsCollapsed] = useState(initialHasResult);

  const [saving, setSaving] = useState(false);
  const [savingPresence, setSavingPresence] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sharingLineup, setSharingLineup] = useState(false);
  const [sharingResult, setSharingResult] = useState(false);
  const [sharingInternal, setSharingInternal] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  useEffect(() => {
    if (initialHasResult) {
      const id = window.setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);

      return () => window.clearTimeout(id);
    }
  }, [initialHasResult]);

  const attendanceDirty = useMemo(
    () => !sameIdSet(draftPresentIds, presentIds),
    [draftPresentIds, presentIds]
  );

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

  const canShareLineup = teamA.length > 0 && teamB.length > 0;
  const canShareResult =
    teamA.length > 0 &&
    teamB.length > 0 &&
    goalsA.trim() !== "" &&
    goalsB.trim() !== "";

  const teamsComplete =
    teamA.length > 0 && teamB.length > 0 && unassigned.length === 0;

const canUploadWinnerPhoto =
  teamsComplete && !photoBusy && !saving && !deletingSession;

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

  const attendanceDone =
    presentIds.length > 0 && !attendanceDirty && attendanceCollapsed;

  const teamsDone = teamsComplete && teamsCollapsed;

  const resultDone = hasResult;

  const showMvpSection = mvpVotingEnabled && hasResult;

  const nextStepLabel = hasResult
    ? "Ergebnis ist gespeichert"
    : attendanceDirty
      ? "Anwesenheit speichern"
      : presentPlayers.length < 2
        ? "Mehr Spieler auf anwesend setzen"
        : !teamsComplete
          ? "Teams fertig zuweisen"
          : "Ergebnis eintragen und speichern";

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

      const imageUrl = `${window.location.origin}/api/share/result/${sessionId}/image`;

      await shareImageFromUrl({
        imageUrl,
        fileName: `strikr-result-${sessionId}.png`,
      });

      setMsg("SiegerCard erfolgreich geteilt.");
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "SiegerCard konnte nicht geteilt werden."));
    } finally {
      setSharingResult(false);
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
    }
  }

  function togglePresence(id: number) {
    if (hasResult) {
      setErr(
        "Anwesenheit ist gesperrt, weil bereits ein Ergebnis gespeichert ist. Lösche das Ergebnis, um wieder zu entsperren."
      );
      return;
    }

    setErr(null);
    setMsg(null);

    setDraftPresentIds((prev) =>
      prev.includes(id) ? prev.filter((playerId) => playerId !== id) : [...prev, id]
    );
  }

  async function savePresence() {
    if (hasResult || savingPresence || !attendanceDirty || deletingSession) {
      return;
    }

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

      setPresentIds(draftPresentIds);

      setManualTeams((prev) => {
        const next = { ...prev };

        Object.keys(next).forEach((key) => {
          const numericId = Number(key);
          if (!draftPresentIds.includes(numericId)) {
            delete next[numericId];
          }
        });

        draftPresentIds.forEach((id) => {
          next[id] = next[id] ?? null;
        });

        return next;
      });

      setAttendanceCollapsed(true);
      setMsg("Anwesenheit gespeichert.");

      window.setTimeout(() => {
        teamsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Anwesenheit konnte nicht gespeichert werden."));
    } finally {
      setSavingPresence(false);
    }
  }

  async function addGuestPlayer() {
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
    }
  }

  function generateTeams() {
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
    setMsg(null);

    const present = presentPlayers;
    if (present.length < 2) {
      setErr("Mindestens 2 Spieler nötig.");
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
      return;
    }

    const next: TeamMap = {};
    present.forEach((player) => {
      next[player.id] = null;
    });

    for (const player of bestA) next[player.id] = "A";
    for (const player of bestB) next[player.id] = "B";

    setManualTeams(next);

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

    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }

  function setSide(playerId: number, side: TeamSide | null) {
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
    setManualTeams((prev) => ({ ...prev, [playerId]: side }));
  }

  async function saveResult() {
    if (saving || deletingSession) return;

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

        if (result.hasResult) {
          setShowSessionEndModal(true);
        }
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Fehler beim Speichern."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteResult() {
    if (saving || deletingSession) return;

    const okConfirm = window.confirm(
      "Ergebnis wirklich löschen?\nDanach sind Aufstellungen & Anwesenheit wieder bearbeitbar."
    );
    if (!okConfirm) return;

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
        setMsg(result.message);
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Fehler beim Löschen des Ergebnisses."));
    } finally {
      setSaving(false);
    }
  }

  async function handleWinnerPhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

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

    if (photoBusy || saving || deletingSession) return;

    try {
      setPhotoBusy(true);
      setErr(null);
      setMsg(null);

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
        setMsg(result.message);
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Siegerfoto konnte nicht hochgeladen werden."));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleWinnerPhotoDelete() {
    if (!session?.winner_photo_path) {
      setErr("Kein Siegerfoto vorhanden.");
      return;
    }

    if (photoBusy || saving || deletingSession) return;

    const okConfirm = window.confirm("Siegerfoto wirklich löschen?");
    if (!okConfirm) return;

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
        setMsg(result.message);
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Siegerfoto konnte nicht gelöscht werden."));
    } finally {
      setPhotoBusy(false);
    }
  }

  function teamMeta(team: Player[]) {
    const gk = team.filter((p) => p.preferred_position === "goalkeeper").length;
    const def = team.filter((p) => p.preferred_position === "defense").length;
    const att = team.filter((p) => p.preferred_position === "attack").length;
    const ah = team.filter((p) => p.age_group === "AH").length;
    const u32 = team.filter((p) => p.age_group === "Ü32").length;
    return { gk, def, att, ah, u32 };
  }

  const metaA = teamMeta(teamA);
  const metaB = teamMeta(teamB);

  if (err && !session) {
    return <div className="bg-red-50 p-4 text-sm text-red-700">{err}</div>;
  }

  if (!session) {
    return null;
  }

    return (
    <>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/sessions")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <span aria-hidden="true">←</span>
          <span>Zurück zu Trainings</span>
        </button>

        <SessionHeaderCard
          date={session.date}
          notes={session.notes ?? null}
          presentCount={presentPlayers.length}
          teamACount={teamA.length}
          teamBCount={teamB.length}
          hasResult={hasResult}
          nextStepLabel={nextStepLabel}
          isAdmin={isAdmin}
          deletingSession={deletingSession}
          primaryColorKey={primaryColorKey}
          onDeleteSession={handleDeleteSession}
          onScrollToTeams={() =>
            teamsRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          onScrollToResult={() =>
            resultRef.current?.scrollIntoView({ behavior: "smooth" })
          }
        />

        {!hasResult && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
            Empfohlene Reihenfolge: Anwesenheit festlegen → Anwesenheit speichern
            → Teams aufteilen → Siegerfoto hochladen → Ergebnis speichern.
          </div>
        )}

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {err}
          </div>
        )}

        {msg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            {msg}
          </div>
        )}

        {hasResult ? (
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-500">
                  Letztes Ergebnis
                </div>
                <div className="mt-1 text-base font-bold text-slate-950">
                  Ergebnis ansehen und teilen
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Öffne die Ergebnisansicht, um die SiegerCard nach außen zu
                  teilen oder das Ergebnis mit CTA zurück in eure Gruppe zu
                  posten.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSessionEndModal(true)}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                🔥 Ergebnis ansehen & teilen
              </button>
            </div>
          </div>
        ) : null}

        {showMvpSection ? <SessionMvpCard sessionId={sessionId} /> : null}

        <div ref={attendanceRef}>
          {attendanceDone ? (
            <SectionDoneHint
              label="Anwesenheit erledigt"
              detail={`${presentPlayers.length} anwesend`}
            />
          ) : null}

          <SessionAttendanceCard
            players={displayPlayers}
            presentIds={draftPresentIds}
            hasResult={hasResult}
            isAdmin={isAdmin}
            showGuestForm={showGuestForm}
            guestName={guestName}
            guestPosition={guestPosition}
            guestAgeGroup={guestAgeGroup}
            guestSaving={guestSaving}
            clubSettings={clubSettings}
            collapsed={attendanceCollapsed}
            savingPresence={savingPresence}
            dirty={attendanceDirty}
            onToggleCollapsed={() => setAttendanceCollapsed((prev) => !prev)}
            onToggleShowGuestForm={toggleGuestForm}
            onGuestNameChange={setGuestName}
            onGuestPositionChange={setGuestPosition}
            onGuestAgeGroupChange={setGuestAgeGroup}
            onAddGuestPlayer={addGuestPlayer}
            onTogglePresence={togglePresence}
            onSavePresence={savePresence}
          />
        </div>

        <div ref={teamsRef}>
          {teamsDone ? (
            <SectionDoneHint
              label="Teams erledigt"
              detail={`${teamA.length} vs ${teamB.length}`}
            />
          ) : null}

          <SessionTeamsCard
            teamA={displayTeamA}
            teamB={displayTeamB}
            unassigned={displayUnassigned}
            metaA={metaA}
            metaB={metaB}
            hasResult={hasResult}
            saving={saving}
            teamsComplete={teamsComplete}
            canShareLineup={canShareLineup}
            sharingLineup={sharingLineup}
            collapsed={teamsCollapsed}
            attendanceDirty={attendanceDirty}
            enableFieldView={useFieldView}
            onToggleCollapsed={() => setTeamsCollapsed((prev) => !prev)}
            onGenerateTeams={generateTeams}
            onShareLineup={handleShareLineup}
            onSetSide={setSide}
          />
        </div>

        {!hasResult ? (
          <div className="space-y-2">
            {winnerPhotoUrl ? (
              <SectionDoneHint
                label="Siegerfoto hinzugefügt"
                detail="Foto vorhanden"
              />
            ) : null}

            <SessionResultCard
              hasResult={false}
              saving={saving}
              photoBusy={photoBusy}
              goalsA={goalsA}
              goalsB={goalsB}
              canShareResult={false}
              canUploadWinnerPhoto={canUploadWinnerPhoto}
              winnerPhotoUrl={winnerPhotoUrl}
              hasWinnerPhoto={Boolean(session.winner_photo_path)}
              sharingResult={false}
              sharingInternal={false}
              winnerPhotoInputRef={winnerPhotoInputRef}
              onGoalsAChange={() => {}}
              onGoalsBChange={() => {}}
              onDeleteResult={() => {}}
              onWinnerPhotoUpload={handleWinnerPhotoUpload}
              onWinnerPhotoDelete={handleWinnerPhotoDelete}
              onSaveResult={() => {}}
              onShareResult={() => {}}
              onShareInternal={() => {}}
              title="Siegerfoto hochladen"
              description="Optional: Direkt nach dem Training ein Siegerfoto aufnehmen oder hochladen."
              showResultSection={false}
              showPhotoSection={true}
              showShareSection={false}
            />
          </div>
        ) : (
          <SectionDoneHint
            label="Siegerfoto erledigt"
            detail={session.winner_photo_path ? "Foto vorhanden" : "Ohne Foto"}
          />
        )}

        <div ref={resultRef}>
          {hasResult ? (
            <SectionDoneHint
              label="Ergebnis erledigt"
              detail={`${scoreAValue}:${scoreBValue}`}
            />
          ) : (
            <SessionResultCard
              hasResult={hasResult}
              saving={saving}
              photoBusy={photoBusy}
              goalsA={goalsA}
              goalsB={goalsB}
              canShareResult={canShareResult}
              canUploadWinnerPhoto={false}
              winnerPhotoUrl={winnerPhotoUrl}
              hasWinnerPhoto={Boolean(session.winner_photo_path)}
              sharingResult={sharingResult}
              sharingInternal={sharingInternal}
              winnerPhotoInputRef={winnerPhotoInputRef}
              onGoalsAChange={(value) => setGoalsA(normalizeGoalValue(value))}
              onGoalsBChange={(value) => setGoalsB(normalizeGoalValue(value))}
              onDeleteResult={deleteResult}
              onWinnerPhotoUpload={handleWinnerPhotoUpload}
              onWinnerPhotoDelete={handleWinnerPhotoDelete}
              onSaveResult={saveResult}
              onShareResult={handleShareResult}
              onShareInternal={handleShareInternalResult}
              title="Ergebnis eintragen"
              description="Trage das Endergebnis ein und speichere es."
              showResultSection={true}
              showPhotoSection={false}
              showShareSection={false}
            />
          )}
        </div>
      </div>

      <SessionEndModal
        open={showSessionEndModal}
        onClose={() => setShowSessionEndModal(false)}
        teamA={{
          name: autoTeamNames.a,
          players: teamA.map((player) =>
            getPlayerDisplayName(player, { useNicknames })
          ),
        }}
        teamB={{
          name: autoTeamNames.b,
          players: teamB.map((player) =>
            getPlayerDisplayName(player, { useNicknames })
          ),
        }}
        scoreA={scoreAValue}
        scoreB={scoreBValue}
        wasUnderdog={false}
        onShareInternal={handleShareInternalResult}
        onShareSocial={handleShareResult}
        sharingInternal={sharingInternal}
        sharingSocial={sharingResult}
      />
    </>
  );
}