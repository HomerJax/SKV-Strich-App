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

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[24px] bg-slate-50 p-5">
      <div className="text-sm font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">
        {value}
      </div>
    </div>
  );
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
        <div className="p-6 sm:p-7">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            Trainingssession
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {fmtLongDate(date)}
          </h1>

          <p className="mt-4 text-base text-white/80">
            {notes?.trim() || "Kein zusätzlicher Hinweis für diese Session hinterlegt."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm">
              {hasResult ? "Ergebnis gespeichert" : nextStepLabel}
            </div>

            {isAdmin ? (
              <button
                type="button"
                onClick={onDeleteSession}
                disabled={deletingSession}
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-transparent px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingSession ? "Löscht..." : "Session löschen"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <StatCard label="Anwesend" value={presentCount} />
        <StatCard label="Team A" value={teamACount} />
        <StatCard label="Team B" value={teamBCount} />
      </div>

      <div className="border-t border-slate-200 p-5">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onScrollToTeams}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Zu den Teams
          </button>

          <button
            type="button"
            onClick={onScrollToResult}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Zum Ergebnis
          </button>
        </div>
      </div>
    </section>
  );
}