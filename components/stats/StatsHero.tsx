import {
  Footprints,
  Trophy,
  ShieldX,
  Scale,
  Medal,
} from "lucide-react";

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

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
  borderClassName?: string;
  accentClassName?: string;
  icon: React.ComponentType<{ className?: string }>;
};

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0,0";
  return value.toFixed(1).replace(".", ",");
}

function formatRate(value: number) {
  if (!Number.isFinite(value)) return "0,0";
  return value.toFixed(1).replace(".", ",");
}

function StatCard({
  label,
  value,
  hint,
  valueClassName = "text-slate-950",
  borderClassName = "border-slate-200",
  accentClassName = "bg-slate-200 text-slate-700",
  icon: Icon,
}: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border bg-white px-4 py-4 shadow-sm ${borderClassName}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
          <Icon className={`h-5 w-5 ${accentClassName.split(" ").find((c) => c.startsWith("text-")) ?? "text-slate-700"}`} />
        </div>

        <div
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${accentClassName
            .split(" ")
            .find((c) => c.startsWith("bg-")) ?? "bg-slate-200"}`}
          aria-hidden="true"
        />
      </div>

      <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>

      <div className={`mt-2 text-4xl font-bold leading-none ${valueClassName}`}>
        {value}
      </div>

      {hint ? (
        <div className="mt-3 text-xs leading-5 text-slate-500">{hint}</div>
      ) : null}
    </div>
  );
}

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
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Spieler
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          Meine Stats
        </h2>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard
          label="Einsätze"
          value={String(sessionsPlayed)}
          hint="Gespeicherte Sessions"
          valueClassName="text-slate-950"
          borderClassName="border-slate-200"
          accentClassName="bg-slate-200 text-slate-700"
          icon={Footprints}
        />

        <StatCard
          label="Siege"
          value={String(wins)}
          hint={
            completedResults > 0
              ? `${formatPercent((wins / completedResults) * 100)}% Erfolgsquote`
              : "Noch keine Ergebnisse"
          }
          valueClassName="text-emerald-700"
          borderClassName="border-emerald-200"
          accentClassName="bg-emerald-200 text-emerald-700"
          icon={Trophy}
        />

        <StatCard
          label="Niederlagen"
          value={String(losses)}
          hint={
            completedResults > 0
              ? `${formatPercent((losses / completedResults) * 100)}% der Ergebnisse`
              : "Noch keine Ergebnisse"
          }
          valueClassName="text-rose-700"
          borderClassName="border-rose-200"
          accentClassName="bg-rose-200 text-rose-700"
          icon={ShieldX}
        />

        <StatCard
          label="Unentschieden"
          value={String(draws)}
          hint={
            completedResults > 0
              ? `${formatPercent((draws / completedResults) * 100)}% der Ergebnisse`
              : "Noch keine Ergebnisse"
          }
          valueClassName="text-amber-700"
          borderClassName="border-amber-200"
          accentClassName="bg-amber-200 text-amber-700"
          icon={Scale}
        />
      </div>

      {showMvp ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Medal className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                MVP Übersicht
              </div>
              <div className="mt-1 text-lg font-bold text-slate-950">
                {mvpWins} {mvpWins === 1 ? "MVP-Erfolg" : "MVP-Erfolge"}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {formatRate(mvpPerGame)} pro Einsatz
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}