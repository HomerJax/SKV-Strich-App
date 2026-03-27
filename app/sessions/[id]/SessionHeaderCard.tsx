type SessionHeaderCardProps = {
  date: string;
  notes: string | null;
  presentCount: number;
  teamACount: number;
  teamBCount: number;
  hasResult: boolean;
  nextStepLabel: string;
  isAdmin: boolean;
  deletingSession: boolean;
  onDeleteSession?: () => void;
  onScrollToTeams?: () => void;
  onScrollToResult?: () => void;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function SessionHeaderCard({
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
  onScrollToTeams,
  onScrollToResult,
}: SessionHeaderCardProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              Trainingssession
            </div>

            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              {formatDate(date)}
            </h1>

            {notes ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
                {notes}
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-white/60">
                Kein zusätzlicher Hinweis für diese Session hinterlegt.
              </p>
            )}
          </div>

          <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
            {hasResult ? "Ergebnis gespeichert" : nextStepLabel}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-5 py-5 sm:px-6">
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Anwesend
          </div>
          <div className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            {presentCount}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Team A
          </div>
          <div className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            {teamACount}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Team B
          </div>
          <div className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            {teamBCount}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:flex-wrap sm:px-6">
        {onScrollToTeams ? (
          <button
            type="button"
            onClick={onScrollToTeams}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Zu den Teams
          </button>
        ) : null}

        {onScrollToResult ? (
          <button
            type="button"
            onClick={onScrollToResult}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Zum Ergebnis
          </button>
        ) : null}

        {isAdmin && onDeleteSession ? (
          <button
            type="button"
            onClick={onDeleteSession}
            disabled={deletingSession}
            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:ml-auto"
          >
            {deletingSession ? "Löscht..." : "Session löschen"}
          </button>
        ) : null}
      </div>
    </section>
  );
}