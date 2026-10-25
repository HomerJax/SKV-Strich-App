"use client";

import { useEffect, useRef, useState } from "react";
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
type TrainingWizardStepKey = "attendance" | "mode" | "teams" | "result" | "photo" | "winner";

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
  const [pilotStep, setPilotStep] = useState<TrainingWizardStepKey | null>(null);
  const [wizardManualSelection, setWizardManualSelection] = useState(false);
  const [normalModeReviewed, setNormalModeReviewed] = useState(false);
  const [attendanceReviewed, setAttendanceReviewed] = useState(false);
  const [attendanceRosterSignature, setAttendanceRosterSignature] = useState("");
  const [trainingStarted, setTrainingStarted] = useState(false);
  const [trainingWizardOpen, setTrainingWizardOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("strikr-wizard-" + props.sessionId);
      const allowed: TrainingWizardStepKey[] = ["attendance", "mode", "teams", "result", "photo", "winner"];
      if (saved && allowed.includes(saved as TrainingWizardStepKey)) {
        setPilotStep(saved as TrainingWizardStepKey);
      }
      setNormalModeReviewed(window.localStorage.getItem("strikr-mode-reviewed-" + props.sessionId) === "true");
      setAttendanceReviewed(window.localStorage.getItem("strikr-attendance-reviewed-" + props.sessionId) === "true");
      setAttendanceRosterSignature(window.localStorage.getItem("strikr-attendance-roster-" + props.sessionId) ?? "");
      setTrainingStarted(window.localStorage.getItem("strikr-training-started-" + props.sessionId) === "true");
      setPilotPhotoSkipped(window.localStorage.getItem("strikr-photo-skipped-" + props.sessionId) === "true");
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
    handleWinnerPhotoDelete,
  } = useSessionDetail(props);

  if (err && !session) {
    return <div className="bg-red-50 p-4 text-sm text-red-700">{err}</div>;
  }

  if (!session) {
    return null;
  }

  const pilotAdmin = props.initialIsClubAdmin === true;
  const enableBalanceReveal = props.initialClubId === TEAM_BALANCE_REVEAL_PILOT_CLUB_ID;
  const playerPreview = !isAdmin || (pilotAdmin && pilotView === "player");
  const currentSessionType = session.type === "event" ? "event" : "training";
  const isTournamentMode = session.session_mode === "tournament";
  const sessionTypeSwitchEnabled = props.sessionTypesEnabled === true;
  const liveOrPrepared = trainingStarted || hasResult;
  const currentAttendanceSignature = [...draftPresentIds].sort((a,b) => a-b).join(",");
  const attendanceConfirmed = attendanceReviewed && attendanceRosterSignature === currentAttendanceSignature;
  const expectedCount = displayPlayers.filter(p => !p.is_guest && p.rsvp_status === "in").length;
  const declinedCount = displayPlayers.filter(p => !p.is_guest && p.rsvp_status === "out").length;
  const noResponseCount = displayPlayers.filter(p => !p.is_guest && !p.rsvp_status).length;

  function enterTrainingWizard() {
    setTrainingStarted(true);
    setTrainingWizardOpen(true);
  }

  function leaveTrainingWizard() {
    if (attendanceDirty && !window.confirm("Es gibt noch ungespeicherte Änderungen bei der Anwesenheit. Assistent trotzdem schließen?")) return;
    setTrainingWizardOpen(false);
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
          onConfirmTeams={confirmTeams}
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

  return (
    <>
      <div className="space-y-4">
        {pilotAdmin ? <div className="rounded-2xl border border-slate-200 bg-white p-3"><div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{playerPreview ? "Spieleransicht · Vorschau" : pilotView === "leader" || props.initialIsClubAdmin === false ? "Trainingsleitung · Vorschau" : "Adminansicht · Verwaltung"}</div><div className="flex gap-1 rounded-xl bg-slate-100 p-1">{(props.initialIsClubAdmin === false ? [{key:"leader",label:"Trainingsleitung"},{key:"player",label:"Spieler"}] : [{key:"admin",label:"Admin"},{key:"leader",label:"Trainingsleitung"},{key:"player",label:"Spieler"}]).map(item=><button key={item.key} type="button" onClick={()=>setPilotView(item.key as "admin" | "leader" | "player")} aria-pressed={pilotView===item.key} className={`flex-1 rounded-lg px-2 py-2.5 text-xs font-bold sm:text-sm ${pilotView===item.key?"bg-slate-950 text-white shadow-sm":"text-slate-600"}`}>{item.label}</button>)}</div>{pilotView==="leader"&&props.initialIsClubAdmin!==false?<p className="mt-2 text-xs text-slate-500">Vorschau: Trainingsleitung kann Anwesenheiten, Teams und Ergebnisse bearbeiten, aber keine Termine verwalten.</p>:null}</div> : null}
        <SessionHeaderCard
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
        />

        {err ? <NoticeCard tone="error">{err}</NoticeCard> : null}
        {msg ? <NoticeCard tone="success">{msg}</NoticeCard> : null}

        {playerPreview ? <div className="space-y-4"><div className="rounded-xl border border-slate-200 bg-white p-3"><h2 className="mb-2 text-base font-bold text-slate-950">Anwesenheiten</h2><p className="mb-3 text-xs text-slate-500">Alle Zusagen im Überblick. Nur deine eigene Teilnahme kannst du ändern.</p>{renderAttendance()}</div>{teamsComplete ? <SessionTeamsCard generationRunId={0} showStrengthNumbers={false} scoreOptions={{useStrength:clubSettings?.use_strength??true,useCategories:clubSettings?.use_categories??true,balanceCategories:props.initialBalanceCategories??[]}} teamA={displayTeamA} teamB={displayTeamB} unassigned={displayUnassigned} metaA={metaA} metaB={metaB} hasResult={hasResult} saving={false} teamsComplete={teamsComplete} teamsConfirmed={teamsConfirmed} canShareLineup={false} sharingLineup={false} collapsed={false} attendanceDirty={false} enableFieldView={useFieldView} readOnly onToggleCollapsed={() => {}} onGenerateTeams={() => {}} onConfirmTeams={() => {}} onShareLineup={() => {}} onSetSide={() => {}} /> : null}{hasResult ? <div className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="mb-2 text-base font-bold">Ergebnisse</h2>{results.map(r => <div key={r.id} className="py-1 text-sm">Spiel {r.game_no}: {r.goals_team_a ?? "–"} : {r.goals_team_b ?? "–"}</div>)}</div> : null}</div> : true && isAdmin && isTrainingSession ? (!trainingWizardOpen ? (
          <section className="space-y-4" aria-label="Training vorbereiten">
            <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-md">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.17em] text-teal-300">
                {liveOrPrepared ? "Training fortsetzen" : "Training ist geplant"}
              </div>
              <h2 className="mt-2 text-xl font-black tracking-tight">
                {liveOrPrepared ? "Bereit für den nächsten Schritt?" : "Alles bereit für den Trainingstag?"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {liveOrPrepared
                  ? "Deine gespeicherten Anwesenheiten, Teams und Ergebnisse bleiben erhalten. Setze den Trainings-Assistenten fort."
                  : "Die Einheit ist angelegt. Bis zum Trainingsbeginn können die Spieler zu- oder absagen und du kannst den Termin vorbereiten. Erst beim Start geht es in den geführten Ablauf."}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/10 p-3 text-center"><div className="text-xl font-black">{expectedCount}</div><div className="text-[10px] font-semibold text-slate-300">Zusagen</div></div>
                <div className="rounded-xl bg-white/10 p-3 text-center"><div className="text-xl font-black">{declinedCount}</div><div className="text-[10px] font-semibold text-slate-300">Absagen</div></div>
                <div className="rounded-xl bg-white/10 p-3 text-center"><div className="text-xl font-black">{noResponseCount}</div><div className="text-[10px] font-semibold text-slate-300">Noch offen</div></div>
              </div>
              <button type="button" onClick={enterTrainingWizard} className="mt-5 min-h-14 w-full rounded-xl bg-teal-400 px-4 py-3 text-base font-extrabold text-slate-950 shadow-lg transition hover:bg-teal-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">
                {liveOrPrepared ? "▶ Training fortsetzen" : "▶ Training starten"}
              </button>
              <p className="mt-2 text-center text-xs text-slate-300">
                {liveOrPrepared ? "Du kannst den Fullscreen-Assistenten jederzeit wieder verlassen." : "Der Fullscreen-Assistent beginnt mit der Anwesenheitsprüfung."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-base font-black text-slate-950">Vorbereitung & Rückmeldungen</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">Bis zum Training kannst du Termin, Notizen und Zu-/Absagen wie gewohnt verwalten. Am Spieltag bestätigst du die tatsächliche Anwesenheit im Assistenten.</p>
              <div className="mt-4">
                <SessionAdminRsvpCard sessionId={props.sessionId} players={displayPlayers} hasResult={hasResult} isAdmin={props.initialIsClubAdmin === true && pilotView === "admin"} />
              </div>
            </div>
          </section>
        ) : (() => {
          const steps = [
            { key: "attendance" as const, title: "Anwesenheit", done: !attendanceDirty && presentPlayers.length >= 2 && (attendanceConfirmed || hasResult), summary: `${presentPlayers.length} Spieler dabei` },
            { key: "mode" as const, title: "Spielmodus", done: isTournamentMode || normalModeReviewed || teamsComplete || hasResult, summary: isTournamentMode ? "Turniermodus" : "Normales Spiel" },
            ...(!isTournamentMode ? [
              { key: "teams" as const, title: "Teams erstellen", done: teamsComplete && teamsConfirmed, summary: `${displayTeamA.length} : ${displayTeamB.length} Spieler` },
              { key: "result" as const, title: "Spiele & Ergebnisse", done: hasResult, summary: `${results.length} Ergebnis(se) erfasst` },
              { key: "photo" as const, title: "Siegerfoto", optional: true, done: hasWinnerPhoto || pilotPhotoSkipped || (hasResult && !dayWinnerSide), summary: hasWinnerPhoto ? "Foto vorhanden" : "Optional" },
            ] : [
              { key: "result" as const, title: "Turnier durchführen", done: Boolean(session.tournament_completed_at), summary: session.tournament_completed_at ? "Turnier abgeschlossen" : "Spielplan & Ergebnisse" },
              { key: "photo" as const, title: "Siegerfoto", optional: true, done: hasWinnerPhoto || pilotPhotoSkipped, summary: hasWinnerPhoto ? "Foto vorhanden" : pilotPhotoSkipped ? "Ohne Foto fortgesetzt" : "Optional" },
              { key: "winner" as const, title: "Siegercard", done: false, summary: "Turniersieg ansehen" },
            ]),
          ];
          const current = steps.find(s => !s.done)?.key ?? steps[steps.length - 1].key;
          const rememberedIndex = steps.findIndex(s => s.key === pilotStep);
           const rememberedAvailable = rememberedIndex >= 0 && steps.slice(0, rememberedIndex).every(s => s.done);
           const selected = rememberedAvailable && (wizardManualSelection || !steps[rememberedIndex].done)
             ? steps[rememberedIndex].key : current;
          const selectedIndex = steps.findIndex(s => s.key === selected);
          const renderStep = (key: typeof steps[number]["key"]) => {
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
                {!isTournamentMode && !hasResult ? (props.initialIsPro === true ? <SessionTournamentCard sessionId={props.sessionId} enabled={false} isAdmin={isAdmin} presentCount={presentPlayers.length} hasNormalResult={false} onActivated={() => { setPilotStep("result"); setTournamentWizardStage("teams"); router.refresh(); }} wizardControl={setupWizardRef} onWizardReady={setSetupWizardReady} /> : <div className="rounded-xl border border-violet-200 bg-violet-50 p-3"><div className="text-sm font-black text-violet-900">🔒 Turniermodus mit PRO</div><p className="mt-1 text-xs text-violet-800">Free enthält ein Spiel pro Training. Der Turniermodus mit mehreren Spielen ist mit PRO verfügbar.</p><a href="/pro" className="mt-2 inline-flex text-xs font-bold text-violet-900 underline">PRO-Funktionen ansehen →</a></div>) : null}
              </div>
            </div>;
                        if (key === "teams") return renderTeams();
            if (key === "result") return isTournamentMode
              ? <SessionTournamentCard sessionId={props.sessionId} enabled={true} isAdmin={isAdmin} presentCount={presentPlayers.length} hasNormalResult={false} onActivated={() => router.refresh()} tournamentWizardControl={tournamentWizardRef} onTournamentWizardChange={(stage, ready) => { setTournamentWizardStage(stage); setTournamentTeamsReady(ready); }} onFinalized={() => { setPilotStep("photo"); router.refresh(); }} />
              : <div className="space-y-3"><SessionGameTimerLoader sessionId={props.sessionId} />{renderResult()}</div>;
            if (key === "photo") return isTournamentMode && session.tournament_completed_at
              ? <SessionWinnerPhotoCard sessionId={props.sessionId} hasResult={hasResult} saving={saving} photoBusy={photoBusy} collapsed={false} canUploadWinnerPhoto={canUploadWinnerPhoto} winnerPhotoUrl={winnerPhotoUrl} hasWinnerPhoto={hasWinnerPhoto} winnerPhotoInputRef={winnerPhotoInputRef} onWinnerPhotoUpload={handleWinnerPhotoUpload} onWinnerPhotoDelete={handleWinnerPhotoDelete} onToggleCollapsed={() => setWinnerPhotoCollapsed(prev => !prev)} title={t("sessionDetail.winnerPhoto")} />
              : <div className="space-y-3">{hasResult && dayWinnerSide ? <SessionWinnerPhotoCard sessionId={props.sessionId} hasResult={hasResult} saving={saving} photoBusy={photoBusy} collapsed={false} canUploadWinnerPhoto={canUploadWinnerPhoto} winnerPhotoUrl={winnerPhotoUrl} hasWinnerPhoto={hasWinnerPhoto} winnerPhotoInputRef={winnerPhotoInputRef} onWinnerPhotoUpload={handleWinnerPhotoUpload} onWinnerPhotoDelete={handleWinnerPhotoDelete} onToggleCollapsed={() => {}} title={t("sessionDetail.winnerPhoto")} /> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{hasResult ? "Unentschieden: Kein Siegerfoto nötig. Du kannst das Training abschließen." : "Bitte zuerst ein Ergebnis mit Sieger erfassen."}</p>}</div>;
            if (key === "winner") return <TournamentWinnerCard sessionId={props.sessionId} photoUrl={winnerPhotoUrl} onBack={() => setPilotStep("result")} />;
            return null;
          };
          const nextDisabled =
            (selected === "attendance" && (attendanceDirty || presentPlayers.length < 2 || savingPresence)) ||
            (selected === "mode" && !isTournamentMode && setupWizardRef.current !== null && !setupWizardReady) ||
            (selected === "teams" && !isTournamentMode && (!teamsComplete || !teamsConfirmed || saving || savingTeams)) ||
            (selected === "result" && !isTournamentMode && (!hasResult || saving)) ||
            (selected === "result" && isTournamentMode && (tournamentWizardStage === "teams" ? !tournamentTeamsReady : !session.tournament_completed_at)) ||
            (selected === "photo" && isTournamentMode && !session.tournament_completed_at);
          const helperText = selected === "attendance"
            ? "Prüfe die tatsächliche Anwesenheit und ergänze bei Bedarf Gäste. Änderungen zuerst speichern."
            : selected === "mode"
              ? "Entscheide dich für ein normales Spiel oder richte optional ein Turnier ein."
              : selected === "teams"
                ? "Lass strikr faire Teams erstellen, passe sie bei Bedarf an und bestätige die Aufstellung."
                : selected === "result"
                  ? isTournamentMode
                    ? "Spiele dein Turnier durch, trage Ergebnisse ein und schließe es ab."
                    : "Starte bei Bedarf die Spieluhr und speichere nach dem Spiel das Ergebnis."
                  : selected === "photo"
                    ? "Optional: Siegerfoto hinzufügen und Ergebnis teilen. Das Training kann auch ohne Foto beendet werden."
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
          const nextLabel = selected === "mode" && !isTournamentMode
            ? (setupWizardRef.current?.label ?? "Normal spielen · Teams erstellen →")
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
                if (selected === "attendance") {
                  setAttendanceRosterSignature(currentAttendanceSignature);
                  setAttendanceReviewed(true);
                  setPilotStep("mode");
                  setWizardManualSelection(true);
                  return;
                }
                if (selected === "mode" && !isTournamentMode) {
                  if (setupWizardRef.current) setupWizardRef.current.next();
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
                if (nextStep) {
                  setPilotStep(nextStep.key);
                  setWizardManualSelection(true);
                } else {
                  if (!hasWinnerPhoto) setPilotPhotoSkipped(true);
                  setPilotFinished(true);
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
      </div>

      {!isTournamentMode && allowResult ? (
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
      ) : null}
    </>
  );
}
