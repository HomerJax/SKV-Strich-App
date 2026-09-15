"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Frown, Trophy, UsersRound } from "lucide-react";
import { useSearchParams } from "next/navigation";

type TeammateStat = {
  playerId: number;
  name: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
};

type ExtendedStatsResponse = {
  enabled: boolean;
  bestMonth: null | {
    label: string;
    wins: number;
    losses: number;
    draws: number;
    games: number;
  };
  teammates: null | {
    mostPlayed: TeammateStat[];
    mostWins: TeammateStat[];
    mostLosses: TeammateStat[];
  };
};

function TeammateRanking({
  eyebrow,
  stats,
  valueLabel,
  icon,
}: {
  eyebrow: string;
  stats: TeammateStat[];
  valueLabel: (stat: TeammateStat) => string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
          {eyebrow}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-white">
          {icon}
        </div>
      </div>

      {stats.length > 0 ? (
        <div className="mt-4 space-y-2">
          {stats.map((stat, index) => (
            <div key={stat.playerId} className="rounded-2xl bg-slate-50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 truncate text-sm font-black text-slate-950">
                  <span className="mr-2 text-slate-400">#{index + 1}</span>
                  {stat.name}
                </div>
                <div className="shrink-0 text-xs font-black text-slate-700">
                  {valueLabel(stat)}
                </div>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {stat.games} Spiele · {stat.wins} S · {stat.draws} U · {stat.losses} N
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-sm text-slate-500">Noch nicht genug Daten.</div>
      )}
    </div>
  );
}

export default function ExtendedPersonalStats() {
  const searchParams = useSearchParams();
  const scope = searchParams.get("scope") === "career" ? "career" : "season";
  const [data, setData] = useState<ExtendedStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const url = useMemo(() => `/api/stats/extended?scope=${scope}`, [scope]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetch(url, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("extended-stats-failed");
        return (await response.json()) as ExtendedStatsResponse;
      })
      .then(setData)
      .catch((error) => {
        if (error?.name !== "AbortError") setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [url]);

  if (loading) {
    return (
      <section className="bg-neutral-100 px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-5 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-40 animate-pulse rounded-[24px] bg-slate-100" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!data?.enabled) return null;

  const bestMonth = data.bestMonth;
  const teammates = data.teammates;

  return (
    <section className="bg-neutral-100 px-4 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
            Persönliche Auswertung
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
            Erweiterte persönliche Stats
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            Dein stärkster Monat und jeweils die Top 3 Mitspieler, mit denen du am meisten gespielt, gewonnen oder verloren hast.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                Stärkster Monat
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <CalendarDays className="h-4 w-4" />
              </div>
            </div>

            {bestMonth ? (
              <>
                <div className="mt-4 text-xl font-black capitalize tracking-tight text-slate-950">
                  {bestMonth.label}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-700">
                  {bestMonth.wins} Siege aus {bestMonth.games} Ergebnissen
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  {bestMonth.wins} S · {bestMonth.draws} U · {bestMonth.losses} N
                </div>
              </>
            ) : (
              <div className="mt-4 text-sm text-slate-500">Noch nicht genug Ergebnisse.</div>
            )}
          </div>

          <TeammateRanking
            eyebrow="Am meisten zusammen"
            stats={teammates?.mostPlayed ?? []}
            valueLabel={(stat) => `${stat.games} Spiele`}
            icon={<UsersRound className="h-4 w-4" />}
          />

          <TeammateRanking
            eyebrow="Am meisten gewonnen"
            stats={teammates?.mostWins ?? []}
            valueLabel={(stat) => `${stat.wins} Siege`}
            icon={<Trophy className="h-4 w-4" />}
          />

          <TeammateRanking
            eyebrow="Am meisten verloren"
            stats={teammates?.mostLosses ?? []}
            valueLabel={(stat) => `${stat.losses} Niederlagen`}
            icon={<Frown className="h-4 w-4" />}
          />
        </div>
      </div>
    </section>
  );
}
