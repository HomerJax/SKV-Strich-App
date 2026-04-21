"use client";

import SessionHeaderCard from "./SessionHeaderCard";
import SessionAttendanceCard from "./SessionAttendanceCard";
import SessionTeamsCard from "./SessionTeamsCard";
import SessionResultCard from "./SessionResultCard";
import SessionMvpCard from "./SessionMvpCard";
import SessionEndModal from "@/components/SessionEndModal";
import { updateSessionTypeAction } from "./session-type-actions";
import type { Player, SessionRow, TeamMap } from "./session-types";
import type { ClubSettings } from "./session-detail-helpers";
import { normalizeGoalValue } from "./session-ui";
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
    canShareResult,
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
  } = useSessionDetail(props);

  if (err && !session) {
    return <div className="bg-red-50 p-4 text-sm text-red-700">{err}</div>;
  }

  if (!session) {
    return null;
  }

  const currentSessionType =
    props.initialSessionType === "event" ? "event" : "training";
  const sessionTypeSwitchEnabled = props.sessionTypesEnabled === true;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/sessions")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <span aria-hidden="true">←</span>
            <span>Zurück zu Sessions</span>
          </button>
        </div>

        <SessionHeaderCard
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
          onScrollToTeams={() =>
            teamsRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          onScrollToResult={() =>
            resultRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          sessionType={currentSessionType}
          sessionTypesEnabled={sessionTypeSwitchEnabled}
          onSessionTypeChange={updateSessionTypeAction}
        />

        {isTrainingSession && !hasResult ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
            Empfohlene Reihenfolge: Anwesenheit festlegen
            {attendanceDirty || attendanceMultiSelectEnabled
              ? " → Anwesenheit speichern"
              : ""}
            {" "}→ Teams aufteilen → Siegerfoto hochladen → Ergebnis speichern.
          </div>
        ) : null}

        {isEventSession ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
            Termin: Hier sammelst du Zu- und Absagen. Teams, Ergebnis,
            Siegerfoto und MVP sind für diesen Typ deaktiviert.
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

        {allowResult && hasResult ? (
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

        {showMvpSection ? <SessionMvpCard sessionId={props.sessionId} /> : null}

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

        {allowTeams ? (
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
        ) : null}

        {allowWinnerPhoto ? (
          <SessionResultCard
            hasResult={hasResult}
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
            title="Siegerfoto"
            description="Foto ansehen, hochladen, ersetzen oder löschen. Tipp für die Share Card: möglichst ein Hochformat-Foto verwenden."
            showResultSection={false}
            showPhotoSection={true}
            showShareSection={false}
            collapsedByDefault={hasResult}
          />
        ) : null}

        {allowResult ? (
          <div ref={resultRef}>
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
              title="Ergebnis"
              description="Ergebnis speichern, ändern oder löschen."
              showResultSection={true}
              showPhotoSection={false}
              showShareSection={false}
              collapsedByDefault={hasResult}
            />
          </div>
        ) : null}
      </div>

      {allowResult ? (
        <SessionEndModal
          open={showSessionEndModal}
          onClose={() => setShowSessionEndModal(false)}
          scoreA={scoreAValue}
          scoreB={scoreBValue}
          wasUnderdog={false}
          onShareInternal={handleShareInternalResult}
          onShareSocial={handleShareResult}
          sharingInternal={sharingInternal}
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