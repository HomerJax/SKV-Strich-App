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
    <div>
      {results.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Noch keine gespeicherten Ergebnisse vorhanden.
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((item) => (
            <div
              key={`${item.sessionId}-${item.scoreLabel}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
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
    </div>
  );
}