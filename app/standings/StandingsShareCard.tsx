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

function formatWinRate(wins: number, sessions: number) {
  if (sessions <= 0) return "–";
  return `${Math.round((wins / sessions) * 100)}%`;
}

function LeaderCard({ row }: { row: RankRow }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.075] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/38">
            Platz 1
          </div>
          <div className="mt-2 truncate text-[28px] font-black leading-none tracking-[-0.055em] text-white">
            {getPlayerDisplayName(row)}
          </div>
          <div className={`mt-2 text-[10px] font-black ${movementClass(row.deltaRank)}`}>
            {movementText(row.deltaRank)}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[30px] font-black leading-none tracking-[-0.05em] text-white">
            {row.wins}
          </div>
          <div className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/36">
            Siege
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.15em] text-white/32">Teilnahmen</div>
          <div className="mt-1 text-[14px] font-black text-white/78">{row.sessions}</div>
        </div>
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.15em] text-white/32">Siegquote</div>
          <div className="mt-1 text-[14px] font-black text-white/78">{formatWinRate(row.wins, row.sessions)}</div>
        </div>
      </div>
    </div>
  );
}

function RankingRow({ row }: { row: RankRow }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.055] px-3 py-2.5">
      <div className="w-7 shrink-0 text-center text-[15px] font-black text-white/84">{row.rank}</div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-black tracking-[-0.02em] text-white">
          {getPlayerDisplayName(row)}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[9px] font-bold text-white/40">
          <span>{row.wins} Siege</span>
          <span>·</span>
          <span>{row.sessions} Teiln.</span>
          <span>·</span>
          <span>{formatWinRate(row.wins, row.sessions)}</span>
        </div>
      </div>

      <div className={`shrink-0 text-[9px] font-black ${movementClass(row.deltaRank)}`}>
        {movementText(row.deltaRank)}
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
  const isTopCard = startRank === 1;
  const rangeLabel = startRank === endRank ? `Platz ${startRank}` : `Plätze ${startRank}–${endRank}`;
  const leader = isTopCard ? rows[0] : null;
  const listRows = isTopCard ? rows.slice(1) : rows;

  return (
    <div
      id={exportId}
      className="w-full max-w-[390px] overflow-hidden rounded-[32px] border border-slate-700/80 bg-[#07101f] shadow-2xl"
    >
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_88%_0%,rgba(59,130,246,0.18),transparent_30%),linear-gradient(145deg,#020617_0%,#07101f_52%,#111c31_100%)] p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-black lowercase tracking-[0.16em] text-white/40">strikr</div>
            <div className="mt-2 text-[30px] font-black leading-none tracking-[-0.055em] text-white">
              {isTopCard ? "Top 10." : "Tabelle."}
            </div>
            <div className="mt-1 truncate text-[12px] font-bold text-white/46">{selectedLabel}</div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30">Stand</div>
            <div className="mt-1 text-[11px] font-black text-white/72">
              {new Date().toLocaleDateString("de-DE")}
            </div>
          </div>
        </div>

        <div className="my-4 h-px bg-white/10" />

        {leader ? <LeaderCard row={leader} /> : null}

        {listRows.length > 0 ? (
          <div className={leader ? "mt-3 space-y-2" : "space-y-2"}>
            <div className="mb-1 flex items-center justify-between gap-3 px-1">
              <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
                {isTopCard ? "Plätze 2–10" : rangeLabel}
              </div>
              <div className="text-[8px] font-bold text-white/28">Siege · Teiln. · Quote</div>
            </div>
            {listRows.map((row) => (
              <RankingRow key={row.player_id} row={row} />
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex items-end justify-between gap-4 border-t border-white/10 pt-3">
          <div className="max-w-[68%] text-[8.5px] font-semibold leading-relaxed text-white/34">
            {isTopCard
              ? "Die komplette Tabelle mit allen Spielern findest du direkt in strikr."
              : "Fortsetzung der Tabelle. Alle Plätze und Stats findest du in strikr."}
          </div>

          <div className="text-right">
            <div className="text-[8px] font-black uppercase tracking-[0.12em] text-white/55">made with strikr</div>
            <div className="mt-0.5 text-[8px] font-semibold text-white/28">@getstrikr</div>
          </div>
        </div>
      </div>
    </div>
  );
}
