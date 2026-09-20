"use client";

import SessionHeaderCard from "./SessionHeaderCard";
import SessionAttendanceCard from "./SessionAttendanceCard";
import SessionAdminRsvpCard from "./SessionAdminRsvpCard";
import SessionTeamsCard from "./SessionTeamsCard";
import SessionWinnerPhotoCard from "./SessionWinnerPhotoCard";
import SessionScoreCard from "./SessionScoreCard";
import SessionMvpCard from "./SessionMvpCard";
import SessionGameTimerLoader from "./SessionGameTimerLoader";
import SessionEndModal from "@/components/SessionEndModal";
import { updateSessionTypeAction } from "./session-type-actions";
import type { Player, SessionGameResult, SessionRow, TeamMap } from "./session-types";
import type { ClubSettings } from "./session-detail-helpers";
import { normalizeGoalValue } from "./session-ui";
import { getSessionDeadlineEpochMs } from "@/lib/session-rsvp-deadline";
import type { BalanceCategory } from "./session-ui";
import { useSessionDetail } from "./useSessionDetail";

type SessionDetailClientProps = {
  sessionId: number;
  initialSession: SessionRow;
  initialPlayers: Player[];
  initialPresentIds: number[];
  initialManualTeams: TeamMap;
  initialClubId: string;
  initialIsAdmin: boolean;
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
};

type SectionKey = "attendance" | "teams" | "photo" | "result" | "mvp";

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

  const currentSessionType = session.type === "event" ? "event" : "training";
  const sessionTypeSwitchEnabled = props.sessionTypesEnabled === true;
  const rsvpDeadlineEpochMs = getSessionDeadlineEpochMs({
    date: session.date,
    startTime: session.start_time ?? null,
    sessionOverrideMinutes: session.rsvp_deadline_minutes_before ?? null,
    clubDefaultMinutes: props.initialRsvpDeadlineMinutesBefore ?? 60,
  });

  let activeSection: SectionKey | null = null;

  if (isEventSession) {
    activeSection = "attendance";
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
        <SessionAdminRsvpCard
          sessionId={props.sessionId}
          players={displayPlayers}
          hasResult={hasResult}
          isAdmin={isAdmin}
        />

        <SessionAttendanceCard
          sessionId={props.sessionId}
          currentPlayerId={props.initialCurrentPlayerId}
          selfRsvpEnabled={props.initialHomeSessionRsvpEnabled === true}
          rsvpDeadlineEpochMs={rsvpDeadlineEpochMs}
          players={displayPlayers}
          presentIds={draftPresentIds}
          hasResult={hasResult}
          isAdmin={isAdmin}
          showGuestForm={showGuestForm}
          guestName={guestName}
          guestPosition={guestPosition}
          guestAgeGroup={guestAgeGroup}
          guestStrength={guestStrength}
          guestSaving={guestSaving}
          clubSettings={clubSettings}
          collapsed={attendanceCollapsed}
          savingPresence={savingPresence}
          dirty={attendanceDirty}
          directSaveEnabled={directAttendanceSaveEnabled}
          multiSelectEnabled={attendanceMultiSelectEnabled}
          deletingGuestPlayerId={deletingGuestPlayerId}
          onToggleMultiSelect={toggleAttendanceMultiSelect}
          onToggleCollapsed={() => setAttendanceCollapsed((prev) => !prev)}
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
          collapsed={teamsCollapsed}
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
        title="Tagessiegerfoto"
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
          title="Spiele & Ergebnisse"
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
          ? "Teilnehmer festlegen"
          : "Anwesenheit prüfen"
        : "Wer ist dabei?"
      : activeSection === "teams"
        ? "Teams prüfen und anpassen"
        : activeSection === "photo"
          ? "Tagessiegerfoto ergänzen"
          : activeSection === "result"
            ? "Spielergebnis eintragen"
            : activeSection === "mvp"
              ? "MVP Voting"
              : null;

  const activeDescription =
    activeSection === "attendance"
      ? isAdmin
        ? isEventSession
          ? "Hier sammelst du Zu- und Absagen für den Termin."
          : "Zuerst festlegen, wer heute wirklich da ist."
        : "Schau, wer schon zugesagt hat – und gib direkt deine eigene Rückmeldung."
      : activeSection === "teams"
        ? "Teams erst prüfen, bei Bedarf verschieben und dann bestätigen."
        : activeSection === "photo"
          ? "Der Tagessieger steht fest. Jetzt kannst du das gemeinsame Siegerfoto ergänzen."
          : activeSection === "result"
            ? "Spiel 1 speichern – weitere Spiele kannst du danach direkt ergänzen."
            : activeSection === "mvp"
              ? "Nach dem Ergebnis läuft hier das Voting bzw. Reveal."
              : undefined;

  function renderWorkflowSection(key: SectionKey, node: React.ReactNode) {
    if (!node) return null;

    const isActive = activeSection === key;

    return (
      <section className="space-y-3">
        {isActive && activeTitle ? (
          <WorkspaceIntro
            step="Jetzt dran"
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
        <SessionHeaderCard
          sessionId={props.sessionId}
          date={session.date}
          notes={session.notes ?? null}
          startTime={session.start_time ?? null}
          sessionRsvpDeadlineMinutesBefore={session.rsvp_deadline_minutes_before ?? null}
          clubRsvpDeadlineMinutesBefore={props.initialRsvpDeadlineMinutesBefore ?? 60}
          presentCount={presentPlayers.length}
          teamACount={allowTeams ? teamA.length : 0}
          teamBCount={allowTeams ? teamB.length : 0}
          hasResult={allowResult ? hasResult : false}
          nextStepLabel={nextStepLabel}
          isAdmin={isAdmin}
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
        />

        {err ? <NoticeCard tone="error">{err}</NoticeCard> : null}
        {msg ? <NoticeCard tone="success">{msg}</NoticeCard> : null}

        {renderWorkflowSection("attendance", renderAttendance())}
        {allowTeams ? renderWorkflowSection("teams", renderTeams()) : null}

        {isTrainingSession && !hasResult ? (
          <SessionGameTimerLoader sessionId={props.sessionId} />
        ) : null}

        {allowResult ? renderWorkflowSection("result", renderResult()) : null}
        {allowWinnerPhoto
          ? renderWorkflowSection("photo", renderWinnerPhoto())
          : null}

        {hasResult && !dayWinnerSide ? (
          <NoticeCard tone="default">
            Tagessiege {scoreAValue}:{scoreBValue} – aktuell gibt es keinen eindeutigen Tagessieger. Deshalb wird kein Siegerfoto verwendet.
          </NoticeCard>
        ) : null}

        {showMvpSection ? renderWorkflowSection("mvp", renderMvp()) : null}

        {isTrainingSession && hasResult && !activeSection ? (
          <NoticeCard tone="default">
            Training gespeichert. Weitere Spiele kannst du jederzeit ergänzen.
          </NoticeCard>
        ) : null}

        {isEventSession ? (
          <NoticeCard tone="default">
            Termin-Modus: Hier sammelst du Zu- und Absagen. Teams, Ergebnis,
            Siegerfoto und MVP sind deaktiviert.
          </NoticeCard>
        ) : null}
      </div>

      {allowResult ? (
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
