"use client";

import SessionHeaderCard from "./SessionHeaderCard";
import SessionAttendanceCard from "./SessionAttendanceCard";
import SessionTeamsCard from "./SessionTeamsCard";
import SessionWinnerPhotoCard from "./SessionWinnerPhotoCard";
import SessionScoreCard from "./SessionScoreCard";
import SessionMvpCard from "./SessionMvpCard";
import SessionEndModal from "@/components/SessionEndModal";
import { updateSessionTypeAction } from "./session-type-actions";
import type { Player, SessionRow, TeamMap } from "./session-types";
import type { ClubSettings } from "./session-detail-helpers";
import { normalizeGoalValue } from "./session-ui";
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
  initialClubSettings: ClubSettings;
  initialBalanceCategories?: BalanceCategory[];
  initialWinnerPhotoUrl: string | null;
  initialGoalsA: string;
  initialGoalsB: string;
  initialHasResult: boolean;
  initialPrimaryColor?: string | null;
  initialMvpVotingEnabled: boolean;
  initialUseNicknames?: boolean;
  initialUseFieldView?: boolean;
  initialHomeSessionRsvpEnabled?: boolean;
  initialSessionType?: "training" | "event";
  sessionTypesEnabled?: boolean;
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

function SecondarySectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-slate-200" />
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </div>
      <div className="h-px flex-1 bg-slate-200" />
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

  let activeSection: SectionKey | null = null;

  if (isEventSession) {
    activeSection = "attendance";
  } else if (hasResult) {
    activeSection = showMvpSection ? "mvp" : null;
  } else if (attendanceDirty || presentPlayers.length < 2) {
    activeSection = "attendance";
  } else if (!teamsComplete || !teamsConfirmed) {
    activeSection = "teams";
  } else if (!hasWinnerPhoto) {
    activeSection = "photo";
  } else {
    activeSection = "result";
  }

  function renderAttendance() {
    return (
      <div ref={attendanceRef}>
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
          directSaveEnabled={directAttendanceSaveEnabled}
          multiSelectEnabled={attendanceMultiSelectEnabled}
          deletingGuestPlayerId={deletingGuestPlayerId}
          onToggleMultiSelect={toggleAttendanceMultiSelect}
          onToggleCollapsed={() => setAttendanceCollapsed((prev) => !prev)}
          onToggleShowGuestForm={toggleGuestForm}
          onGuestNameChange={setGuestName}
          onGuestPositionChange={setGuestPosition}
          onGuestAgeGroupChange={setGuestAgeGroup}
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
    if (!allowWinnerPhoto) return null;

    return (
      <SessionWinnerPhotoCard
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
        title="Siegerfoto"
      />
    );
  }

  function renderResult() {
    if (!allowResult) return null;

    return (
      <div ref={resultRef}>
        <SessionScoreCard
          hasResult={hasResult}
          saving={saving}
          collapsed={resultCollapsed}
          goalsA={goalsA}
          goalsB={goalsB}
          onGoalsAChange={(value) => setGoalsA(normalizeGoalValue(value))}
          onGoalsBChange={(value) => setGoalsB(normalizeGoalValue(value))}
          onSaveResult={saveResult}
          onDeleteResult={deleteResult}
          onToggleCollapsed={() => setResultCollapsed((prev) => !prev)}
          title="Ergebnis"
        />
      </div>
    );
  }

  function renderMvp() {
    return showMvpSection ? <SessionMvpCard sessionId={props.sessionId} /> : null;
  }

  const secondarySections: Array<{ key: SectionKey; node: React.ReactNode }> = [];

  if (activeSection !== "attendance") {
    secondarySections.push({ key: "attendance", node: renderAttendance() });
  }

  if (allowTeams && activeSection !== "teams") {
    secondarySections.push({ key: "teams", node: renderTeams() });
  }

  if (allowWinnerPhoto && activeSection !== "photo") {
    secondarySections.push({ key: "photo", node: renderWinnerPhoto() });
  }

  if (allowResult && activeSection !== "result") {
    secondarySections.push({ key: "result", node: renderResult() });
  }

  if (showMvpSection && activeSection !== "mvp") {
    secondarySections.push({ key: "mvp", node: renderMvp() });
  }

  const activeTitle =
    activeSection === "attendance"
      ? isEventSession
        ? "Teilnehmer festlegen"
        : "Anwesenheit prüfen"
      : activeSection === "teams"
        ? "Teams prüfen und anpassen"
        : activeSection === "photo"
          ? "Optional Siegerfoto ergänzen"
          : activeSection === "result"
            ? "Ergebnis eintragen"
            : activeSection === "mvp"
              ? "MVP Voting"
              : null;

  const activeDescription =
    activeSection === "attendance"
      ? isEventSession
        ? "Hier sammelst du Zu- und Absagen für den Termin."
        : "Zuerst festlegen, wer heute wirklich da ist."
      : activeSection === "teams"
        ? "Teams erst prüfen, bei Bedarf verschieben und dann bestätigen."
        : activeSection === "photo"
          ? "Optional, aber stark für Stimmung und spätere SiegerCard."
          : activeSection === "result"
            ? "Zum Schluss das Endergebnis sauber speichern."
            : activeSection === "mvp"
              ? "Nach dem Ergebnis läuft hier das Voting bzw. Reveal."
              : undefined;

  return (
    <>
      <div className="space-y-4">
        <SessionHeaderCard
          sessionId={props.sessionId}
          date={session.date}
          notes={session.notes ?? null}
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
        />

        {err ? <NoticeCard tone="error">{err}</NoticeCard> : null}
        {msg ? <NoticeCard tone="success">{msg}</NoticeCard> : null}

        {activeSection && activeTitle ? (
          <section className="space-y-3">
            <WorkspaceIntro
              step="Jetzt dran"
              title={activeTitle}
              description={activeDescription}
            />

            {activeSection === "attendance" ? renderAttendance() : null}
            {activeSection === "teams" ? renderTeams() : null}
            {activeSection === "photo" ? renderWinnerPhoto() : null}
            {activeSection === "result" ? renderResult() : null}
            {activeSection === "mvp" ? renderMvp() : null}
          </section>
        ) : null}

        {secondarySections.length > 0 ? (
          <section className="space-y-2.5">
            <SecondarySectionHeader title="Weitere Bereiche" />
            <div className="space-y-2.5">
              {secondarySections.map((section) => (
                <div key={section.key}>{section.node}</div>
              ))}
            </div>
          </section>
        ) : null}

        {isTrainingSession && !hasResult && !activeSection ? (
          <NoticeCard tone="default">
            Teams, Foto und Ergebnis sind bereit. Du kannst direkt den
            Abschluss speichern.
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