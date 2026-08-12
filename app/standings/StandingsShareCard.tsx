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

function MiniRow({ row }: { row: RankRow }) {
  return (
    <div className="flex h-[27px] items-center gap-2 border-b border-white/[0.055] px-1 last:border-b-0">
      <div className="w-[22px] shrink-0 text-center text-[12px] font-black leading-none text-white/80">
        {row.rank}
      </div>

      <div className="min-w-0 flex-1 truncate text-[10px] font-black tracking-[-0.02em] text-white">
        {getPlayerDisplayName(row)}
      </div>

      <div className="flex shrink-0 items-center gap-2 text-[8px] font-black tabular-nums text-white/50">
        <span className="w-[18px] text-right text-white/78">{row.wins}</span>
        <span className="w-[18px] text-right">{row.sessions}</span>
        <span className="w-[28px] text-right">{formatWinRate(row.wins, row.sessions)}</span>
      </div>

      <div className={`w-[30px] shrink-0 text-right text-[7px] font-black ${movementClass(row.deltaRank)}`}>
        {movementText(row.deltaRank)}
      </div>
    </div>
  );
}

function LeaderPanel({ row }: { row: RankRow }) {
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-white/10 bg-[radial-gradient(circle_at_82%_15%,rgba(59,130,246,0.18),transparent_32%),linear-gradient(145deg,rgba(255,255,255,0.10),rgba(255,255,255,0.045))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[7px] font-black uppercase tracking-[0.20em] text-white/38">Platz 1</div>
          <div className="mt-1 truncate text-[21px] font-black leading-none tracking-[-0.055em] text-white">
            {getPlayerDisplayName(row)}
          </div>
          <div className={`mt-1.5 text-[7px] font-black ${movementClass(row.deltaRank)}`}>
            {movementText(row.deltaRank)}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[33px] font-black leading-[0.82] tracking-[-0.07em] text-blue-300 drop-shadow-[0_0_18px_rgba(96,165,250,0.42)]">
            {row.wins}
          </div>
          <div className="mt-1 text-[7px] font-black uppercase tracking-[0.18em] text-white/38">Siege</div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-4 border-t border-white/10 pt-2 text-[8px] font-bold text-white/52">
        <span>{row.sessions} Teilnahmen</span>
        <span>·</span>
        <span>{formatWinRate(row.wins, row.sessions)} Siegquote</span>
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
      className="relative h-[488px] w-[390px] overflow-hidden rounded-[18px] border border-white/10 bg-[#020617] text-white shadow-[0_28px_80px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.06)]"
    >
      <div className="absolute inset-x-0 top-0 h-[122px] bg-[radial-gradient(circle_at_50%_-8%,rgba(255,255,255,0.14),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(59,130,246,0.34),transparent_34%),linear-gradient(135deg,#0b1220_0%,#111d35_56%,#10234a_100%)] shadow-[0_22px_48px_rgba(37,99,235,0.12)]" />

      <div className="absolute inset-x-0 top-0 z-10 px-[14px] pt-[12px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 rounded-[10px] border border-white/10 bg-black/20 px-2.5 py-2 backdrop-blur-sm">
            <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] border border-white/10 bg-white/10 text-[10px] font-black text-white">
              #1
            </div>
            <div className="min-w-0">
              <div className="max-w-[145px] truncate text-[9px] font-black text-white">{selectedLabel}</div>
              <div className="mt-0.5 text-[6px] font-black uppercase tracking-[0.15em] text-white/42">Leaderboard</div>
            </div>
          </div>

          <div className="flex w-[84px] shrink-0 flex-col items-center rounded-[10px] border border-white/10 bg-black/20 px-2 py-2 backdrop-blur-sm">
            <div className="text-[12px] font-black lowercase tracking-[-0.03em] text-white">strikr</div>
            <div className="mt-0.5 text-[5px] font-black uppercase tracking-[0.12em] text-white/42">training redefined</div>
            <div className="mt-1 border-t border-white/10 pt-1 text-[6px] font-bold text-emerald-300">strikr.team</div>
          </div>
        </div>

        <div className="mt-[10px] flex items-end justify-between gap-3">
          <div className="text-[39px] font-black leading-[0.82] tracking-[-0.065em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
            {isTopCard ? "TOP 10." : "TABELLE."}
          </div>
          <div className="pb-0.5 text-right">
            <div className="text-[6px] font-black uppercase tracking-[0.16em] text-white/38">Stand</div>
            <div className="mt-0.5 text-[8px] font-black text-white/72">{new Date().toLocaleDateString("de-DE")}</div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[42px] top-[122px] z-[2] bg-[radial-gradient(circle_at_50%_20%,rgba(30,41,59,0.92),#0f172a_72%)] px-[14px] pt-[11px]">
        {leader ? <LeaderPanel row={leader} /> : null}

        {listRows.length > 0 ? (
          <div className={leader ? "mt-2" : "mt-0"}>
            <div className="mb-1.5 flex items-center justify-between px-1">
              <div className="text-[6px] font-black uppercase tracking-[0.18em] text-white/34">
                {isTopCard ? "Plätze 2–10" : rangeLabel}
              </div>
              <div className="flex items-center gap-2 pr-[31px] text-[6px] font-bold text-white/28">
                <span>Siege</span>
                <span>Teiln.</span>
                <span>Quote</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-[12px] border border-white/[0.07] bg-black/10 px-2">
              {listRows.map((row) => (
                <MiniRow key={row.player_id} row={row} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 flex h-[42px] items-end justify-between gap-4 bg-[linear-gradient(180deg,rgba(2,6,23,0.88),#020617)] px-[16px] pb-[10px] pt-[6px]">
        <div className="max-w-[235px] text-[6px] font-semibold leading-relaxed text-white/34">
          {isTopCard ? "Die komplette Tabelle mit allen Spielern findest du direkt in strikr." : "Alle Plätze und Stats findest du direkt in strikr."}
        </div>

        <div className="text-right">
          <div className="text-[6px] font-black uppercase tracking-[0.12em] text-white/56">made with strikr</div>
          <div className="mt-0.5 text-[6px] font-semibold text-white/28">@getstrikr</div>
        </div>
      </div>
    </div>
  );
}
