"use client";

import { getPlayerDisplayName } from "@/lib/player-display";
import type { RankRow } from "./standings-types";
import { movementClass, movementText } from "./standings-ui";

type StandingsShareCardProps = {
  exportId: string;
  selectedLabel: string;
  startRank: number;
  endRank: number;
  rows: RankRow[];
};

export default function StandingsShareCard({
  exportId,
  selectedLabel,
  startRank,
  endRank,
  rows,
}: StandingsShareCardProps) {
  const rangeLabel =
    startRank === endRank ? `Platz ${startRank}` : `Plätze ${startRank}–${endRank}`;

  return (
    <div
      id={exportId}
      className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm"
    >
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
              strikr
            </div>
            <div className="mt-2 text-2xl font-semibold leading-tight">
              Tabelle
            </div>
            <div className="mt-1 text-sm text-slate-300">{selectedLabel}</div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Stand
            </div>
            <div className="mt-1 text-xs text-slate-200">
              {new Date().toLocaleDateString("de-DE")}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-300">
                Ranking-Bereich
              </div>
              <div className="mt-2 text-3xl font-semibold leading-none sm:text-4xl">
                {rangeLabel}
              </div>
            </div>

            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100">
              {rows.length} {rows.length === 1 ? "Eintrag" : "Einträge"}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-4">
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
          <table className="w-full table-fixed">
            <thead className="bg-slate-50">
              <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                <th className="w-[72px] px-3 py-3 text-left font-semibold">Platz</th>
                <th className="px-3 py-3 text-left font-semibold">Spieler</th>
                <th className="w-[72px] px-3 py-3 text-right font-semibold">Siege</th>
                <th className="w-[96px] px-3 py-3 text-right font-semibold">
                  Teilnahmen
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, index) => (
                <tr
                  key={r.player_id}
                  className={index === 0 ? "" : "border-t border-slate-100"}
                >
                  <td className="px-3 py-3 align-top">
                    <div className="text-base font-semibold leading-none text-slate-900">
                      {r.rank}.
                    </div>
                    <div
                      className={`mt-1 text-[11px] font-semibold ${movementClass(
                        r.deltaRank
                      )}`}
                    >
                      {movementText(r.deltaRank)}
                    </div>
                  </td>

                  <td className="px-3 py-3 align-middle">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {getPlayerDisplayName(r)}
                    </div>
                  </td>

                  <td className="px-3 py-3 text-right align-middle text-sm font-semibold text-slate-900">
                    {r.wins}
                  </td>

                  <td className="px-3 py-3 text-right align-middle text-sm text-slate-700">
                    {r.sessions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="max-w-[70%] text-[10px] leading-relaxed text-slate-500">
            Bewegung (↑/↓) = Vergleich zur Einheit davor in dieser Auswahl.
          </div>

          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              made with strikr
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">#strikr</div>
          </div>
        </div>
      </div>
    </div>
  );
}