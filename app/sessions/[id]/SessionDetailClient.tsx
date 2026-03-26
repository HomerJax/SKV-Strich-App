"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Player, SessionRow, TeamMap, TeamSide } from "./session-types";
import {
  buildLineupShareText,
  buildResultShareText,
  getErrorMessage,
  normalizeGoalValue,
  shuffle,
  sortForTeamView,
  sumAge,
  sumPos,
  sumStrength,
} from "./session-ui";
import { getPlayerDisplayName } from "@/lib/player-display";
import SessionHeaderCard from "./SessionHeaderCard";
import SessionAttendanceCard from "./SessionAttendanceCard";
import SessionTeamsCard from "./SessionTeamsCard";

type ClubSettings = {
  use_strength: boolean;
  strength_default: number;
  use_categories: boolean;
  category_label: string | null;
  position_label: string | null;
  attack_label: string | null;
  defense_label: string | null;
  goalkeeper_label: string | null;
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
};

type ApiSuccess =
  | { ok: true; mode: "added" | "removed"; playerId: number }
  | { ok: true; message: string; player: Player }
  | {
      ok: true;
      message: string;
      hasResult: boolean;
      goalsA: string;
      goalsB: string;
    }
  | {
      ok: true;
      message: string;
      winner_photo_path: string | null;
      winnerPhotoUrl: string | null;
    };

type ApiError = {
  error: string;
};

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-950 sm:text-lg">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
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
}: SessionDetailClientProps) {
  const router = useRouter();

  const winnerPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const [session, setSession] = useState<SessionRow | null>(initialSession);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [presentIds, setPresentIds] = useState<number[]>(initialPresentIds);
  const [manualTeams, setManualTeams] = useState<TeamMap>(initialManualTeams);
  const [clubId] = useState<string | null>(initialClubId);
  const [isAdmin] = useState(initialIsAdmin);
  const [clubSettings] = useState<ClubSettings | null>(initialClubSettings);

  const [winnerPhotoUrl, setWinnerPhotoUrl] = useState<string | null>(
    initialWinnerPhotoUrl
  );

  const [goalsA, setGoalsA] = useState(initialGoalsA);
  const [goalsB, setGoalsB] = useState(initialGoalsB);
  const [hasResult, setHasResult] = useState(initialHasResult);

  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPosition, setGuestPosition] = useState<
    Player["preferred_position"] | ""
  >("");
  const [guestAgeGroup, setGuestAgeGroup] = useState<Player["age_group"] | "">(
    ""
  );
  const [guestSaving, setGuestSaving] = useState(false);

  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sharingLineup, setSharingLineup] = useState(false);
  const [sharingResult, setSharingResult] = useState(false);
  const [pendingPresenceIds, setPendingPresenceIds] = useState<number[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [attendanceCollapsed, setAttendanceCollapsed] = useState(
    initialPresentIds.length >= 2
  );
  const [resultExpanded, setResultExpanded] = useState(
    !initialHasResult && initialPresentIds.length >= 2
  );
  const [photoExpanded, setPhotoExpanded] = useState(
    initialHasResult || Boolean(initialWinnerPhotoUrl)
  );

  async function postForm(formData: FormData): Promise<ApiSuccess> {
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });

    const payload = (await response.json()) as ApiSuccess | ApiError;

    if (!response.ok || "error" in payload) {
      throw new Error("error" in payload ? payload.error : "Unbekannter Fehler.");
    }

    return payload;
  }

  const presentPlayers = useMemo(
    () => players.filter((player) => presentIds.includes(player.id)),
    [players, presentIds]
  );

  const teamA = useMemo(
    () =>
      presentPlayers
        .filter((player) => manualTeams[player.id] === "A")
        .slice()
        .sort(sortForTeamView),
    [presentPlayers, manualTeams]
  );

  const teamB = useMemo(
    () =>
      presentPlayers
        .filter((player) => manualTeams[player.id] === "B")
        .slice()
        .sort(sortForTeamView),
    [presentPlayers, manualTeams]
  );

  const unassigned = useMemo(
    () =>
      presentPlayers
        .filter((player) => !manualTeams[player.id])
        .slice()
        .sort(sortForTeamView),
    [presentPlayers, manualTeams]
  );

  const canShareLineup = teamA.length > 0 && teamB.length > 0;
  const canShareResult =
    teamA.length > 0 &&
    teamB.length > 0 &&
    goalsA.trim() !== "" &&
    goalsB.trim() !== "";

  const canUploadWinnerPhoto = hasResult && !saving;
  const teamsComplete =
    teamA.length > 0 && teamB.length > 0 && unassigned.length === 0;

  const nextStepLabel = hasResult
    ? "Ergebnis ist gespeichert"
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

      const text = buildLineupShareText(session, teamA, teamB);
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

      const text = buildResultShareText(session, goalsA, goalsB, teamA, teamB);
      const result = await shareText(text, "Ergebnis teilen");

      setMsg(
        result === "copied"
          ? "Ergebnis-Text in die Zwischenablage kopiert."
          : "Ergebnis erfolgreich geteilt."
      );
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Ergebnis konnte nicht geteilt werden."));
    } finally {
      setSharingResult(false);
    }
  }

  async function togglePresence(id: number) {
    if (hasResult) {
      setErr(
        "Anwesenheit ist gesperrt, weil bereits ein Ergebnis gespeichert ist. Lösche das Ergebnis, um wieder zu entsperren."
      );
      return;
    }

    if (pendingPresenceIds.includes(id)) {
      return;
    }

    try {
      setPendingPresenceIds((prev) => [...prev, id]);
      setErr(null);
      setMsg(null);

      const formData = new FormData();
      formData.set("intent", "toggle_presence");
      formData.set("player_id", String(id));

      const result = await postForm(formData);

      if ("mode" in result) {
        if (result.mode === "removed") {
          setPresentIds((prev) => prev.filter((playerId) => playerId !== id));
          setManualTeams((prev) => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
          });
        } else {
          setPresentIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
          setManualTeams((prev) => ({ ...prev, [id]: prev[id] ?? null }));
          setAttendanceCollapsed(true);
        }
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Spieler konnte nicht geändert werden."));
    } finally {
      setPendingPresenceIds((prev) => prev.filter((playerId) => playerId !== id));
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

      const cleanName = guestName.trim();
      if (!cleanName) {
        throw new Error("Bitte einen Namen für den Gastspieler eingeben.");
      }

      setGuestSaving(true);
      setErr(null);
      setMsg(null);

      const formData = new FormData();
      formData.set("intent", "add_guest_player");
      formData.set("guest_name", cleanName);
      formData.set("guest_position", guestPosition ?? "");
      formData.set("guest_age_group", guestAgeGroup ?? "");

      const result = await postForm(formData);

      if ("player" in result) {
        const nextPlayer = result.player;

        setPlayers((prev) =>
          [...prev, nextPlayer].slice().sort((a, b) => {
            return getPlayerDisplayName(a).localeCompare(
              getPlayerDisplayName(b),
              "de"
            );
          })
        );
        setPresentIds((prev) =>
          prev.includes(nextPlayer.id) ? prev : [...prev, nextPlayer.id]
        );
        setManualTeams((prev) => ({
          ...prev,
          [nextPlayer.id]: prev[nextPlayer.id] ?? null,
        }));
        setAttendanceCollapsed(true);
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

      const sDiff = useStrength ? Math.abs(sumStrength(A) - sumStrength(B)) : 0;
      const aDiff = useCategories ? Math.abs(sumAge(A) - sumAge(B)) : 0;
      const pDiff = Math.abs(sumPos(A) - sumPos(B));

      return sDiff * 6 + aDiff * 3 + pDiff * 2;
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

        if (scoreIfA < scoreIfB) A.push(p);
        else if (scoreIfB < scoreIfA) B.push(p);
        else (A.length <= B.length ? A : B).push(p);
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
    setResultExpanded(true);

    const useStrength = clubSettings?.use_strength ?? true;
    const useCategories = clubSettings?.use_categories ?? true;

    if (useStrength && useCategories) {
      setMsg(
        "Teams automatisch verteilt. Stärke und Kategorien wurden berücksichtigt."
      );
      return;
    }

    if (useStrength && !useCategories) {
      setMsg(
        "Teams automatisch verteilt. Stärke wurde berücksichtigt, Kategorien nicht."
      );
      return;
    }

    if (!useStrength && useCategories) {
      setMsg(
        "Teams automatisch verteilt. Kategorien wurden berücksichtigt, Stärke nicht."
      );
      return;
    }

    setMsg(
      "Teams automatisch verteilt. Stärke und Kategorien wurden nicht berücksichtigt."
    );
  }

  function setSide(playerId: number, side: TeamSide | null) {
    if (hasResult) {
      setErr(
        "Teams sind gesperrt, weil bereits ein Ergebnis gespeichert ist. Lösche das Ergebnis, um Teams zu ändern."
      );
      return;
    }

    setErr(null);
    setManualTeams((prev) => ({ ...prev, [playerId]: side }));
  }

  async function saveResult() {
    if (saving) return;

    const cleanA = normalizeGoalValue(goalsA);
    const cleanB = normalizeGoalValue(goalsB);

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
        setPhotoExpanded(true);
        setMsg(result.message);
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Fehler beim Speichern."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteResult() {
    if (saving) return;

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

    if (!hasResult) {
      setErr(
        "Ein Siegerfoto kann erst nach gespeichertem Ergebnis hochgeladen werden."
      );
      return;
    }

    if (photoBusy || saving) return;

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

    if (photoBusy || saving) return;

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
    <div className="space-y-4">
      <button
        onClick={() => router.push("/sessions")}
        className="text-xs text-slate-500 hover:text-slate-700"
      >
        ← Zurück zu Trainings
      </button>

      <SessionHeaderCard
        date={session.date}
        notes={session.notes ?? null}
        presentCount={presentPlayers.length}
        teamACount={teamA.length}
        teamBCount={teamB.length}
        hasResult={hasResult}
        nextStepLabel={nextStepLabel}
      />

      {!hasResult ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
          Empfohlene Reihenfolge: Anwesenheit festlegen → Teams aufteilen →
          Ergebnis speichern.
        </div>
      ) : null}

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {err}
        </div>
      ) : null}

      {msg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          {msg}
        </div>
      ) : null}

      <SectionCard
        title="Anwesenheit"
        subtitle="Wähle die Spieler aus, die heute beim Training dabei sind."
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {presentPlayers.length} Spieler aktuell anwesend
          </div>

          {presentPlayers.length >= 2 ? (
            <button
              type="button"
              onClick={() => setAttendanceCollapsed((prev) => !prev)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {attendanceCollapsed ? "Spieler anzeigen" : "Spieler einklappen"}
            </button>
          ) : null}
        </div>

        {!attendanceCollapsed ? (
          <SessionAttendanceCard
            players={players}
            presentIds={presentIds}
            pendingPresenceIds={pendingPresenceIds}
            hasResult={hasResult}
            isAdmin={isAdmin}
            showGuestForm={showGuestForm}
            guestName={guestName}
            guestPosition={guestPosition}
            guestAgeGroup={guestAgeGroup}
            guestSaving={guestSaving}
            clubSettings={clubSettings}
            onToggleShowGuestForm={toggleGuestForm}
            onGuestNameChange={setGuestName}
            onGuestPositionChange={setGuestPosition}
            onGuestAgeGroupChange={setGuestAgeGroup}
            onAddGuestPlayer={addGuestPlayer}
            onTogglePresence={togglePresence}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            Anwesenheitsliste ist eingeklappt. Du kannst sie jederzeit wieder
            öffnen, um Spieler hinzuzufügen oder abzuwählen.
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Teams"
        subtitle="Verteile die anwesenden Spieler auf Team A und Team B."
      >
        <SessionTeamsCard
          teamA={teamA}
          teamB={teamB}
          unassigned={unassigned}
          metaA={metaA}
          metaB={metaB}
          hasResult={hasResult}
          saving={saving}
          teamsComplete={teamsComplete}
          canShareLineup={false}
          sharingLineup={false}
          onGenerateTeams={generateTeams}
          onShareLineup={() => {}}
          onSetSide={setSide}
        />

        <div className="mt-4 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={handleShareLineup}
            disabled={!canShareLineup || sharingLineup}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sharingLineup ? "Teilt..." : "Aufstellung teilen"}
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Ergebnis"
        subtitle="Trage das Endergebnis ein und speichere es separat."
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {hasResult
              ? "Ergebnis ist gespeichert."
              : "Noch kein Ergebnis gespeichert."}
          </div>

          <button
            type="button"
            onClick={() => setResultExpanded((prev) => !prev)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {resultExpanded ? "Einklappen" : "Öffnen"}
          </button>
        </div>

        {resultExpanded ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Team A
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={goalsA}
                  onChange={(event) =>
                    setGoalsA(normalizeGoalValue(event.target.value))
                  }
                  disabled={saving}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-center text-lg font-bold text-slate-950 outline-none transition focus:border-slate-500 disabled:bg-slate-100"
                />
              </div>

              <div className="pb-3 text-center text-sm font-semibold text-slate-400">
                :
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Team B
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={goalsB}
                  onChange={(event) =>
                    setGoalsB(normalizeGoalValue(event.target.value))
                  }
                  disabled={saving}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-center text-lg font-bold text-slate-950 outline-none transition focus:border-slate-500 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {!hasResult ? (
                <button
                  type="button"
                  onClick={saveResult}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Speichert..." : "Ergebnis speichern"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={deleteResult}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Löscht..." : "Ergebnis löschen"}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Siegerfoto"
        subtitle="Lade das Siegerfoto getrennt vom Ergebnis hoch."
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {winnerPhotoUrl ? "Siegerfoto vorhanden." : "Noch kein Siegerfoto."}
          </div>

          <button
            type="button"
            onClick={() => setPhotoExpanded((prev) => !prev)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {photoExpanded ? "Einklappen" : "Öffnen"}
          </button>
        </div>

        {photoExpanded ? (
          <div className="mt-4 space-y-4">
            {winnerPhotoUrl ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <img
                  src={winnerPhotoUrl}
                  alt="Siegerfoto"
                  className="max-h-[320px] w-full object-cover"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Noch kein Siegerfoto hochgeladen.
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <input
                ref={winnerPhotoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleWinnerPhotoUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => winnerPhotoInputRef.current?.click()}
                disabled={!canUploadWinnerPhoto || photoBusy}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {photoBusy ? "Lädt..." : "Siegerfoto hochladen"}
              </button>

              {session.winner_photo_path ? (
                <button
                  type="button"
                  onClick={handleWinnerPhotoDelete}
                  disabled={photoBusy}
                  className="inline-flex items-center justify-center rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {photoBusy ? "Löscht..." : "Siegerfoto löschen"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Teilen"
        subtitle="Ergebnis und Siegerfoto kannst du separat verschicken."
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={handleShareResult}
            disabled={!canShareResult || sharingResult}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sharingResult ? "Teilt..." : "Ergebnis teilen"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}