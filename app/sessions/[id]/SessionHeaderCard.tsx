import { getClubHeroStyles } from "@/lib/ui/hero";

type Props = {
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
  onScrollToTeams: () => void;
  onScrollToResult: () => void;
};

function fmtLongDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
  primaryColorKey,
  onDeleteSession,
  onScrollToTeams,
  onScrollToResult,
}: Props) {
  const { heroGradient, borderColor } = getClubHeroStyles(primaryColorKey);

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
      <div
        className="border-b text-white"
        style={{
          borderColor,
          background: heroGradient,
        }}
      >
        <div className="p-5 sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            Trainingssession
          </div>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {fmtLongDate(date)}
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-white/80">
            {notes?.trim() || "Kein zusätzlicher Hinweis für diese Session hinterlegt."}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              {hasResult ? "Ergebnis gespeichert" : nextStepLabel}
            </div>

            <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 shadow-sm">
              {presentCount} anwesend
            </div>

            {teamACount > 0 || teamBCount > 0 ? (
              <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 shadow-sm">
                {teamACount} vs {teamBCount}
              </div>
            ) : null}

            {isAdmin ? (
              <button
                type="button"
                onClick={onDeleteSession}
                disabled={deletingSession}
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-transparent px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingSession ? "Löscht..." : "Session löschen"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onScrollToTeams}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Zu den Teams
          </button>

          <button
            type="button"
            onClick={onScrollToResult}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Zum Ergebnis
          </button>
        </div>
      </div>
    </section>
  );
}