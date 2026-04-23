"use client";

import Image from "next/image";
import PageHero from "@/components/ui/PageHero";
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
  hasResult,
  isAdmin,
  deletingSession,
  primaryColorKey,
  onDeleteSession,
  onBack,
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
  if (hasResult) {
    return (
      <section className="overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0b1220_46%,_#273449_100%)] shadow-sm ring-1 ring-black/5">
        <div className="p-4">
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
                {sessionType === "event" ? "Event" : "Training"}
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

            <div className="shrink-0">
              <button
                type="button"
                onClick={onOpenResultModal}
                className="inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/12 backdrop-blur-sm transition hover:bg-white/14"
              >
                🔥 Ergebnis teilen
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <PageHero
      primaryColorKey={primaryColorKey}
      eyebrow={sessionType === "event" ? "Event" : "Training"}
      title={fmtLongDate(date)}
      description={notes ?? null}
      backLabel="Zurück"
      onBack={onBack}
      topRightSlot={
        isAdmin ? (
          <SessionTypeSwitcher
            sessionId={sessionId}
            currentType={sessionType}
            action={onSessionTypeChange}
            disabled={!sessionTypesEnabled}
            embedded
          />
        ) : null
      }
      actionsSlot={
        <>
          {isAdmin ? (
            <button
              type="button"
              onClick={onDeleteSession}
              disabled={deletingSession}
              className="inline-flex min-h-7 items-center justify-center rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-semibold text-white/76 transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deletingSession ? "Löscht..." : "Löschen"}
            </button>
          ) : null}

          {hasResult ? (
            <div className="inline-flex min-h-7 items-center justify-center rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/88">
              Ergebnis gespeichert
            </div>
          ) : null}
        </>
      }
      compact
    />
  );
}