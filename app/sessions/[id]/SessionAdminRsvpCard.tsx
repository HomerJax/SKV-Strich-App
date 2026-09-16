"use client";

import { useMemo, useState } from "react";
import { getPlayerDisplayName } from "@/lib/player-display";
import type { Player } from "./session-types";

type AdminRsvpStatus = "out" | "open";

type Props = {
  sessionId: number;
  players: Player[];
  hasResult: boolean;
  isAdmin: boolean;
};

const ATTENDANCE_SCROLL_KEY = "strikr-session-attendance-scroll-y";

function rsvpStatus(player: Player) {
  return player.rsvp_status ?? null;
}

function statusLabel(player: Player) {
  const status = rsvpStatus(player);
  if (status === "out") return "abgesagt";
  if (status === "in") return "zugesagt";
  return "offen";
}

export default function SessionAdminRsvpCard({
  sessionId,
  players,
  hasResult,
  isAdmin,
}: Props) {
  const eligiblePlayers = useMemo(
    () => players.filter((player) => !player.is_guest),
    [players],
  );
  const absentPlayers = useMemo(
    () => eligiblePlayers.filter((player) => rsvpStatus(player) === "out"),
    [eligiblePlayers],
  );

  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [busyPlayerId, setBusyPlayerId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin || hasResult || eligiblePlayers.length === 0) return null;

  const selectedPlayer = eligiblePlayers.find(
    (player) => player.id === Number(selectedPlayerId),
  );
  const selectedIsAbsent = selectedPlayer
    ? rsvpStatus(selectedPlayer) === "out"
    : false;

  async function updateRsvp(playerId: number, status: AdminRsvpStatus) {
    if (busyPlayerId) return;

    try {
      setBusyPlayerId(playerId);
      setError(null);

      const response = await fetch(`/api/sessions/${sessionId}/admin-rsvp`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, status }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Rückmeldung konnte nicht geändert werden.");
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          ATTENDANCE_SCROLL_KEY,
          String(window.scrollY),
        );
        window.location.reload();
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Rückmeldung konnte nicht geändert werden.",
      );
      setBusyPlayerId(null);
    }
  }

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-950">
            Rückmeldungen verwalten
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Als Admin kannst du einen Spieler für genau diese Session absagen.
          </p>
        </div>

        {absentPlayers.length > 0 ? (
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
            {absentPlayers.length} abgesagt
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <select
          value={selectedPlayerId}
          onChange={(event) => {
            setSelectedPlayerId(event.target.value);
            setError(null);
          }}
          disabled={busyPlayerId !== null}
          className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:opacity-60"
        >
          <option value="">Spieler auswählen…</option>
          {eligiblePlayers.map((player) => (
            <option key={player.id} value={player.id}>
              {getPlayerDisplayName(player)} · {statusLabel(player)}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!selectedPlayer || busyPlayerId !== null}
          onClick={() => {
            if (!selectedPlayer) return;
            void updateRsvp(
              selectedPlayer.id,
              selectedIsAbsent ? "open" : "out",
            );
          }}
          className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            selectedIsAbsent
              ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              : "bg-rose-600 text-white hover:bg-rose-700"
          }`}
        >
          {selectedPlayer && busyPlayerId === selectedPlayer.id
            ? "Speichert…"
            : selectedIsAbsent
              ? "Absage aufheben"
              : "Spieler absagen"}
        </button>
      </div>

      {absentPlayers.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {absentPlayers.map((player) => (
            <button
              key={player.id}
              type="button"
              disabled={busyPlayerId !== null}
              onClick={() => void updateRsvp(player.id, "open")}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100 disabled:opacity-50"
              title="Absage aufheben"
            >
              {busyPlayerId === player.id ? "Speichert…" : getPlayerDisplayName(player)}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </section>
  );
}
