type SessionHeaderCardProps = {
  date: string;
  notes: string | null;
  presentCount: number;
  teamACount: number;
  teamBCount: number;
  hasResult: boolean;
  nextStepLabel: string;
  onScrollToTeams: () => void;
  onScrollToResult: () => void;
};

export default function SessionHeaderCard({
  date,
  notes,
  presentCount,
  teamACount,
  teamBCount,
  hasResult,
  nextStepLabel,
  onScrollToTeams,
  onScrollToResult,
}: SessionHeaderCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div>
            <h1 className="text-xl font-semibold">
              Training {new Date(date).toLocaleDateString("de-DE")}
            </h1>
            {notes ? (
              <div className="mt-1 text-sm text-slate-500">{notes}</div>
            ) : (
              <div className="mt-1 text-sm text-slate-400">
                Keine Notiz hinterlegt
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">
              Anwesend: {presentCount}
            </span>
            <span className="rounded-full border bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">
              Team 1: {teamACount}
            </span>
            <span className="rounded-full border bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">
              Team 2: {teamBCount}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
                hasResult
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {hasResult ? "Ergebnis gespeichert" : "Ergebnis offen"}
            </span>
          </div>
        </div>

        <div className="rounded-xl border bg-slate-50 p-3 lg:min-w-[280px]">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Nächster Schritt
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {nextStepLabel}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Springe direkt zum passenden Bereich.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onScrollToTeams}
              className="rounded-lg border bg-white px-3 py-1.5 text-xs shadow-sm"
            >
              Zu den Teams
            </button>
            <button
              type="button"
              onClick={onScrollToResult}
              className="rounded-lg border bg-white px-3 py-1.5 text-xs shadow-sm"
            >
              Zum Ergebnis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}