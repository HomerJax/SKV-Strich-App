import { percentage, formatRatio } from "@/lib/stats/utils";

type StatsHeroProps = {
  sessionsPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  completedResults: number;
  showMvp: boolean;
  mvpWins: number;
  mvpPerGame: number;
};

export default function StatsHero({
  sessionsPlayed,
  wins,
  losses,
  draws,
  completedResults,
  showMvp,
  mvpWins,
  mvpPerGame,
}: StatsHeroProps) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        Spieler
      </div>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
        Meine Stats
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Deine persönliche Übersicht auf Basis gespeicherter Sessions und Ergebnisse.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Einsätze
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            {sessionsPlayed}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Siege
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-emerald-900">
            {wins}
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            Niederlagen
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-rose-900">
            {losses}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Unentschieden
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-amber-900">
            {draws}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Siegquote
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            {percentage(wins, completedResults)}
          </div>
        </div>

        {showMvp ? (
          <>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                MVPs
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight text-amber-900">
                {mvpWins}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                MVP / Spiel
              </div>
              <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {formatRatio(mvpPerGame)}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}