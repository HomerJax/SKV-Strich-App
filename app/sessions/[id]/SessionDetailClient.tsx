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
  const [pilotView, setPilotView] = useState<"admin" | "leader" | "player">("admin");
  const [pilotFinished, setPilotFinished] = useState(false);
  const [pilotPhotoSkipped, setPilotPhotoSkipped] = useState(false);
  const [pilotStep, setPilotStep] = useState<"attendance" | "mode" | "teams" | "result" | "photo" | "winner">("attendance");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`strikr-wizard-${props.sessionId}`);
      if (saved && ["attendance", "mode", "teams", "result", "photo", "winner"].includes(saved)) setPilotStep(saved as typeof pilotStep);
    } catch { /* Private browsing can disable storage. */ }
  }, [props.sessionId]);
  useEffect(() => {
    try { window.localStorage.setItem(`strikr-wizard-${props.sessionId}`, pilotStep); } catch { /* Storage is optional. */ }
  }, [props.sessionId, pilotStep]);
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

  const pilotAdmin = props.initialIsClubAdmin === true;
  const playerPreview = !isAdmin || (pilotAdmin && pilotView === "player");
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
        />

        {err ? <NoticeCard tone="error">{err}</NoticeCard> : null}
        {msg ? <NoticeCard tone="success">{msg}</NoticeCard> : null}

        {playerPreview ? <div className="space-y-4"><div className="rounded-xl border border-slate-200 bg-white p-3"><h2 className="mb-2 text-base font-bold text-slate-950">Anwesenheiten</h2><p className="mb-3 text-xs text-slate-500">Alle Zusagen im Überblick. Nur deine eigene Teilnahme kannst du ändern.</p>{renderAttendance()}</div>{teamsComplete ? <SessionTeamsCard teamA={displayTeamA} teamB={displayTeamB} unassigned={displayUnassigned} metaA={metaA} metaB={metaB} hasResult={hasResult} saving={false} teamsComplete={teamsComplete} teamsConfirmed={teamsConfirmed} canShareLineup={false} sharingLineup={false} collapsed={false} attendanceDirty={false} enableFieldView={useFieldView} readOnly onToggleCollapsed={() => {}} onGenerateTeams={() => {}} onConfirmTeams={() => {}} onShareLineup={() => {}} onSetSide={() => {}} /> : null}{hasResult ? <div className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="mb-2 text-base font-bold">Ergebnisse</h2>{results.map(r => <div key={r.id} className="py-1 text-sm">Spiel {r.game_no}: {r.goals_team_a ?? "–"} : {r.goals_team_b ?? "–"}</div>)}</div> : null}</div> : true && isAdmin && isTrainingSession ? (() => {
          const steps = [
            { key: "attendance" as const, title: "Anwesenheit", done: !attendanceDirty && presentPlayers.length >= 2, summary: `${presentPlayers.length} Spieler dabei` },
            { key: "mode" as const, title: "Spielmodus", done: isTournamentMode || teamsComplete || hasResult, summary: isTournamentMode ? "Turniermodus" : "Normales Spiel" },
            ...(!isTournamentMode ? [
              { key: "teams" as const, title: "Teams erstellen", done: teamsComplete && teamsConfirmed, summary: `${displayTeamA.length} : ${displayTeamB.length} Spieler` },
              { key: "result" as const, title: "Spiele & Ergebnisse", done: hasResult, summary: `${results.length} Ergebnis(se) erfasst` },
              { key: "photo" as const, title: "Siegerfoto", done: hasWinnerPhoto || pilotPhotoSkipped || (hasResult && !dayWinnerSide), summary: hasWinnerPhoto ? "Foto vorhanden" : "Optional" },
            ] : [
              { key: "result" as const, title: "Turnier durchführen", done: Boolean(session.tournament_completed_at), summary: session.tournament_completed_at ? "Turnier abgeschlossen" : "Spielplan & Ergebnisse" },
              { key: "photo" as const, title: "Siegerfoto", done: hasWinnerPhoto || pilotPhotoSkipped, summary: hasWinnerPhoto ? "Foto vorhanden" : pilotPhotoSkipped ? "Ohne Foto fortgesetzt" : "Optional" },
              { key: "winner" as const, title: "Siegercard", done: false, summary: "Turniersieg ansehen" },
            ]),
          ];
          const current = steps.find(s => !s.done)?.key ?? steps[steps.length - 1].key;
          const selected = steps.some(s => s.key === pilotStep) ? pilotStep : current;
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
                {!isTournamentMode && !hasResult ? <SessionTournamentCard sessionId={props.sessionId} enabled={false} isAdmin={isAdmin} presentCount={presentPlayers.length} hasNormalResult={false} onActivated={() => { setPilotStep("result"); setTournamentWizardStage("teams"); router.refresh(); }} wizardControl={setupWizardRef} onWizardReady={setSetupWizardReady} /> : null}
              </div>
            </div>;
                        if (key === "teams") return renderTeams();
            if (key === "result") return isTournamentMode
              ? <SessionTournamentCard sessionId={props.sessionId} enabled={true} isAdmin={isAdmin} presentCount={presentPlayers.length} hasNormalResult={false} onActivated={() => router.refresh()} tournamentWizardControl={tournamentWizardRef} onTournamentWizardChange={(stage, ready) => { setTournamentWizardStage(stage); setTournamentTeamsReady(ready); }} onFinalized={() => { setPilotStep("photo"); router.refresh(); }} />
              : <div className="space-y-3"><SessionGameTimerLoader sessionId={props.sessionId} />{renderResult()}</div>;
            if (key === "photo") return isTournamentMode && session.tournament_completed_at
              ? <SessionWinnerPhotoCard sessionId={props.sessionId} hasResult={hasResult} saving={saving} photoBusy={photoBusy} collapsed={false} canUploadWinnerPhoto={canUploadWinnerPhoto} winnerPhotoUrl={winnerPhotoUrl} hasWinnerPhoto={hasWinnerPhoto} winnerPhotoInputRef={winnerPhotoInputRef} onWinnerPhotoUpload={handleWinnerPhotoUpload} onWinnerPhotoDelete={handleWinnerPhotoDelete} onToggleCollapsed={() => setWinnerPhotoCollapsed(prev => !prev)} title={t("sessionDetail.winnerPhoto")} />
              : <div className="space-y-3">{hasResult && dayWinnerSide ? <SessionWinnerPhotoCard sessionId={props.sessionId} hasResult={hasResult} saving={saving} photoBusy={photoBusy} collapsed={false} canUploadWinnerPhoto={canUploadWinnerPhoto} winnerPhotoUrl={winnerPhotoUrl} hasWinnerPhoto={hasWinnerPhoto} winnerPhotoInputRef={winnerPhotoInputRef} onWinnerPhotoUpload={handleWinnerPhotoUpload} onWinnerPhotoDelete={handleWinnerPhotoDelete} onToggleCollapsed={() => {}} title={t("sessionDetail.winnerPhoto")} /> : <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Bitte zuerst ein Ergebnis mit Sieger erfassen.</p>}</div>;
            if (key === "winner") return <TournamentWinnerCard sessionId={props.sessionId} photoUrl={winnerPhotoUrl} onBack={() => setPilotStep("result")} />;
            return null;
          };
          return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.07)]">
            <div className="relative bg-slate-950 px-4 py-3 text-white sm:px-5">
              <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-300">Session-Assistent</span><span className="text-xs text-slate-300">Schritt {selectedIndex + 1} von {steps.length}</span></div>
              <nav aria-label="Session-Schritte" className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">{steps.map((s,i)=><button type="button" key={s.key} onClick={()=>setPilotStep(s.key)} aria-current={i===selectedIndex?"step":undefined} className={`min-h-16 rounded-lg border px-2 py-2 text-left text-[11px] font-semibold transition ${i===selectedIndex?"border-teal-400 bg-teal-400 text-slate-950":s.done?"border-emerald-400 bg-emerald-900 text-emerald-100":"border-slate-700 bg-slate-900 text-slate-300"}`}><span className="block text-[10px] opacity-70">{s.done?"✓":i+1}</span>{s.title}</button>)}</nav>
              <h2 className="mt-2 text-base font-extrabold tracking-tight">{steps[selectedIndex].title}</h2>

            </div>
            <div className="space-y-4 p-4 sm:p-5">

              {pilotFinished ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">✓ Session abgeschlossen. Du kannst alle Schritte weiterhin ansehen oder bearbeiten.</div> : null}
              {selected === "photo" && !isTournamentMode && hasResult ? <div className="overflow-hidden rounded-2xl bg-slate-950 p-5 text-center text-white shadow-lg"><div className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-300">Spielergebnis</div><div className="mt-3 text-5xl font-black tabular-nums tracking-tight">{scoreAValue} <span className="text-teal-400">:</span> {scoreBValue}</div>{winnerPhotoUrl ? <img src={winnerPhotoUrl} alt="Siegerfoto" className="mx-auto mt-4 max-h-72 w-full rounded-xl object-contain" /> : null}<button type="button" onClick={() => setShowSessionEndModal(true)} className="mt-4 rounded-lg bg-teal-400 px-5 py-2.5 text-sm font-bold text-slate-950">{hasWinnerPhoto ? "Ergebnis und Siegerfoto teilen ↗" : "Ergebnis ohne Foto teilen ↗"}</button></div> : null}
              <div className="rounded-lg border-l-4 border-teal-500 bg-teal-50 p-2 shadow-[0_8px_28px_rgba(13,148,136,0.12)] sm:p-4">{renderStep(selected)}</div>
              {selected === "attendance" && (attendanceDirty || presentPlayers.length < 2) ? <p className="text-xs font-semibold text-amber-800">Zum Fortfahren mindestens zwei Teilnehmer auswählen und offene Änderungen speichern.</p> : null}
              {selected === "teams" && !teamsComplete ? <p className="text-xs font-semibold text-amber-800">Bitte zuerst beide Teams vollständig zusammenstellen.</p> : null}
              {selected === "teams" && teamsComplete && !teamsConfirmed ? <p className="text-xs font-semibold text-amber-800">Bitte die Teams zuerst in der Teamansicht bestätigen. Danach geht es bewusst mit „Fertig & weiter“ weiter.</p> : null}
              <button type="button" onClick={()=>{if (selected === "mode" && !isTournamentMode) { if (setupWizardRef.current) { setupWizardRef.current.next(); } else { setPilotStep("teams"); } return; } if (selected === "result" && isTournamentMode && tournamentWizardStage === "teams") { tournamentWizardRef.current?.next(); return; } const next=steps[selectedIndex+1];if(next)setPilotStep(next.key);else { setPilotPhotoSkipped(!hasWinnerPhoto); setPilotFinished(true); if (!isTournamentMode && allowResult) setShowSessionEndModal(true); }}} disabled={(selectedIndex === steps.length-1 && pilotFinished) || (selected === "attendance" && (attendanceDirty || presentPlayers.length < 2)) || (selected === "mode" && !isTournamentMode && setupWizardRef.current !== null && !setupWizardReady) || (selected === "teams" && !isTournamentMode && (!teamsComplete || !teamsConfirmed || saving || savingTeams)) || (selected === "result" && isTournamentMode && (tournamentWizardStage === "teams" ? !tournamentTeamsReady : !session.tournament_completed_at))} className="w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-bold text-white disabled:opacity-40">{selected === "mode" && !isTournamentMode ? (setupWizardRef.current?.label ?? "Fertig & weiter →") : selected === "result" && isTournamentMode && tournamentWizardStage === "teams" ? "Fertig · Turnier starten →" : selectedIndex === steps.length-1 ? "Session abschließen ✓" : "Fertig & weiter →"}</button>

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
