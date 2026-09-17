"use client";

import { getPlayerDisplayName } from "@/lib/player-display";
import type { Player } from "./session-types";

export default function SessionAbsenceReasonsCard({ players }: { players: Player[] }) {
  const absentPlayers = players.filter((player) => player.rsvp_status === "out");

  if (absentPlayers.length === 0) return null;

  return (
    <section className="rounded-[20px] border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-950">Absagen</div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            Absagegründe sind optional und für das Team sichtbar.
          </div>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-rose-700 ring-1 ring-rose-200">
          {absentPlayers.length}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {absentPlayers.map((player) => (
          <div
            key={player.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-white px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">
                {getPlayerDisplayName(player)}
              </div>
              <div className={`mt-0.5 text-[11px] leading-4 ${player.rsvp_reason ? "font-semibold text-rose-700" : "text-slate-400"}`}>
                {player.rsvp_reason ? `„${player.rsvp_reason}“` : "Kein Grund angegeben"}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-rose-100 px-2 py-1 text-[9px] font-black text-rose-700">
              ABGESAGT
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
