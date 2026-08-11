"use client";

import Image from "next/image";
import SessionTypeSwitcher from "@/components/sessions/SessionTypeSwitcher";

type SessionType = "training" | "event";

type Props = {
  sessionId: number;
  date: string;
  notes: string | null;
  presentCount: number;
  teamACount: number;
  teamBCount: number;
  hasResult: boolean;
  nextStepLabel: string;
  isAdmin: boolean;
  deletingSession: boolean;
  primaryColorKey?: string | null;
  onDeleteSession: () => void;
  onBack: () => void;
  onScrollToTeams: () => void;
  onScrollToResult: () => void;
  onOpenResultModal?: () => void;
  sessionType: SessionType;
  sessionTypesEnabled: boolean;
  onSessionTypeChange: (formData: FormData) => void | Promise<void>;
  scoreA?: number;
  scoreB?: number;
  hasWinnerPhoto?: boolean;
  winnerPhotoUrl?: string | null;
  mvpVotingEnabled?: boolean;
};

function fmtLongDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

function StatusPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-400/12 text-emerald-50 ring-1 ring-emerald-300/18"
      : tone === "warning"
        ? "bg-amber-400/14 text-amber-50 ring-1 ring-amber-300/18"
        : "bg-white/10 text-white/88 ring-1 ring-white/10";

  return (
    <div
      className={`inline-flex min-h-7 items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-white/10 bg-white/[0.07] px-3.5 py-3 backdrop-blur-sm">
      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/42">
        {label}
      </div>
      <div className="mt-1 truncate text-lg font-extrabold tracking-tight text-white">
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 truncate text-[10px] font-medium text-white/48">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function WinnerPhotoPreview({
  winnerPhotoUrl,
}: {
  winnerPhotoUrl: string | null;
}) {
  if (!winnerPhotoUrl) {
    return (
      <div className="flex h-[88px] w-[78px] shrink-0 items-center justify-center rounded-[18px] bg-white/6 ring-1 ring-white/10 backdrop-blur-sm sm:h-[104px] sm:w-[92px]">
        <div className="px-2 text-center">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/42">
            Foto
          </div>
          <div className="mt-1 text-[10px] font-medium text-white/58">Keins</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[88px] w-[78px] shrink-0 overflow-hidden rounded-[18px] ring-1 ring-white/10 sm:h-[104px] sm:w-[92px]">
      <Image
        src={winnerPhotoUrl}
        alt="Siegerfoto"
        fill
        sizes="92px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent" />
      <div className="absolute bottom-1.5 left-1.5 rounded-full bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
        Foto
      </div>
    </div>
  );
}

export default function SessionHeaderCard({
  sessionId,
  date,
  notes,
  presentCount,
  teamACount,
  teamBCount,
  hasResult,
  nextStepLabel,
  isAdmin,
  deletingSession,
  onDeleteSession,
  onBack,
  onScrollToTeams,
  onScrollToResult,
  onOpenResultModal,
  sessionType,
  sessionTypesEnabled,
  onSessionTypeChange,
  scoreA = 0,
  scoreB = 0,
  hasWinnerPhoto = false,
  winnerPhotoUrl = null,
  mvpVotingEnabled = false,
}: Props) {
  const isEvent = sessionType === "event";
  const hasTeams = teamACount > 0 || teamBCount > 0;

  if (hasResult) {
    return (
      <section className="overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0b1220_46%,_#273449_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.14)] ring-1 ring-black/5">
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-8 items-center justify-center rounded-full bg-white/8 px-3 py-1 text-sm font-semibold text-white/92 ring-1 ring-white/10 transition hover:bg-white/12"
            >
              ← Zurück
            </button>

            <SessionTypeSwitcher
              sessionId={sessionId}
              currentType={sessionType}
              action={onSessionTypeChange}
              disabled={!sessionTypesEnabled}
              embedded
            />
          </div>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/54">
                {isEvent ? "Event" : "Training abgeschlossen"}
              </div>

              <div className="mt-2 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                {fmtLongDate(date)}
              </div>

              {notes ? (
                <div className="mt-1.5 max-w-2xl text-sm leading-5 text-white/70">
                  {notes}
                </div>
              ) : null}

              <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/48">
                Ergebnis
              </div>

              <div className="mt-1.5 text-5xl font-extrabold leading-none tracking-tight text-white sm:text-6xl">
                {scoreA}:{scoreB}
              </div>
            </div>

            <WinnerPhotoPreview winnerPhotoUrl={winnerPhotoUrl} />
          </div>

          {!isEvent ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Metric label="Dabei" value={presentCount} hint="Spieler" />
              <Metric
                label="Teams"
                value={hasTeams ? `${teamACount}:${teamBCount}` : "–"}
                hint="Spieler verteilt"
              />
              <div className="col-span-2 sm:col-span-1">
                <Metric
                  label="Status"
                  value={mvpVotingEnabled ? "MVP läuft" : "Fertig"}
                  hint={hasWinnerPhoto ? "Foto gespeichert" : "Session gespeichert"}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusPill tone="success">Ergebnis gespeichert</StatusPill>
            {hasWinnerPhoto ? (
              <StatusPill tone="success">Siegerfoto vorhanden</StatusPill>
            ) : null}
            {mvpVotingEnabled ? (
              <StatusPill tone="warning">MVP läuft</StatusPill>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={onDeleteSession}
                  disabled={deletingSession}
                  className="inline-flex min-h-8 items-center justify-center rounded-full bg-white/8 px-3 py-1 text-[11px] font-semibold text-white/76 ring-1 ring-white/10 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingSession ? "Löscht..." : "Löschen"}
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onOpenResultModal}
              className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-slate-100"
            >
              Ergebnis teilen ↗
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_84%_8%,_rgba(59,130,246,0.18),_transparent_26%),linear-gradient(145deg,_#020617_0%,_#0b1220_54%,_#172033_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.14)] ring-1 ring-black/5">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-8 items-center justify-center rounded-full bg-white/8 px-3 py-1 text-sm font-semibold text-white/92 ring-1 ring-white/10 transition hover:bg-white/12"
          >
            ← Zurück
          </button>

          {isAdmin ? (
            <SessionTypeSwitcher
              sessionId={sessionId}
              currentType={sessionType}
              action={onSessionTypeChange}
              disabled={!sessionTypesEnabled}
              embedded
            />
          ) : null}
        </div>

        <div className="mt-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/44">
            {isEvent ? "Event" : "Training läuft"}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-white sm:text-3xl">
            {fmtLongDate(date)}
          </h1>
          {notes ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">{notes}</p>
          ) : null}
        </div>

        <div className={`mt-5 grid gap-2 ${isEvent ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
          <Metric label="Dabei" value={presentCount} hint={isEvent ? "Teilnehmer" : "Spieler"} />
          {!isEvent ? (
            <Metric
              label="Teams"
              value={hasTeams ? `${teamACount}:${teamBCount}` : "offen"}
              hint={hasTeams ? "Spieler verteilt" : "noch nicht bestätigt"}
            />
          ) : null}
          <div className={isEvent ? "" : "col-span-2 sm:col-span-1"}>
            <Metric label="Als Nächstes" value={nextStepLabel} />
          </div>
        </div>

        {!isEvent ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onScrollToTeams}
              className="inline-flex min-h-9 items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-slate-100"
            >
              {hasTeams ? "Teams ansehen" : "Zu den Teams"}
            </button>
            {hasTeams ? (
              <button
                type="button"
                onClick={onScrollToResult}
                className="inline-flex min-h-9 items-center justify-center rounded-full bg-white/8 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/12"
              >
                Zum Ergebnis
              </button>
            ) : null}
          </div>
        ) : null}

        {isAdmin ? (
          <div className="mt-4 border-t border-white/8 pt-3">
            <button
              type="button"
              onClick={onDeleteSession}
              disabled={deletingSession}
              className="text-[11px] font-semibold text-white/45 transition hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deletingSession ? "Session wird gelöscht..." : "Session löschen"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
