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

function formatWinRate(wins: number, sessions: number) {
  if (sessions <= 0) return "–";
  return `${Math.round((wins / sessions) * 100)}%`;
}

function rankTone(rank: number) {
  if (rank === 1) return "bg-slate-950 text-white";
  if (rank === 2) return "bg-slate-200 text-slate-950";
  if (rank === 3) return "bg-stone-200 text-stone-950";
  return "bg-slate-100 text-slate-700";
}

function CompactRow({ row }: { row: RankRow }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${rankTone(
          row.rank
        )}`}
      >
        {row.rank}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-black tracking-tight text-slate-950">
          {getPlayerDisplayName(row)}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[9px] font-bold text-slate-400">
          <span>{row.wins} Siege</span>
          <span>·</span>
          <span>{row.sessions} Teiln.</span>
          <span className={movementClass(row.deltaRank)}>{movementText(row.deltaRank)}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="text-sm font-black text-slate-950">
          {formatWinRate(row.wins, row.sessions)}
        </div>
        <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
          Siegquote
        </div>
      </div>
    </div>
  );
}

function PodiumCard({ row, compact = false }: { row: RankRow; compact?: boolean }) {
  return (
    <div
      className={`rounded-[24px] border border-white/10 bg-white/[0.08] backdrop-blur ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/38">
            Platz {row.rank}
          </div>
          <div
            className={`mt-2 truncate font-black tracking-[-0.05em] text-white ${
              compact ? "text-lg" : "text-3xl"
            }`}
          >
            {getPlayerDisplayName(row)}
          </div>
          <div className={`mt-1 text-[10px] font-bold ${movementClass(row.deltaRank)}`}>
            {movementText(row.deltaRank)}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className={`${compact ? "text-xl" : "text-3xl"} font-black text-white`}>
            {formatWinRate(row.wins, row.sessions)}
          </div>
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/36">
            Siegquote
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[9px] font-bold text-white/52">
        <span>{row.wins} Siege</span>
        <span>·</span>
        <span>{row.sessions} Teilnahmen</span>
      </div>

      {getTrainingAwards(row).length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {getTrainingAwards(row)
            .slice(0, compact ? 1 : 3)
            .map((award) => (
              <span
                key={award.key}
                className="rounded-full bg-white/10 px-2 py-1 text-[8px] font-black text-white/70"
              >
                {award.mark} {award.shortLabel}
              </span>
            ))}
        </div>
      ) : null}
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
  const rangeLabel =
    startRank === endRank ? `Platz ${startRank}` : `Plätze ${startRank}–${endRank}`;
  const leader = isTopCard ? rows[0] : null;
  const podium = isTopCard ? rows.slice(1, 3) : [];
  const listRows = isTopCard ? rows.slice(3) : rows;

  return (
    <div
      id={exportId}
      className="w-full max-w-[390px] overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl"
    >
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_82%_0%,rgba(59,130,246,0.20),transparent_26%),linear-gradient(145deg,#020617_0%,#0b1220_58%,#172033_100%)] px-5 pb-5 pt-5 text-white">
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-black lowercase tracking-[0.16em] text-white/42">
              strikr
            </div>
            <div className="mt-2 text-3xl font-black leading-none tracking-[-0.06em]">
              {isTopCard ? "Top 10." : "Tabelle."}
            </div>
            <div className="mt-1 truncate text-sm font-bold text-white/52">
              {selectedLabel}
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2 text-right backdrop-blur">
            <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/34">
              Stand
            </div>
            <div className="mt-1 text-[11px] font-bold text-white/76">
              {new Date().toLocaleDateString("de-DE")}
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/34">
              {isTopCard ? "Leaderboard" : "Fortsetzung"}
            </div>
            <div className="mt-1 text-2xl font-black tracking-[-0.05em] text-white">
              {isTopCard ? "Die Spitze." : rangeLabel}
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[10px] font-black text-white/62">
            {rangeLabel}
          </div>
        </div>

        {leader ? (
          <div className="relative mt-4">
            <PodiumCard row={leader} />
          </div>
        ) : null}

        {podium.length > 0 ? (
          <div className="relative mt-2 grid grid-cols-2 gap-2">
            {podium.map((row) => (
              <PodiumCard key={row.player_id} row={row} compact />
            ))}
          </div>
        ) : null}
      </div>

      <div className="bg-slate-50 p-4">
        {listRows.length > 0 ? (
          <div className="space-y-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                {isTopCard ? "Plätze 4–10" : rangeLabel}
              </div>
              <div className="text-[9px] font-bold text-slate-400">Siege · Teiln. · Quote</div>
            </div>
            {listRows.map((row) => (
              <CompactRow key={row.player_id} row={row} />
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex items-end justify-between gap-4 border-t border-slate-200 pt-3">
          <div className="max-w-[68%] text-[9px] font-semibold leading-relaxed text-slate-500">
            {isTopCard
              ? "Die komplette Tabelle mit allen Spielern findest du direkt in strikr."
              : "Fortsetzung der Tabelle. Alle Plätze und Stats findest du in strikr."}
          </div>

          <div className="text-right">
            <div className="text-[9px] font-black uppercase tracking-wide text-slate-700">
              made with strikr
            </div>
            <div className="mt-0.5 text-[9px] font-semibold text-slate-400">@getstrikr</div>
          </div>
        </div>
      </div>
    </div>
  );
}
