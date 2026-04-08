import {
  formatGermanDate,
  outcomeClasses,
  outcomeLabel,
  type RecentResult,
} from "@/lib/stats/utils";

type RecentResultsCardProps = {
  results: RecentResult[];
};

export default function RecentResultsCard({
  results,
}: RecentResultsCardProps) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">
            Letzte Ergebnisse
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Deine letzten 5 bewerteten Sessions
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Noch keine gespeicherten Ergebnisse vorhanden.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {results.map((item) => (
            <div
              key={`${item.sessionId}-${item.scoreLabel}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {formatGermanDate(item.date)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {item.myTeamLabel} · Ergebnis {item.scoreLabel}
                </div>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${outcomeClasses(
                  item.outcome
                )}`}
              >
                {outcomeLabel(item.outcome)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}