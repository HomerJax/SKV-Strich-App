"use client";

import { useRef, useState } from "react";
import SessionHeaderCard from "./SessionHeaderCard";
import SessionAttendanceCard from "./SessionAttendanceCard";
import SessionAdminRsvpCard from "./SessionAdminRsvpCard";
import SessionTeamsCard from "./SessionTeamsCard";
import SessionWinnerPhotoCard from "./SessionWinnerPhotoCard";
import SessionScoreCard from "./SessionScoreCard";
import SessionMvpCard from "./SessionMvpCard";
import SessionGameTimerLoader from "./SessionGameTimerLoader";
import SessionTournamentCard from "./SessionTournamentCard";
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
  const { t } = useI18n();
  const [pilotStep, setPilotStep] = useState<"attendance" | "mode" | "teams" | "result" | "photo">("attendance");
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
  const isTournamentMode = session.session_mode === "tournament";
  const sessionTypeSwitchEnabled = props.sessionTypesEnabled === true;
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
        {!(props.initialClubId === "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60" && isAdmin && isTrainingSession) ? <SessionAdminRsvpCard
          sessionId={props.sessionId}
          players={displayPlayers}
          hasResult={hasResult}
          isAdmin={isAdmin}
        /> : null}

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
          collapsed={props.initialClubId === "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60" && isAdmin && isTrainingSession ? false : attendanceCollapsed}
          savingPresence={savingPresence}
          dirty={attendanceDirty}
          directSaveEnabled={directAttendanceSaveEnabled}
          multiSelectEnabled={attendanceMultiSelectEnabled}
          deletingGuestPlayerId={deletingGuestPlayerId}
          onToggleMultiSelect={toggleAttendanceMultiSelect}
          onToggleCollapsed={() => setAttendanceCollapsed((prev) => !prev)}
          pilotWizard={props.initialClubId === "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60" && isAdmin && isTrainingSession}
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
          isPro={props.initialIsPro === true}
          compactPilot={props.initialClubId === "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60" && isAdmin && isTrainingSession}
        />

        {err ? <NoticeCard tone="error">{err}</NoticeCard> : null}
        {msg ? <NoticeCard tone="success">{msg}</NoticeCard> : null}

        {props.initialClubId === "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60" && isAdmin && isTrainingSession ? (() => {
          const steps = [
            { key: "attendance" as const, title: "Anwesenheit", done: !attendanceDirty && presentPlayers.length >= 2, summary: `${presentPlayers.length} Spieler dabei` },
            { key: "mode" as const, title: "Spielmodus", done: isTournamentMode || teamsConfirmed, summary: isTournamentMode ? "Turniermodus" : "Normales Spiel" },
            ...(!isTournamentMode ? [
              { key: "teams" as const, title: "Teams erstellen", done: teamsComplete && teamsConfirmed, summary: `${displayTeamA.length} : ${displayTeamB.length} Spieler` },
              { key: "result" as const, title: "Spiele & Ergebnisse", done: hasResult, summary: `${results.length} Ergebnis(se) erfasst` },
              { key: "photo" as const, title: "Siegerfoto", done: hasWinnerPhoto || (hasResult && !dayWinnerSide), summary: hasWinnerPhoto ? "Foto vorhanden" : "Optional" },
            ] : [
              { key: "result" as const, title: "Turnier durchführen", done: Boolean(session.tournament_completed_at), summary: session.tournament_completed_at ? "Turnier abgeschlossen" : "Spielplan & Ergebnisse" },
              { key: "photo" as const, title: "Siegerfoto", done: hasWinnerPhoto, summary: hasWinnerPhoto ? "Foto vorhanden" : "Optional" },
            ]),
          ];
          const current = steps.find(s => !s.done)?.key ?? steps[steps.length - 1].key;
          const selected = steps.some(s => s.key === pilotStep) ? pilotStep : current;
          const selectedIndex = steps.findIndex(s => s.key === selected);
          const renderStep = (key: typeof steps[number]["key"]) => {
            if (key === "attendance") return <div className="space-y-3">{renderAttendance()}<details className="rounded-xl border border-teal-200 bg-white p-3"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Abwesenheiten verwalten</summary><div className="mt-3"><SessionAdminRsvpCard sessionId={props.sessionId} players={displayPlayers} hasResult={hasResult} isAdmin={isAdmin} /></div></details></div>;
            if (key === "mode") return <SessionTournamentCard sessionId={props.sessionId} enabled={isTournamentMode} isAdmin={isAdmin} presentCount={presentPlayers.length} hasNormalResult={hasResult && !isTournamentMode} onActivated={() => { setPilotStep("result"); setTournamentWizardStage("teams"); router.refresh(); }} wizardControl={setupWizardRef} onWizardReady={setSetupWizardReady} />;
            if (key === "teams") return renderTeams();
            if (key === "result") return isTournamentMode
              ? <SessionTournamentCard sessionId={props.sessionId} enabled={true} isAdmin={isAdmin} presentCount={presentPlayers.length} hasNormalResult={false} onActivated={() => router.refresh()} tournamentWizardControl={tournamentWizardRef} onTournamentWizardChange={(stage, ready) => { setTournamentWizardStage(stage); setTournamentTeamsReady(ready); }} onFinalized={() => { setPilotStep("photo"); router.refresh(); }} />
              : <div className="space-y-3"><SessionGameTimerLoader sessionId={props.sessionId} />{renderResult()}</div>;
            if (key === "photo") return isTournamentMode && session.tournament_completed_at
              ? <SessionWinnerPhotoCard sessionId={props.sessionId} hasResult={hasResult} saving={saving} photoBusy={photoBusy} collapsed={winnerPhotoCollapsed} canUploadWinnerPhoto={canUploadWinnerPhoto} winnerPhotoUrl={winnerPhotoUrl} hasWinnerPhoto={hasWinnerPhoto} winnerPhotoInputRef={winnerPhotoInputRef} onWinnerPhotoUpload={handleWinnerPhotoUpload} onWinnerPhotoDelete={handleWinnerPhotoDelete} onToggleCollapsed={() => setWinnerPhotoCollapsed(prev => !prev)} title={t("sessionDetail.winnerPhoto")} />
              : renderWinnerPhoto();
            return null;
          };
          return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.07)]">
            <div className="bg-slate-950 px-5 py-5 text-white">
              <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-300">Session-Assistent</span><span className="text-xs text-slate-300">Schritt {selectedIndex + 1} von {steps.length}</span></div>
              <div className="mt-3 flex gap-1.5">{steps.map((s,i)=><div key={s.key} className={`h-1.5 flex-1 rounded-full ${i <= selectedIndex ? "bg-teal-400" : "bg-slate-700"}`} />)}</div>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight">{steps[selectedIndex].title}</h2>
              <p className="mt-1 text-sm text-slate-300">Bearbeite diesen Schritt und gehe anschließend weiter.</p>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              {steps.slice(0,selectedIndex).map(s=><button key={s.key} type="button" onClick={()=>setPilotStep(s.key)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left"><span><span className="block text-sm font-bold text-slate-800">✓ {s.title}</span><span className="text-xs text-slate-500">{s.summary}</span></span><span className="text-xs font-semibold text-teal-700">Bearbeiten</span></button>)}
              <div className="rounded-lg border-l-4 border-teal-500 bg-teal-50 p-2 shadow-[0_8px_28px_rgba(13,148,136,0.12)] sm:p-4">{renderStep(selected)}</div>
              <button type="button" onClick={()=>{if (selected === "mode" && !isTournamentMode) { setupWizardRef.current?.next(); return; } if (selected === "result" && isTournamentMode && tournamentWizardStage === "teams") { tournamentWizardRef.current?.next(); return; } if (selected === "teams" && !isTournamentMode && !teamsConfirmed) { void confirmTeams(); return; } const next=steps[selectedIndex+1];if(next)setPilotStep(next.key);}} disabled={selectedIndex === steps.length-1 || (selected === "attendance" && (attendanceDirty || presentPlayers.length < 2)) || (selected === "mode" && !isTournamentMode && !setupWizardReady) || (selected === "teams" && !isTournamentMode && (!teamsComplete || saving || savingTeams)) || (selected === "result" && isTournamentMode && (tournamentWizardStage === "teams" ? !tournamentTeamsReady : !session.tournament_completed_at))} className="w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-bold text-white disabled:opacity-40">{selected === "mode" && !isTournamentMode ? (setupWizardRef.current?.label ?? "Fertig & weiter →") : selected === "result" && isTournamentMode && tournamentWizardStage === "teams" ? "Fertig · Turnier starten →" : selected === "teams" && !isTournamentMode && !teamsConfirmed ? "Teams bestätigen & weiter →" : "Fertig & weiter →"}</button>
              {steps.slice(selectedIndex+1).map(s=><button key={s.key} type="button" onClick={()=>setPilotStep(s.key)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left text-sm text-slate-600"><span>{s.title}</span><span className="text-xs text-slate-400">Öffnen ›</span></button>)}
            </div>
          </div>;
        })() : (
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
