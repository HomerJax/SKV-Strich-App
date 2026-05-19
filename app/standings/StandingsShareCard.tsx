"use client";

import { getPlayerDisplayName } from "@/lib/player-display";
import type { RankRow } from "./standings-types";
import { getTrainingAwards, movementClass, movementText } from "./standings-ui";

type StandingsShareCardProps = {
  exportId: string;
  selectedLabel: string;
  startRank: number;
  endRank: number;
  rows: RankRow[];
};

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-center backdrop-blur">
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
        {label}
      </div>
      <div className="mt-1 text-lg font-black leading-none text-white">
        {value}
      </div>
    </div>
  );
}

function MiniRow({ row, index }: { row: RankRow; index: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
          {row.rank}
        </div>

        <div className="min-w-0">
          <div className="truncate text-sm font-black tracking-tight text-slate-950">
            {getPlayerDisplayName(row)}
          </div>
          <div className={`mt-0.5 text-[10px] font-bold ${movementClass(row.deltaRank)}`}>
            {movementText(row.deltaRank)}
          </div>

          {getTrainingAwards(row).length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {getTrainingAwards(row)
                .slice(0, 2)
                .map((award) => (
                  <span
                    key={award.key}
                    className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-black text-slate-600"
                  >
                    {award.icon} {award.shortLabel}
                  </span>
                ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-sm font-black text-slate-950">{row.wins}</div>
        <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
          Siege
        </div>
      </div>
    </div>
  );
}

export default function StandingsShareCard({
  exportId,
  selectedLabel,
  startRank,
  endRank,
  rows,
}: StandingsShareCardProps) {
  const rangeLabel =
    startRank === endRank
      ? `Platz ${startRank}`
      : `Plätze ${startRank}–${endRank}`;

  const topThree = rows.slice(0, 3);
  const leader = topThree[0];
  const rest = rows.slice(3, 10);

  return (
    <div
      id={exportId}
      className="w-[390px] overflow-hidden rounded-[34px] border border-slate-200 bg-slate-950 shadow-2xl"
    >
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(135deg,#020617_0%,#0f172a_52%,#111827_100%)] px-5 pb-5 pt-5 text-white">
        <div className="absolute -right-20 top-10 h-56 w-56 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
              strikr standings
            </div>
            <div className="mt-2 text-3xl font-black leading-none tracking-[-0.06em]">
              Tabelle.
            </div>
            <div className="mt-1 truncate text-sm font-bold text-white/55">
              {selectedLabel}
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-right backdrop-blur">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/40">
              Stand
            </div>
            <div className="mt-1 text-[11px] font-bold text-white/80">
              {new Date().toLocaleDateString("de-DE")}
            </div>
          </div>
        </div>

        <div className="relative mt-5 rounded-[26px] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                Ranking-Bereich
              </div>
              <div className="mt-1 text-4xl font-black leading-none tracking-[-0.07em]">
                {rangeLabel}
              </div>
            </div>

            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-black text-white/70">
              Top {Math.min(rows.length, 10)}
            </div>
          </div>
        </div>

        {leader ? (
          <div className="relative mt-5 rounded-[30px] border border-white/12 bg-white px-4 py-4 text-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Spitzenreiter
                </div>
                <div className="mt-2 truncate text-4xl font-black leading-none tracking-[-0.08em]">
                  {getPlayerDisplayName(leader)}
                </div>
                <div className={`mt-2 text-xs font-black ${movementClass(leader.deltaRank)}`}>
                  {movementText(leader.deltaRank)}
                </div>

                {getTrainingAwards(leader).length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {getTrainingAwards(leader)
                      .slice(0, 3)
                      .map((award) => (
                        <span
                          key={award.key}
                          className="rounded-full bg-slate-950 px-2 py-1 text-[9px] font-black text-white"
                        >
                          {award.icon} {award.shortLabel}
                        </span>
                      ))}
                  </div>
                ) : null}
              </div>

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-slate-950 text-3xl font-black text-white">
                {leader.rank}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-center">
                <div className="text-xl font-black text-slate-950">{leader.wins}</div>
                <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                  Siege
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-center">
                <div className="text-xl font-black text-slate-950">{leader.mvps}</div>
                <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                  MVPs
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-center">
                <div className="text-xl font-black text-slate-950">{leader.sessions}</div>
                <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                  Teiln.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {topThree.length > 1 ? (
          <div className="relative mt-3 grid grid-cols-2 gap-3">
            {topThree.slice(1).map((row) => (
              <div
                key={row.player_id}
                className="rounded-[24px] border border-white/10 bg-black/22 p-3 backdrop-blur"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-950">
                    {row.rank}
                  </div>
                  <div className="text-right text-lg font-black text-white">
                    {row.wins}
                  </div>
                </div>
                <div className="mt-3 truncate text-sm font-black text-white">
                  {getPlayerDisplayName(row)}
                </div>
                <div className={`mt-1 text-[10px] font-bold ${movementClass(row.deltaRank)}`}>
                  {movementText(row.deltaRank)}
                </div>

                {getTrainingAwards(row).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {getTrainingAwards(row)
                      .slice(0, 2)
                      .map((award) => (
                        <span
                          key={award.key}
                          className="rounded-full bg-white/10 px-1.5 py-0.5 text-[8px] font-black text-white/70"
                        >
                          {award.icon} {award.shortLabel}
                        </span>
                      ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="bg-slate-50 p-4">
        {rest.length > 0 ? (
          <div className="space-y-2">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Weitere Plätze
            </div>
            {rest.map((row, index) => (
              <MiniRow key={row.player_id} row={row} index={index} />
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex items-end justify-between gap-4 border-t border-slate-200 pt-3">
          <div className="max-w-[70%] text-[10px] font-semibold leading-relaxed text-slate-500">
            Bewegung = Vergleich zur Einheit davor in dieser Auswahl.
          </div>

          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              made with strikr
            </div>
            <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
              @getstrikr
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
