"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import TournamentWinnerCard from "./TournamentWinnerCard";
import SessionHeaderCard from "./SessionHeaderCard";
import SessionAttendanceCard from "./SessionAttendanceCard";
import SessionAdminRsvpCard from "./SessionAdminRsvpCard";
import SessionTeamsCard from "./SessionTeamsCard";
import SessionWinnerPhotoCard from "./SessionWinnerPhotoCard";
import SessionScoreCard from "./SessionScoreCard";
import SessionMvpCard from "./SessionMvpCard";
import SessionGameTimerLoader from "./SessionGameTimerLoader";
import SessionTournamentCard from "./SessionTournamentCard";
import TrainingSessionWizard from "./TrainingSessionWizard";
import TrainingAttendanceStep from "./TrainingAttendanceStep";
import TrainingClosingCheck from "./TrainingClosingCheck";
import SessionEndModal from "@/components/SessionEndModal";
import { updateSessionTypeAction } from "./session-type-actions";
import type { Player, SessionGameResult, SessionRow, TeamMap } from "./session-types";
import type { ClubSettings } from "./session-detail-helpers";
import { normalizeGoalValue } from "./session-ui";
import { getSessionDeadlineEpochMs } from "@/lib/session-rsvp-deadline";
import type { BalanceCategory } from "./session-ui";
import { useSessionDetail } from "./useSessionDetail";
import { useI18n } from "@/components/i18n/I18nProvider";

type SessionDetailClientProps = {
  sessionId: number;
  initialSession: SessionRow;
  initialPlayers: Player[];
  initialPresentIds: number[];
  initialManualTeams: TeamMap;
  initialClubId: string;
  initialIsAdmin: boolean;
  initialIsClubAdmin?: boolean;
  initialCurrentPlayerId: number | null;
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
  initialSessionType?: "training" | "event";
  sessionTypesEnabled?: boolean;
  initialRsvpDeadlineMinutesBefore?: number;
  initialIsPro?: boolean;
};

// Limited pilot: only SKV Rutesheim Ü32 & AH sees the animated team-balance reveal.
// This id was verified against public.clubs in the connected production Supabase project.
const TEAM_BALANCE_REVEAL_PILOT_CLUB_ID = "108590d9-0877-4787-90a5-4679615b3b76";

type SectionKey = "attendance" | "teams" | "photo" | "result" | "mvp";
type TrainingWizardStepKey = "settings" | "attendance" | "mode" | "teams" | "timer" | "live" | "finish" | "recheck" | "photo" | "result" | "winner" | "check";

function NoticeCard({
  tone,
  children,
}: {
  tone: "default" | "success" | "error";
  children: React.ReactNode;
}) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-white text-slate-600";

  return (
    <div className={`rounded-xl border p-3 text-xs ${className}`}>{children}</div>
  );
}

function WorkspaceIntro({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {step}
      </div>
      <h2 className="text-lg font-extrabold tracking-tight text-slate-950">
        {title}
      </h2>
      {description ? (
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
    </div>
  );
}

export default function SessionDetailClient(props: SessionDetailClientProps) {
  const { t } = useI18n();
  const [pilotView, setPilotView] = useState<"admin" | "leader" | "player">("admin");
  const [pilotFinished, setPilotFinished] = useState(false);
  const [pilotPhotoSkipped, setPilotPhotoSkipped] = useState(false);
  const [closeCheckReviewed, setCloseCheckReviewed] = useState(false);
  const [closeCheckReady, setCloseCheckReady] = useState(false);
  const [winnerReviewed, setWinnerReviewed] = useState(false);
  const [pilotStep, setPilotStep] = useState<TrainingWizardStepKey | null>(null);
  const [pilotEntryView, setPilotEntryView] = useState<"overview" | "choose" | "data">("overview");
  const [settingsReviewed, setSettingsReviewed] = useState(false);
  const [wizardManualSelection, setWizardManualSelection] = useState(false);
  const [normalModeReviewed, setNormalModeReviewed] = useState(false);
  const [attendanceReviewed, setAttendanceReviewed] = useState(false);
  const [attendanceRosterSignature, setAttendanceRosterSignature] = useState("");
  const [trainingStarted, setTrainingStarted] = useState(false);
  const [trainingWizardOpen, setTrainingWizardOpen] = useState(false);
  const [clockStarted, setClockStarted] = useState(false);
  const [trainingEnded, setTrainingEnded] = useState(false);
  const [teamChangedChoice, setTeamChangedChoice] = useState<"yes" | "no" | null>(null);
  const [stagedPhotoFile, setStagedPhotoFile] = useState<File | null>(null);
  const [stagedPhotoPreview, setStagedPhotoPreview] = useState<string | null>(null);
  const [photoUploadWorking, setPhotoUploadWorking] = useState(false);
  const [photoUploadWarning, setPhotoUploadWarning] = useState("");
  const photoUploadLock = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("strikr-wizard-" + props.sessionId);
      const allowed: TrainingWizardStepKey[] = ["settings", "attendance", "mode", "teams", "timer", "live", "finish", "recheck", "photo", "result", "winner", "check"];
      if (saved && allowed.includes(saved as TrainingWizardStepKey)) {
        setPilotStep(saved as TrainingWizardStepKey);
      }
      setSettingsReviewed(window.localStorage.getItem("strikr-settings-reviewed-" + props.sessionId) === "true");
      setNormalModeReviewed(window.localStorage.getItem("strikr-mode-reviewed-" + props.sessionId) === "true");
      setAttendanceReviewed(window.localStorage.getItem("strikr-attendance-reviewed-" + props.sessionId) === "true");
      setAttendanceRosterSignature(window.localStorage.getItem("strikr-attendance-roster-" + props.sessionId) ?? "");
      setTrainingStarted(window.localStorage.getItem("strikr-training-started-" + props.sessionId) === "true");
      setClockStarted(window.localStorage.getItem("strikr-clock-started-" + props.sessionId) === "true");
      setTrainingEnded(window.localStorage.getItem("strikr-training-ended-" + props.sessionId) === "true");
      const changed = window.localStorage.getItem("strikr-teams-changed-" + props.sessionId);
      setTeamChangedChoice(changed === "yes" || changed === "no" ? changed : null);
      setPilotPhotoSkipped(window.localStorage.getItem("strikr-photo-skipped-" + props.sessionId) === "true");
      setPilotFinished(window.localStorage.getItem("strikr-training-finished-" + props.initialClubId + "-" + props.sessionId) === "true");
      setCloseCheckReviewed(window.localStorage.getItem("strikr-closing-reviewed-" + props.sessionId) === "true");
      setWinnerReviewed(window.localStorage.getItem("strikr-winner-reviewed-" + props.sessionId) === "true");
    } catch { /* Storage is optional. */ }
  }, [props.sessionId]);

  useEffect(() => {
    if (pilotStep === null) return;
    try { window.localStorage.setItem("strikr-wizard-" + props.sessionId, pilotStep); } catch { /* Storage is optional. */ }
  }, [props.sessionId, pilotStep]);

  useEffect(() => {
    if (!trainingStarted) return;
    try { window.localStorage.setItem("strikr-training-started-" + props.sessionId, "true"); } catch { /* Storage is optional. */ }
  }, [props.sessionId, trainingStarted]);

  useEffect(() => {
    if (!attendanceReviewed) return;
    try {
      window.localStorage.setItem("strikr-attendance-reviewed-" + props.sessionId, "true");
      window.localStorage.setItem("strikr-attendance-roster-" + props.sessionId, attendanceRosterSignature);
    } catch { /* Storage is optional. */ }
  }, [props.sessionId, attendanceReviewed, attendanceRosterSignature]);

  useEffect(() => {
    if (!settingsReviewed) return;
    try { window.localStorage.setItem("strikr-settings-reviewed-" + props.sessionId, "true"); } catch { /* Optional storage. */ }
  }, [props.sessionId, settingsReviewed]);

  useEffect(() => {
    if (!normalModeReviewed) return;
    try { window.localStorage.setItem("strikr-mode-reviewed-" + props.sessionId, "true"); } catch { /* Storage is optional. */ }
  }, [props.sessionId, normalModeReviewed]);

  useEffect(() => {
    if (!pilotPhotoSkipped) return;
    try { window.localStorage.setItem("strikr-photo-skipped-" + props.sessionId, "true"); } catch { /* Storage is optional. */ }
  }, [props.sessionId, pilotPhotoSkipped]);
  const tournamentWizardRef = useRef<{ next: () => void; ready: boolean; label: string } | null>(null);
  const [tournamentWizardStage, setTournamentWizardStage] = useState<"teams" | "games">("teams");
  const [tournamentTeamsReady, setTournamentTeamsReady] = useState(false);
  const setupWizardRef = useRef<{ next: () => void; ready: boolean; label: string } | null>(null);
  const [setupWizardReady, setSetupWizardReady] = useState(false);
  const [configuringTournament, setConfiguringTournament] = useState(false);
  const [showProInfo, setShowProInfo] = useState(false);
  const {
    router,
    resultRef,
    teamsRef,
    attendanceRef,
    winnerPhotoInputRef,

    session,
    isAdmin,
    clubSettings,
    useFieldView,
    primaryColorKey,
    mvpVotingEnabled,

    allowTeams,
    allowResult,
    allowWinnerPhoto,
    isTrainingSession,
    isEventSession,

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

    draftPresentIds,
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
    deletingSession,
    msg,
    err,

    preparingResultShare,
    resultShareReady,
    resultShareMessage,

    attendanceDirty,
    presentPlayers,
    teamA,
    teamB,
    teamGenerationRunId,
    displayPlayers,
    displayTeamA,
    displayTeamB,
    displayUnassigned,

    canShareLineup,
    teamsComplete,
    canUploadWinnerPhoto,
    scoreAValue,
    scoreBValue,
    dayWinnerSide,

    showMvpSection,
    nextStepLabel,

    metaA,
    metaB,
    directAttendanceSaveEnabled,
    attendanceMultiSelectEnabled,

    toggleGuestForm,
    toggleAttendanceMultiSelect,
    confirmTeams,
    handleShareLineup,
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
    uploadWinnerPhotoFile,
    handleWinnerPhotoDelete,
  } = useSessionDetail({ ...props, forceAttendanceBatchMode: true });

  const stagedPhotoUploader = useRef(uploadWinnerPhotoFile);
  stagedPhotoUploader.current = uploadWinnerPhotoFile;
  useEffect(() => {
    if (!stagedPhotoFile) {
      setStagedPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(stagedPhotoFile);
    setStagedPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [stagedPhotoFile]);

  useEffect(() => {
    if (!hasResult || !stagedPhotoFile || !dayWinnerSide || saving || photoBusy || photoUploadLock.current) return;
    photoUploadLock.current = true;
    setPhotoUploadWorking(true);
    setPhotoUploadWarning("");
    void stagedPhotoUploader.current(stagedPhotoFile).then((saved) => {
      if (saved) {
        setStagedPhotoFile(null);
      } else {
        setPhotoUploadWarning("Foto konnte nicht hochgeladen werden. Erneut versuchen oder ohne Foto fortfahren.");
      }
    }).catch(() => setPhotoUploadWarning("Foto konnte nicht hochgeladen werden."))
      .finally(() => {
        setPhotoUploadWorking(false);
        photoUploadLock.current = false;
      });
  }, [hasResult, dayWinnerSide, stagedPhotoFile, saving, photoBusy]);

  useEffect(() => {
    if (hasResult && stagedPhotoFile && !dayWinnerSide) {
      setStagedPhotoFile(null);
      setPhotoUploadWarning("Unentschieden: Kein Siegerfoto nötig.");
    }
  }, [hasResult, dayWinnerSide, stagedPhotoFile]);

  if (err && !session) {
    return <div className="bg-red-50 p-4 text-sm text-red-700">{err}</div>;
  }

  if (!session) {
    return null;
  }

  const pilotAdmin = props.initialIsClubAdmin === true;
  const enableBalanceReveal = props.initialClubId === TEAM_BALANCE_REVEAL_PILOT_CLUB_ID || props.initialClubId === "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60";
  const playerPreview = !isAdmin || (pilotAdmin && pilotView === "player");
  const currentSessionType = session.type === "event" ? "event" : "training";
  const isTournamentMode = session.session_mode === "tournament";
  const sessionTypeSwitchEnabled = props.sessionTypesEnabled === true;
  // The pilot completion marker is device-local until wizard progress is stored server-side.
  // Never show a completed session if its underlying result was removed later.
  const trainingCompleted = pilotFinished && (hasResult || Boolean(session.tournament_completed_at));
  const liveOrPrepared = trainingStarted || hasResult || Boolean(session.tournament_completed_at);
  const currentAttendanceSignature = [...draftPresentIds].sort((a,b) => a-b).join(",");
  const attendanceConfirmed = attendanceReviewed && attendanceRosterSignature === currentAttendanceSignature;
  const expectedCount = displayPlayers.filter(p => !p.is_guest && p.rsvp_status === "in").length;
  const declinedCount = displayPlayers.filter(p => !p.is_guest && p.rsvp_status === "out").length;
  const noResponseCount = displayPlayers.filter(p => !p.is_guest && !p.rsvp_status).length;

  function enterTrainingWizard() {
    setPilotEntryView("overview");
    setTrainingStarted(true);
    // First opening begins with a short check; returning users resume their step.
    if (!settingsReviewed || pilotStep === null) setPilotStep("settings");
    setTrainingWizardOpen(true);
  }

  function openTraining() {
    if (props.initialIsClubAdmin === true) {
      setPilotEntryView("choose");
    } else {
      enterTrainingWizard();
    }
  }

  function leaveTrainingWizard() {
    if (attendanceDirty && !window.confirm("Es gibt noch ungespeicherte Änderungen bei der Anwesenheit. Assistent trotzdem schließen?")) return;
    setTrainingWizardOpen(false);
    setPilotEntryView("overview");
  }
  const rsvpDeadlineEpochMs = getSessionDeadlineEpochMs({
    date: session.date,
    startTime: session.start_time ?? null,
    sessionOverrideMinutes: session.rsvp_deadline_minutes_before ?? null,
    clubDefaultMinutes: props.initialRsvpDeadlineMinutesBefore ?? 30,
  });

  let activeSection: SectionKey | null = null;

  if (isEventSession) {
    activeSection = "attendance";
  } else if (isTournamentMode) {
    activeSection = attendanceDirty || presentPlayers.length < 2 ? "attendance" : null;
  } else if (attendanceDirty || presentPlayers.length < 2) {
    activeSection = "attendance";
  } else if (!teamsComplete || !teamsConfirmed) {
    activeSection = "teams";
  } else if (!hasResult) {
    activeSection = "result";
  } else if (dayWinnerSide && !hasWinnerPhoto) {
    activeSection = "photo";
  } else {
    activeSection = showMvpSection ? "mvp" : null;
  }

  function renderAttendance() {
    if (isAdmin && isTrainingSession && !playerPreview) {
      return (
        <div ref={attendanceRef}>
          <TrainingAttendanceStep
            players={displayPlayers}
            selectedIds={draftPresentIds}
            dirty={attendanceDirty}
            saving={savingPresence}
            locked={hasResult}
            onToggle={(playerId) => { void togglePresence(playerId); }}
            onSave={() => { void savePresence(); }}
            showGuestForm={showGuestForm}
            guestName={guestName}
            guestPosition={guestPosition}
            guestAgeGroup={guestAgeGroup}
            guestStrength={guestStrength}
            guestSaving={guestSaving}
            onToggleShowGuestForm={toggleGuestForm}
            onGuestNameChange={setGuestName}
            onGuestPositionChange={setGuestPosition}
            onGuestAgeGroupChange={setGuestAgeGroup}
            onGuestStrengthChange={setGuestStrength}
            onAddGuestPlayer={() => { void addGuestPlayer(); }}
          />
        </div>
      );
    }
    return (
      <div ref={attendanceRef} className="space-y-3">
        {!(true && isAdmin && isTrainingSession) && !playerPreview ? <SessionAdminRsvpCard
          sessionId={props.sessionId}
          players={displayPlayers}
          hasResult={hasResult}
          isAdmin={isAdmin}
        /> : null}

        <SessionAttendanceCard
          sessionId={props.sessionId}
          currentPlayerId={props.initialCurrentPlayerId}
          selfRsvpEnabled={props.initialHomeSessionRsvpEnabled === true || (playerPreview && props.initialCurrentPlayerId !== null)}
          rsvpDeadlineEpochMs={rsvpDeadlineEpochMs}
          players={displayPlayers}
          presentIds={draftPresentIds}
          hasResult={hasResult}
          isAdmin={isAdmin && !playerPreview}
          showGuestForm={showGuestForm}
          guestName={guestName}
          guestPosition={guestPosition}
          guestAgeGroup={guestAgeGroup}
          guestStrength={guestStrength}
          guestSaving={guestSaving}
          clubSettings={clubSettings}
          collapsed={true && isAdmin && isTrainingSession ? false : attendanceCollapsed}
          savingPresence={savingPresence}
          dirty={attendanceDirty}
          directSaveEnabled={directAttendanceSaveEnabled}
          multiSelectEnabled={attendanceMultiSelectEnabled}
          deletingGuestPlayerId={deletingGuestPlayerId}
          onToggleMultiSelect={toggleAttendanceMultiSelect}
          onToggleCollapsed={() => setAttendanceCollapsed((prev) => !prev)}
          pilotWizard={true && isAdmin && isTrainingSession}
          onToggleShowGuestForm={toggleGuestForm}
          onGuestNameChange={setGuestName}
          onGuestPositionChange={setGuestPosition}
          onGuestAgeGroupChange={setGuestAgeGroup}
          onGuestStrengthChange={setGuestStrength}
          onAddGuestPlayer={addGuestPlayer}
          onDeleteGuestPlayer={handleDeleteGuestPlayer}
          onTogglePresence={(playerId) => {
            void togglePresence(playerId);
          }}
          onSavePresence={savePresence}
        />
      </div>
    );
  }

  function renderTeams() {
    if (!allowTeams) return null;

    return (
      <div ref={teamsRef}>
        <SessionTeamsCard
          enableBalanceReveal={enableBalanceReveal}
          generationRunId={enableBalanceReveal ? teamGenerationRunId : 0}
          showStrengthNumbers={enableBalanceReveal && pilotAdmin && pilotView === "admin"}
          scoreOptions={{useStrength:clubSettings?.use_strength??true,useCategories:clubSettings?.use_categories??true,balanceCategories:props.initialBalanceCategories??[]}}
          teamA={displayTeamA}
          teamB={displayTeamB}
          unassigned={displayUnassigned}
          metaA={metaA}
          metaB={metaB}
          hasResult={hasResult}
          saving={saving || savingTeams}
          teamsComplete={teamsComplete}
          teamsConfirmed={teamsConfirmed}
          canShareLineup={canShareLineup}
          sharingLineup={sharingLineup}
          collapsed={false}
          attendanceDirty={attendanceDirty}
          enableFieldView={useFieldView}
          onToggleCollapsed={() => setTeamsCollapsed((prev) => !prev)}
          onGenerateTeams={generateTeams}
          onConfirmTeams={() => {
            confirmTeams();
            if (trainingWizardOpen && !hasResult && teamsComplete) {
              setPilotStep(pilotStep === "recheck" ? "photo" : "timer");
              setWizardManualSelection(true);
            }
          }}
          onShareLineup={handleShareLineup}
          onSetSide={setSide}
        />
      </div>
    );
  }

  function renderWinnerPhoto() {
    if (!allowWinnerPhoto || !hasResult || !dayWinnerSide) return null;

    return (
      <SessionWinnerPhotoCard
        sessionId={props.sessionId}
        hasResult={hasResult}
        saving={saving}
        photoBusy={photoBusy}
        collapsed={winnerPhotoCollapsed}
        canUploadWinnerPhoto={canUploadWinnerPhoto}
        winnerPhotoUrl={winnerPhotoUrl}
        hasWinnerPhoto={hasWinnerPhoto}
        winnerPhotoInputRef={winnerPhotoInputRef}
        onWinnerPhotoUpload={handleWinnerPhotoUpload}
        onWinnerPhotoDelete={handleWinnerPhotoDelete}
        onToggleCollapsed={() => setWinnerPhotoCollapsed((prev) => !prev)}
        title={t("sessionDetail.winnerPhoto")}
      />
    );
  }

  function renderResult() {
    if (!allowResult) return null;

    return (
      <div ref={resultRef}>
        <SessionScoreCard
          results={results}
          saving={saving}
          collapsed={resultCollapsed}
          goalsA={goalsA}
          goalsB={goalsB}
          onGoalsAChange={(value) => setGoalsA(normalizeGoalValue(value))}
          onGoalsBChange={(value) => setGoalsB(normalizeGoalValue(value))}
          onSaveResult={saveResult}
          onUpdateResult={(gameNo, nextA, nextB) => {
            void updateResult(gameNo, nextA, nextB);
          }}
          onDeleteResult={(gameNo) => {
            void deleteResult(gameNo);
          }}
          onToggleCollapsed={() => setResultCollapsed((prev) => !prev)}
          isPro={props.initialIsPro === true}
          title={t("sessionDetail.gamesResults")}
        />
      </div>
    );
  }

  function renderMvp() {
    return showMvpSection ? <SessionMvpCard sessionId={props.sessionId} /> : null;
  }

  const activeTitle =
    activeSection === "attendance"
      ? isAdmin
        ? isEventSession
          ? t("sessionDetail.setParticipants")
          : t("sessionDetail.checkAttendance")
        : t("sessionDetail.whoIsIn")
      : activeSection === "teams"
        ? t("sessionDetail.checkTeams")
        : activeSection === "photo"
          ? t("sessionDetail.addWinnerPhoto")
          : activeSection === "result"
            ? t("sessionDetail.enterResult")
            : activeSection === "mvp"
              ? t("sessionDetail.mvpVoting")
              : null;

  const activeDescription =
    activeSection === "attendance"
      ? isAdmin
        ? isEventSession
          ? t("sessionDetail.eventRsvpDescription")
          : t("sessionDetail.attendanceDescription")
        : t("sessionDetail.playerRsvpDescription")
      : activeSection === "teams"
        ? t("sessionDetail.teamsDescription")
        : activeSection === "photo"
          ? t("sessionDetail.photoDescription")
          : activeSection === "result"
            ? t("sessionDetail.resultDescription")
            : activeSection === "mvp"
              ? t("sessionDetail.mvpDescription")
              : undefined;

  function renderWorkflowSection(key: SectionKey, node: React.ReactNode) {
    if (!node) return null;

    const isActive = activeSection === key;

    return (
      <section className="space-y-3">
        {isActive && activeTitle ? (
          <WorkspaceIntro
            step={t("sessionDetail.now")}
            title={activeTitle}
            description={activeDescription}
          />
        ) : null}
        {node}
      </section>
    );
  }

  const sessionEndModal = !isTournamentMode && allowResult ? (
    <SessionEndModal
      open={showSessionEndModal}
      onClose={() => setShowSessionEndModal(false)}
      scoreA={scoreAValue}
      scoreB={scoreBValue}
      wasUnderdog={false}
      winnerPhotoUrl={winnerPhotoUrl}
      onShareSocial={handleShareResult}
      sharingSocial={sharingResult}
      resultShareReady={resultShareReady}
      preparingResultShare={preparingResultShare}
      resultShareMessage={resultShareMessage}
      mvpVotingEnabled={mvpVotingEnabled}
    />
  ) : null;

  return (
    <>
      <div className="space-y-4">
        {(pilotEntryView === "data" || playerPreview) && pilotAdmin ? <div className="rounded-2xl border border-slate-200 bg-white p-3"><div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{playerPreview ? "Spieleransicht · Vorschau" : pilotView === "leader" || props.initialIsClubAdmin === false ? "Trainingsleitung · Vorschau" : "Adminansicht · Verwaltung"}</div><div className="flex gap-1 rounded-xl bg-slate-100 p-1">{(props.initialIsClubAdmin === false ? [{key:"leader",label:"Trainingsleitung"},{key:"player",label:"Spieler"}] : [{key:"admin",label:"Admin"},{key:"leader",label:"Trainingsleitung"},{key:"player",label:"Spieler"}]).map(item=><button key={item.key} type="button" onClick={()=>setPilotView(item.key as "admin" | "leader" | "player")} aria-pressed={pilotView===item.key} className={`flex-1 rounded-lg px-2 py-2.5 text-xs font-bold sm:text-sm ${pilotView===item.key?"bg-slate-950 text-white shadow-sm":"text-slate-600"}`}>{item.label}</button>)}</div>{pilotView==="leader"&&props.initialIsClubAdmin!==false?<p className="mt-2 text-xs text-slate-500">Vorschau: Trainingsleitung kann Anwesenheiten, Teams und Ergebnisse bearbeiten, aber keine Termine verwalten.</p>:null}</div> : null}
        {(pilotEntryView === "data" || playerPreview || !isTrainingSession || !isAdmin) ? <SessionHeaderCard
          sessionId={props.sessionId}
          date={session.date}
          notes={session.notes ?? null}
          startTime={session.start_time ?? null}
          sessionRsvpDeadlineMinutesBefore={session.rsvp_deadline_minutes_before ?? null}
          clubRsvpDeadlineMinutesBefore={props.initialRsvpDeadlineMinutesBefore ?? 30}
          presentCount={presentPlayers.length}
          teamACount={allowTeams ? teamA.length : 0}
          teamBCount={allowTeams ? teamB.length : 0}
          hasResult={allowResult ? hasResult : false}
          nextStepLabel={nextStepLabel}
          isAdmin={isAdmin && !playerPreview && pilotView === "admin" && props.initialIsClubAdmin !== false}
          deletingSession={deletingSession}
          primaryColorKey={primaryColorKey}
          onDeleteSession={handleDeleteSession}
          onBack={() => router.push("/sessions")}
          onScrollToTeams={() =>
            teamsRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          onScrollToResult={() =>
            resultRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          onOpenResultModal={() => setShowSessionEndModal(true)}
          sessionType={currentSessionType}
          sessionTypesEnabled={sessionTypeSwitchEnabled}
          onSessionTypeChange={updateSessionTypeAction}
          scoreA={scoreAValue}
          scoreB={scoreBValue}
          hasWinnerPhoto={hasWinnerPhoto}
          winnerPhotoUrl={winnerPhotoUrl}
          mvpVotingEnabled={showMvpSection}
          resultCount={results.length}
          seriesId={session.series_id ?? null}
          isPro={props.initialIsPro === true}
          compactPilot={true && isAdmin && isTrainingSession}
          trainingStarted={liveOrPrepared}
        /> : null}

        {err ? <NoticeCard tone="error">{err}</NoticeCard> : null}
        {msg ? <NoticeCard tone="success">{msg}</NoticeCard> : null}

        {playerPreview ? <div className="space-y-4"><div className="rounded-xl border border-slate-200 bg-white p-3"><h2 className="mb-2 text-base font-bold text-slate-950">Anwesenheiten</h2><p className="mb-3 text-xs text-slate-500">Alle Zusagen im Überblick. Nur deine eigene Teilnahme kannst du ändern.</p>{renderAttendance()}</div>{teamsComplete ? <SessionTeamsCard generationRunId={0} showStrengthNumbers={false} scoreOptions={{useStrength:clubSettings?.use_strength??true,useCategories:clubSettings?.use_categories??true,balanceCategories:props.initialBalanceCategories??[]}} teamA={displayTeamA} teamB={displayTeamB} unassigned={displayUnassigned} metaA={metaA} metaB={metaB} hasResult={hasResult} saving={false} teamsComplete={teamsComplete} teamsConfirmed={teamsConfirmed} canShareLineup={false} sharingLineup={false} collapsed={false} attendanceDirty={false} enableFieldView={useFieldView} readOnly onToggleCollapsed={() => {}} onGenerateTeams={() => {}} onConfirmTeams={() => {}} onShareLineup={() => {}} onSetSide={() => {}} /> : null}{hasResult ? <div className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="mb-2 text-base font-bold">Ergebnisse</h2>{results.map(r => <div key={r.id} className="py-1 text-sm">Spiel {r.game_no}: {r.goals_team_a ?? "–"} : {r.goals_team_b ?? "–"}</div>)}</div> : null}</div>  : true && isAdmin && isTrainingSession && pilotEntryView !== "data" ? (!trainingWizardOpen ? (
          <section className="mx-auto max-w-xl space-y-4" aria-label="Training starten">

            {pilotEntryView === "choose" ? (
              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <button type="button" onClick={() => setPilotEntryView("overview")}
                  className="mb-5 text-sm font-bold text-slate-500 hover:text-slate-950">← Zurück</button>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Training öffnen</p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  Wie möchtest du arbeiten?
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Beide Ansichten verwenden dieselben gespeicherten Trainingsdaten.
                  Du kannst jederzeit wechseln.
                </p>
                <div className="mt-6 space-y-3">
                  <button type="button" onClick={enterTrainingWizard}
                    className="group flex min-h-28 w-full items-center justify-between gap-4 rounded-2xl border-2 border-teal-400 bg-slate-950 px-5 py-5 text-left text-white shadow-md transition hover:bg-slate-900">
                    <span>
                      <span className="block text-lg font-black">✨ Geführter Trainingsstart</span>
                      <span className="mt-1 block text-sm leading-6 text-white/65">Ein Schritt nach dem anderen. Ideal für den Spieltag.</span>
                    </span>
                    <span className="text-2xl text-teal-300">→</span>
                  </button>
                  <button type="button" onClick={() => setPilotEntryView("data")}
                    className="flex min-h-24 w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-left text-slate-950 transition hover:border-slate-400 hover:bg-white">
                    <span>
                      <span className="block text-lg font-black">▤ Datenansicht</span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">Alles im Überblick. Für erfahrene Admins.</span>
                    </span>
                    <span className="text-2xl text-slate-500">→</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-[26px] bg-gradient-to-br from-[#08121f] via-slate-950 to-[#123b43] p-6 text-white shadow-xl sm:p-8">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-300">strikr · Training</div>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  {trainingCompleted ? "Training abgeschlossen." : liveOrPrepared ? "Weiter geht’s." : "Bereit für euer Training?"}
                </h1>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  {trainingCompleted
                    ? "Die Ergebnisse sind gespeichert. Du kannst sie im Assistenten ansehen oder ändern."
                    : "Schritt für Schritt durch euren Trainingsabend. Nur das, was du gerade brauchst."}
                </p>
                <div className="mt-7 grid grid-cols-3 gap-2 border-y border-white/10 py-4">
                  <div className="text-center"><div className="text-2xl font-black">{expectedCount}</div><div className="text-xs text-white/60">Zusagen</div></div>
                  <div className="text-center"><div className="text-2xl font-black">{declinedCount}</div><div className="text-xs text-white/60">Absagen</div></div>
                  <div className="text-center"><div className="text-2xl font-black">{noResponseCount}</div><div className="text-xs text-white/60">Offen</div></div>
                </div>
                <button type="button" onClick={openTraining}
                  className="mt-6 min-h-14 w-full rounded-xl bg-teal-300 px-5 py-3 text-base font-black text-slate-950 transition hover:bg-white">
                  {trainingCompleted ? "Training ansehen →" : liveOrPrepared ? "Training fortsetzen →" : "Training starten →"}
                </button>
                <p className="mt-3 text-center text-xs text-white/55">
                  {pilotAdmin ? "Du wählst anschließend zwischen Wizard und Datenansicht." : "Geführt und übersichtlich – jederzeit schließen."}
                </p>
              </div>
            )}
          </section>
        ) : (() => {
          const steps = [
            { key: "settings" as const, title: "Einstellungen prüfen", done: settingsReviewed, summary: "Termin & Spielregeln kurz kontrollieren" },
            { key: "attendance" as const, title: "Anwesenheit", done: !attendanceDirty && presentPlayers.length >= 2 && (attendanceConfirmed || hasResult), summary: `${presentPlayers.length} Spieler dabei` },
            { key: "mode" as const, title: "Spielmodus", done: isTournamentMode || normalModeReviewed || teamsComplete || hasResult, summary: isTournamentMode ? "Turniermodus" : "Normales Spiel" },
            ...(!isTournamentMode ? [
              { key: "teams" as const, title: "Faire Teams", done: teamsComplete && teamsConfirmed, summary: `${displayTeamA.length} : ${displayTeamB.length} Spieler` },
              { key: "timer" as const, title: "Spieluhr einstellen", done: clockStarted || hasResult, summary: "Zeit wählen und Training starten" },
              { key: "live" as const, title: "Training läuft", done: trainingEnded || hasResult, summary: "Spieluhr und Trainingsende" },
              { key: "finish" as const, title: "Teams prüfen", done: teamChangedChoice !== null || hasResult, summary: "Wurde die Einteilung noch geändert?" },
              ...(teamChangedChoice === "yes" && !hasResult ? [
                { key: "recheck" as const, title: "Teams korrigieren", done: teamsComplete && teamsConfirmed, summary: "Änderungen prüfen und bestätigen" },
              ] : []),
              { key: "photo" as const, title: "Foto auswählen", optional: true, done: hasWinnerPhoto || pilotPhotoSkipped || stagedPhotoFile !== null || hasResult, summary: "Optional: Siegerfoto vorbereiten" },
              { key: "result" as const, title: "Ergebnis speichern", done: hasResult, summary: "Spielstand eintragen und speichern" },
            ] : [
              { key: "result" as const, title: "Turnier durchführen", done: Boolean(session.tournament_completed_at), summary: session.tournament_completed_at ? "Turnier abgeschlossen" : "Spielplan & Ergebnisse" },
              { key: "photo" as const, title: "Siegerfoto", optional: true, done: hasWinnerPhoto || pilotPhotoSkipped, summary: hasWinnerPhoto ? "Foto vorhanden" : pilotPhotoSkipped ? "Ohne Foto fortgesetzt" : "Optional" },
              { key: "winner" as const, title: "Siegercard", done: winnerReviewed, summary: "Turniersieg ansehen" },
            ]),
            { key: "check" as const, title: "Abschlusscheck", done: closeCheckReviewed, summary: "Anwesenheit, Pünktlichkeit & Vorfälle" },
          ];
          const current = steps.find(s => !s.done)?.key ?? steps[steps.length - 1].key;
          const rememberedIndex = steps.findIndex(s => s.key === pilotStep);
           const rememberedAvailable = rememberedIndex >= 0 && steps.slice(0, rememberedIndex).every(s => s.done);
           const selected = rememberedAvailable && (wizardManualSelection || !steps[rememberedIndex].done)
             ? steps[rememberedIndex].key : current;
          const selectedIndex = steps.findIndex(s => s.key === selected);
          const renderStep = (key: typeof steps[number]["key"]) => {
            if (key === "settings") return (
              <section className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-lg font-black text-slate-950">Passt alles für heute?</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Kontrolliere kurz die wichtigsten Daten. Keine Änderungen nötig? Dann einfach weiter.
                  </p>
                  <dl className="mt-5 divide-y divide-slate-100">
                    {[
                      { title: "Datum", value: new Date(session.date + "T12:00:00").toLocaleDateString("de-DE", {weekday: "short",day:"2-digit",month:"2-digit",year:"numeric"}) },
                      { title: "Start", value: session.start_time ? session.start_time.slice(0,5) + " Uhr" : "Keine Uhrzeit hinterlegt" },
                      { title: "Spielart", value: isTournamentMode ? "Turnier" : "Normales Training" },
                      { title: "Teameinteilung", value: clubSettings?.use_strength === false ? "Ohne Spielerstärken" : "Mit Spielerstärken" },
                      { title: "Kategorien", value: clubSettings?.use_categories === false ? "Nicht berücksichtigen" : "Berücksichtigen" },
                      { title: "Aktuelle Zusagen", value: String(expectedCount) + " Spieler" },
                    ].map(item => (
                      <div key={item.title} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <dt className="font-semibold text-slate-500">{item.title}</dt>
                        <dd className="text-right font-bold text-slate-950">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <p className="px-1 text-center text-sm text-slate-500">
                  Ändern kannst du Details bei Bedarf in der Datenansicht.
                </p>
              </section>
            );
            if (key === "timer" || key === "live") return (
              <section className="space-y-3">
                <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
                  <h3 className="text-lg font-black text-slate-950">
                    {key === "timer" ? "Spielzeit einstellen und starten" : "Euer Training läuft"}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {key === "timer"
                      ? "Wähle Dauer und Pauseneinstellungen in der Spieluhr. Starte dann euer Training direkt hier."
                      : "Die Spieluhr läuft auch beim Wechsel der Ansicht weiter. Nach dem Spiel drückst du unten auf „Training beenden“."}
                  </p>
                </div>
                <SessionGameTimerLoader sessionId={props.sessionId}
                  startLabel="▶ Training starten"
                  onStarted={() => {
                    setClockStarted(true);
                    try { window.localStorage.setItem("strikr-clock-started-" + props.sessionId, "true"); } catch { /* Optional. */ }
                    setPilotStep("live");
                    setWizardManualSelection(true);
                  }} />
                {key === "timer" ? (
                  <p className="rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">
                    Falls ihr ohne Spieluhr spielt, kannst du die Einheit auch ohne Timer fortsetzen.
                    <button type="button" onClick={() => {
                      setClockStarted(true);
                      try { window.localStorage.setItem("strikr-clock-started-" + props.sessionId, "true"); } catch { /* Optional. */ }
                      setPilotStep("live");
                      setWizardManualSelection(true);
                    }} className="ml-1 font-black text-teal-700 underline underline-offset-2">Ohne Spieluhr starten</button>
                  </p>
                ) : null}
              </section>
            );
            if (key === "finish") return <section className="space-y-4">
              <div className="rounded-2xl bg-slate-950 p-5 text-white">
                <div className="text-xs font-black uppercase tracking-[0.15em] text-teal-300">Training beendet</div>
                <h3 className="mt-2 text-xl font-black">Wurden die Teams noch verändert?</h3>
                <p className="mt-2 text-sm text-white/65">Zum Beispiel, weil jemand später gegangen ist oder Spieler getauscht wurden.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([{value:"no",title:"Nein",text:"Teams passen"},{value:"yes",title:"Ja",text:"Nochmal prüfen"}] as const).map(item => (
                  <button key={item.value} type="button" aria-pressed={teamChangedChoice === item.value}
                    onClick={() => {
                      setTeamChangedChoice(item.value);
                      try { window.localStorage.setItem("strikr-teams-changed-" + props.sessionId, item.value); } catch { /* Optional. */ }
                    }}
                    className={`min-h-28 rounded-2xl border-2 p-4 text-left transition ${teamChangedChoice === item.value ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white"}`}>
                    <span className="block text-lg font-black text-slate-950">{item.title}</span>
                    <span className="mt-2 block text-xs text-slate-600">{item.text}</span>
                  </button>
                ))}
              </div>
            </section>;
            if (key === "recheck") return <section className="space-y-3">
              <p className="rounded-xl bg-teal-50 p-3 text-sm leading-6 text-slate-700">
                Prüfe die Teams und passe sie bei Bedarf an. Danach Aufstellung bestätigen.
              </p>
              {renderTeams()}
            </section>;
            if (key === "photo" && !isTournamentMode && !hasResult) return (
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.15em] text-teal-700">Optional</div>
                <h3 className="mt-2 text-lg font-black text-slate-950">Habt ihr ein Siegerfoto gemacht?</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Du kannst es jetzt auswählen oder fotografieren. strikr speichert es nach dem Ergebnis automatisch beim Siegerteam.
                  Bei einem Unentschieden ist kein Siegerfoto erforderlich.
                </p>
                <input type="file" accept="image/*"
                  aria-label="Siegerfoto auswählen"
                  onChange={event => {
                    const file = event.target.files?.[0] ?? null;
                    event.target.value = "";
                    if (file && file.type.startsWith("image/") && file.size <= 20 * 1024 * 1024) {
                      setStagedPhotoFile(file);
                      setPhotoUploadWarning("");
                      setPilotPhotoSkipped(false);
                    } else if (file) {
                      setPhotoUploadWarning("Bitte ein Foto mit maximal 20 MB auswählen.");
                    }
                  }}
                  className="mt-5 block w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-3 file:font-black file:text-white" />
                {stagedPhotoPreview ? <div className="mt-4 space-y-2">
                  <img src={stagedPhotoPreview} alt="Ausgewähltes Siegerfoto" className="max-h-64 w-full rounded-xl bg-slate-100 object-contain" />
                  <p className="text-xs font-semibold text-teal-700">✓ Foto ausgewählt – wird nach dem Ergebnis hochgeladen.</p>
                  <button type="button" onClick={() => setStagedPhotoFile(null)} className="text-xs font-bold text-slate-600 underline underline-offset-2">Foto entfernen</button>
                </div> : null}
                {photoUploadWarning ? <p role="alert" className="mt-3 text-xs font-bold text-rose-700">{photoUploadWarning}</p> : null}
                <p className="mt-4 text-xs text-slate-500">Kein Foto? Einfach unten auf Weiter tippen.</p>
              </section>
            );
                        if (key === "attendance") return renderAttendance();
            if (key === "mode") return <div className="space-y-3">
              <h3 className="text-base font-black text-slate-950">Wie wollt ihr spielen?</h3>
              <div className={`rounded-xl border-2 bg-white p-3 ${!isTournamentMode ? "border-teal-500" : "border-slate-200"}`}>
                <div className="flex items-center justify-between"><span className="text-sm font-bold">⚽ Normales Spiel</span><span className="text-xs font-bold text-teal-700">{!isTournamentMode ? "✓ Ausgewählt" : "Nicht ausgewählt"}</span></div>
                <p className="mt-1 text-xs text-slate-500">Zwei Teams, Spiele und Ergebnisse</p>
              </div>
              <div className={`rounded-xl border-2 bg-white p-3 ${isTournamentMode ? "border-teal-500" : "border-slate-200"}`}>
                <div className="flex items-center justify-between"><span className="text-sm font-bold">🏆 Turniermodus</span><span className="text-xs font-bold text-teal-700">{isTournamentMode ? "✓ Ausgewählt" : "Optional"}</span></div>
                <p className="mt-1 text-xs text-slate-500">Mehrere Teams, Spielplan und Turniertabelle</p>
                {!isTournamentMode && hasResult ? <p className="mt-2 text-xs font-semibold text-amber-700">Wechsel gesperrt: Ergebnisse sind bereits erfasst.</p> : null}
                {!isTournamentMode && !hasResult ? (props.initialIsPro === true ? (
                  configuringTournament ? (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      <button type="button" onClick={() => { setConfiguringTournament(false); setSetupWizardReady(false); setupWizardRef.current = null; }}
                        className="text-xs font-bold text-slate-600 underline underline-offset-2">
                        ← Zur normalen Spielauswahl
                      </button>
                      <SessionTournamentCard sessionId={props.sessionId} enabled={false} isAdmin={isAdmin}
                        presentCount={presentPlayers.length} hasNormalResult={false}
                        onActivated={() => { setConfiguringTournament(false); setPilotStep("result"); setTournamentWizardStage("teams"); router.refresh(); }}
                        wizardControl={setupWizardRef} onWizardReady={setSetupWizardReady} />
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfiguringTournament(true)}
                      className="mt-4 min-h-12 w-full rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-black text-teal-900 transition hover:bg-teal-100">
                      Turnier einrichten →
                    </button>
                  )
                ) : <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3"><div className="text-sm font-black text-violet-900">🔒 Turniermodus mit PRO</div><p className="mt-1 text-xs text-violet-800">Free enthält ein Spiel pro Training. Der Turniermodus mit mehreren Spielen ist mit PRO verfügbar.</p><button type="button" onClick={() => setShowProInfo(true)} className="mt-2 inline-flex text-xs font-bold text-violet-900 underline underline-offset-2">PRO-Funktionen ansehen →</button></div>) : null}
              </div>
            </div>;
                        if (key === "teams") return renderTeams();
            if (key === "result") return isTournamentMode
              ? <SessionTournamentCard sessionId={props.sessionId} enabled={true} isAdmin={isAdmin} presentCount={presentPlayers.length} hasNormalResult={false} onActivated={() => router.refresh()} tournamentWizardControl={tournamentWizardRef} onTournamentWizardChange={(stage, ready) => { setTournamentWizardStage(stage); setTournamentTeamsReady(ready); }} onFinalized={() => { setPilotStep("photo"); router.refresh(); }} />
              : <div className="space-y-3">
                {photoUploadWorking ? <p role="status" className="rounded-xl bg-cyan-50 p-3 text-sm font-bold text-cyan-900">Siegerfoto wird gespeichert …</p> : null}
                {photoUploadWarning ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{photoUploadWarning} <button type="button" onClick={() => setStagedPhotoFile(null)} className="font-bold underline">Ohne Foto weiter</button></p> : null}
                {renderResult()}
              </div>;
            if (key === "photo") return isTournamentMode && session.tournament_completed_at
              ? <SessionWinnerPhotoCard sessionId={props.sessionId} hasResult={hasResult} saving={saving} photoBusy={photoBusy} collapsed={false} canUploadWinnerPhoto={canUploadWinnerPhoto} winnerPhotoUrl={winnerPhotoUrl} hasWinnerPhoto={hasWinnerPhoto} winnerPhotoInputRef={winnerPhotoInputRef} onWinnerPhotoUpload={handleWinnerPhotoUpload} onWinnerPhotoDelete={handleWinnerPhotoDelete} onToggleCollapsed={() => setWinnerPhotoCollapsed(prev => !prev)} title={t("sessionDetail.winnerPhoto")} />
              : <div className="space-y-3">{hasResult && dayWinnerSide ? <SessionWinnerPhotoCard sessionId={props.sessionId} hasResult={hasResult} saving={saving} photoBusy={photoBusy} collapsed={false} canUploadWinnerPhoto={canUploadWinnerPhoto} winnerPhotoUrl={winnerPhotoUrl} hasWinnerPhoto={hasWinnerPhoto} winnerPhotoInputRef={winnerPhotoInputRef} onWinnerPhotoUpload={handleWinnerPhotoUpload} onWinnerPhotoDelete={handleWinnerPhotoDelete} onToggleCollapsed={() => {}} title={t("sessionDetail.winnerPhoto")} /> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{hasResult ? "Unentschieden: Kein Siegerfoto nötig. Du kannst das Training abschließen." : "Bitte zuerst ein Ergebnis mit Sieger erfassen."}</p>}</div>;
            if (key === "winner") return <TournamentWinnerCard sessionId={props.sessionId} photoUrl={winnerPhotoUrl} onBack={() => setPilotStep("result")} />;
            if (key === "check") return <TrainingClosingCheck sessionId={props.sessionId} players={displayPlayers} presentIds={draftPresentIds} onReadyChange={setCloseCheckReady} />;
            return null;
          };
          const nextDisabled =
            (selected === "attendance" && (attendanceDirty || presentPlayers.length < 2 || savingPresence)) ||
            (selected === "mode" && !isTournamentMode && configuringTournament && !setupWizardReady) ||
            (selected === "teams" && !isTournamentMode && (!teamsComplete || !teamsConfirmed || saving || savingTeams)) ||
            (selected === "timer" && !clockStarted) ||
            (selected === "finish" && teamChangedChoice === null) ||
            (selected === "recheck" && (!teamsComplete || !teamsConfirmed || savingTeams)) ||
            (selected === "result" && !isTournamentMode && (!hasResult || saving || photoUploadWorking || (Boolean(stagedPhotoFile) && Boolean(dayWinnerSide)))) ||
            (selected === "result" && isTournamentMode && (tournamentWizardStage === "teams" ? !tournamentTeamsReady : !session.tournament_completed_at)) ||
            (selected === "photo" && isTournamentMode && !session.tournament_completed_at) ||
            (selected === "check" && !closeCheckReady);
          const helperText = selected === "settings"
            ? "Prüfe kurz eure Einstellungen. Wenn alles passt, geht es direkt weiter."
            : selected === "attendance"
              ? "Markiere die tatsächlich anwesenden Spieler und speichere die Auswahl."
              : selected === "mode"
                ? "Wählt ein normales Spiel oder richtet bei Bedarf ein Turnier ein."
                : selected === "teams" || selected === "recheck"
                  ? "Erstelle ausgeglichene Teams, passe sie bei Bedarf an und bestätige die Aufstellung."
                  : selected === "timer"
                    ? "Stelle die Spielzeit ein und tippe anschließend auf „Training starten“."
                    : selected === "live"
                      ? "Das Training läuft. Wenn ihr fertig seid, beende die Einheit mit dem Button unten."
                      : selected === "finish"
                        ? "Wurden die Teams während des Trainings verändert?"
                        : selected === "photo"
                          ? "Optional: Siegerfoto auswählen. Nach dem Ergebnis wird es automatisch gespeichert."
                          : selected === "result"
                            ? "Trage das Spielergebnis ein. Erst danach wird das gewählte Siegerfoto hochgeladen."
                            : selected === "check"
                              ? "Prüfe zum Abschluss noch Anwesenheit, Pünktlichkeit und besondere Vorkommnisse."
                              : "Deine Siegerkarte ist bereit.";
          const statusHint = selected === "attendance" && (attendanceDirty || presentPlayers.length < 2)
            ? "Mindestens zwei anwesende Spieler auswählen und offene Änderungen speichern."
            : selected === "teams" && !teamsComplete
              ? "Erstelle zuerst beide Teams vollständig."
              : selected === "teams" && !teamsConfirmed
                ? "Bestätige die Aufstellung in der Teamansicht."
                : selected === "result" && !isTournamentMode && !hasResult
                  ? "Erst ein Ergebnis speichern, danach geht es weiter."
                  : selected === "result" && isTournamentMode && tournamentWizardStage === "games" && !session.tournament_completed_at
                    ? "Beende zuerst das Turnier."
                    : null;
          const nextStep = steps[selectedIndex + 1];
          const nextLabel = selected === "check" ? "Training abschließen ✓"
            : selected === "live" ? "Training beenden →"
            : selected === "finish" ? (teamChangedChoice === "yes" ? "Teams prüfen →" : "Weiter zum Foto →")
            : selected === "recheck" ? "Teams passen · Foto auswählen →"
            : selected === "photo" && !isTournamentMode ? "Weiter zum Ergebnis →"
            : selected === "timer" ? "Training läuft · weiter →"
            : selected === "settings" ? "Passt · Anwesenheit prüfen →"
            : selected === "mode" && !isTournamentMode
            ? (configuringTournament ? (setupWizardRef.current?.label ?? "Turnier einrichten →") : "Normal spielen · Teams erstellen →")
            : selected === "result" && isTournamentMode && tournamentWizardStage === "teams"
              ? "Teams bestätigt · Turnier starten →"
              : selected === "attendance" ? "Anwesenheit passt · weiter →"
              : !nextStep ? "Training abschließen ✓"
              : selected === "photo" ? "Weiter zur Siegerkarte →"
              : selected === "result" && !isTournamentMode ? "Ergebnis gespeichert · weiter →"
              : "Weiter →";
          return (
            <TrainingSessionWizard
              steps={steps}
              selectedIndex={selectedIndex}
              completed={pilotFinished}
              fullscreen
              onClose={leaveTrainingWizard}
              overlayContent={sessionEndModal}
              helperText={statusHint ?? helperText}
              nextDisabled={nextDisabled}
              nextLabel={nextLabel}
              onSelect={(index) => { setPilotStep(steps[index].key); setWizardManualSelection(true); }}
              onBack={() => {
                if (selectedIndex > 0) {
                  setPilotStep(steps[selectedIndex - 1].key);
                  setWizardManualSelection(true);
                }
              }}
              onNext={() => {
                if (nextDisabled) return;
                if (selected === "settings") {
                  setSettingsReviewed(true);
                  setPilotStep("attendance");
                  setWizardManualSelection(true);
                  return;
                }
                if (selected === "attendance") {
                  setAttendanceRosterSignature(currentAttendanceSignature);
                  setAttendanceReviewed(true);
                  setPilotStep("mode");
                  setWizardManualSelection(true);
                  return;
                }
                if (selected === "mode" && !isTournamentMode) {
                  if (configuringTournament && setupWizardRef.current) setupWizardRef.current.next();
                  else {
                    setNormalModeReviewed(true);
                    setPilotStep("teams");
                    setWizardManualSelection(true);
                  }
                  return;
                }
                if (selected === "result" && isTournamentMode && tournamentWizardStage === "teams") {
                  tournamentWizardRef.current?.next();
                  return;
                }
                if (selected === "timer") {
                  setPilotStep("live");
                  setWizardManualSelection(true);
                  return;
                }
                if (selected === "live") {
                  // Cancel any active game-timer alarms before leaving the live screen.
                  window.dispatchEvent(new CustomEvent("strikr:training-timer-stop", { detail: { sessionId: props.sessionId } }));
                  setTrainingEnded(true);
                  try { window.localStorage.setItem("strikr-training-ended-" + props.sessionId, "true"); } catch { /* Optional. */ }
                  setPilotStep("finish");
                  setWizardManualSelection(true);
                  return;
                }
                if (selected === "finish") {
                  setPilotStep(teamChangedChoice === "yes" ? "recheck" : "photo");
                  setWizardManualSelection(true);
                  return;
                }
                if (selected === "recheck") {
                  setPilotStep("photo");
                  setWizardManualSelection(true);
                  return;
                }
                if (nextStep) {
                  if (selected === "photo" && !hasWinnerPhoto && !stagedPhotoFile) setPilotPhotoSkipped(true);
                  if (selected === "winner") {
                    setWinnerReviewed(true);
                    try { window.localStorage.setItem("strikr-winner-reviewed-" + props.sessionId, "true"); } catch { /* Optional storage. */ }
                  }
                  setPilotStep(nextStep.key);
                  setWizardManualSelection(true);
                } else {
                  if (selected === "check") {
                    setCloseCheckReviewed(true);
                    try { window.localStorage.setItem("strikr-closing-reviewed-" + props.sessionId, "true"); } catch { /* Optional storage. */ }
                  }
                  if (!hasWinnerPhoto) setPilotPhotoSkipped(true);
                  setPilotFinished(true);
                  try { window.localStorage.setItem("strikr-training-finished-" + props.initialClubId + "-" + props.sessionId, "true"); } catch { /* Storage is optional. */ }
                  router.push("/sessions");
                }
              }}
              beforeContent={selected === "photo" && !isTournamentMode && hasResult ? (
                <div className="overflow-hidden rounded-xl bg-slate-950 p-4 text-center text-white">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-300">Spielergebnis</div>
                  <div className="mt-2 text-4xl font-black tabular-nums">{scoreAValue} <span className="text-teal-400">:</span> {scoreBValue}</div>
                  {winnerPhotoUrl ? <img src={winnerPhotoUrl} alt="Siegerfoto" className="mx-auto mt-3 max-h-64 w-full rounded-lg object-contain" /> : null}
                  <button type="button" onClick={() => setShowSessionEndModal(true)} className="mt-3 rounded-lg bg-teal-400 px-4 py-2.5 text-sm font-bold text-slate-950">
                    {hasWinnerPhoto ? "Ergebnis und Siegerfoto teilen ↗" : "Ergebnis teilen ↗"}
                  </button>
                </div>
              ) : null}
            >
              {renderStep(selected)}
              {selected === "photo" && !isTournamentMode && showMvpSection ? (
                <details className="rounded-xl border border-slate-200 bg-white p-3">
                  <summary className="cursor-pointer text-sm font-bold text-slate-900">⭐ MVP-Abstimmung ansehen</summary>
                  <div className="mt-3">{renderMvp()}</div>
                </details>
              ) : null}
            </TrainingSessionWizard>
          );
        })()) : (
        <>
        {renderWorkflowSection("attendance", renderAttendance())}

        {isTrainingSession ? (
          <SessionTournamentCard
            sessionId={props.sessionId}
            enabled={isTournamentMode}
            isAdmin={isAdmin}
            presentCount={presentPlayers.length}
            hasNormalResult={hasResult && !isTournamentMode}
            onActivated={() => router.refresh()}
          />
        ) : null}

        {!isTournamentMode && allowTeams ? renderWorkflowSection("teams", renderTeams()) : null}

        {!isTournamentMode && isTrainingSession && !hasResult ? (
          <SessionGameTimerLoader sessionId={props.sessionId} />
        ) : null}

        {!isTournamentMode && allowResult ? renderWorkflowSection("result", renderResult()) : null}
        {!isTournamentMode && allowWinnerPhoto
          ? renderWorkflowSection("photo", renderWinnerPhoto())
          : null}

        {isTournamentMode && session.tournament_completed_at && isAdmin ? (
          <SessionWinnerPhotoCard
            sessionId={props.sessionId}
            hasResult={hasResult}
            saving={saving}
            photoBusy={photoBusy}
            collapsed={winnerPhotoCollapsed}
            canUploadWinnerPhoto={canUploadWinnerPhoto}
            winnerPhotoUrl={winnerPhotoUrl}
            hasWinnerPhoto={hasWinnerPhoto}
            winnerPhotoInputRef={winnerPhotoInputRef}
            onWinnerPhotoUpload={handleWinnerPhotoUpload}
            onWinnerPhotoDelete={handleWinnerPhotoDelete}
            onToggleCollapsed={() => setWinnerPhotoCollapsed((prev) => !prev)}
            title={t("sessionDetail.winnerPhoto")}
          />
        ) : null}

        {!isTournamentMode && hasResult && !dayWinnerSide ? (
          <NoticeCard tone="default">
            {t("sessionDetail.noDayWinner", { scoreA: scoreAValue, scoreB: scoreBValue })}
          </NoticeCard>
        ) : null}

        {!isTournamentMode && showMvpSection ? renderWorkflowSection("mvp", renderMvp()) : null}

        {!isTournamentMode && isTrainingSession && hasResult && !activeSection ? (
          <NoticeCard tone="default">
            {t("sessionDetail.savedMoreGames")}
          </NoticeCard>
        ) : null}

        {isEventSession ? (
          <NoticeCard tone="default">
            {t("sessionDetail.eventMode")}
          </NoticeCard>
        ) : null}
        </>
        )}
        {pilotEntryView === "data" && isAdmin && isTrainingSession ? (
          <button type="button" onClick={() => { setPilotView("admin"); setPilotEntryView("overview"); }}
            className="sticky bottom-4 z-10 mx-auto block rounded-full border border-teal-300 bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl">
            ← Zur Trainingsauswahl
          </button>
        ) : null}
      </div>

      {showProInfo && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[10050] flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" aria-hidden="true"
            onClick={() => setShowProInfo(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="strikr-pro-dialog-title"
            className="relative w-full max-w-[420px] rounded-[26px] border border-violet-200 bg-white p-6 text-slate-950 shadow-[0_30px_90px_rgba(0,0,0,.45)]">
            <div className="inline-flex rounded-full bg-violet-100 px-3 py-1.5 text-xs font-black text-violet-800">strikr PRO</div>
            <h2 id="strikr-pro-dialog-title" className="mt-4 text-2xl font-black tracking-tight">Mehr Möglichkeiten für euer Team</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Der Turniermodus mit mehreren Teams, Spielplan und Live-Tabelle ist in strikr PRO enthalten.
              Im kostenlosen Tarif könnt ihr weiterhin normale Trainings und faire Teams nutzen.
            </p>
            <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm font-bold text-violet-800">
              Du bleibst hier im Wizard. Dein Training bleibt unverändert.
            </p>
            <button type="button" onClick={() => setShowProInfo(false)}
              className="mt-5 min-h-12 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
              Verstanden · zurück zum Training
            </button>
          </div>
        </div>,
        document.body
      ) : null}
      {!(trainingWizardOpen && isAdmin && isTrainingSession && !playerPreview) ? sessionEndModal : null}
    </>
  );
}
