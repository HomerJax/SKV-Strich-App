"use client";

import { useEffect, useMemo, useState } from "react";
import { getPlayerDisplayName } from "@/lib/player-display";
import type { Player } from "./session-types";

type AdminRsvpStatus = "out" | "open";
type EventRosterPlayer = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  nominated: boolean;
};

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

function rosterName(player: EventRosterPlayer) {
  return player.nickname?.trim() || [player.first_name, player.last_name].filter(Boolean).join(" ").trim() || "Spieler";
}

export default function SessionAdminRsvpCard({ sessionId, players, hasResult, isAdmin }: Props) {
  const eligiblePlayers = useMemo(() => players.filter((player) => !player.is_guest), [players]);
  const absentPlayers = useMemo(() => eligiblePlayers.filter((player) => rsvpStatus(player) === "out"), [eligiblePlayers]);

  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [busyPlayerId, setBusyPlayerId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEvent, setIsEvent] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterPlayers, setRosterPlayers] = useState<EventRosterPlayer[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    setRosterLoading(true);
    fetch(`/api/sessions/${sessionId}/event-roster`, { credentials: "same-origin" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { isEvent?: boolean; players?: EventRosterPlayer[]; error?: string } | null;
        if (!response.ok) throw new Error(payload?.error || "Event-Kader konnte nicht geladen werden.");
        if (!active) return;
        setIsEvent(payload?.isEvent === true);
        setRosterPlayers(Array.isArray(payload?.players) ? payload!.players! : []);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Event-Kader konnte nicht geladen werden.");
      })
      .finally(() => {
        if (active) setRosterLoading(false);
      });
    return () => { active = false; };
  }, [isAdmin, sessionId]);

  const selectedPlayer = eligiblePlayers.find((player) => player.id === Number(selectedPlayerId));
  const selectedIsAbsent = selectedPlayer ? rsvpStatus(selectedPlayer) === "out" : false;
  const nominatedCount = rosterPlayers.filter((player) => player.nominated).length;

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
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Rückmeldung konnte nicht geändert werden.");
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(ATTENDANCE_SCROLL_KEY, String(window.scrollY));
        window.location.reload();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Rückmeldung konnte nicht geändert werden.");
      setBusyPlayerId(null);
    }
  }

  async function toggleRoster(player: EventRosterPlayer) {
    if (busyPlayerId) return;
    try {
      setBusyPlayerId(player.id);
      setError(null);
      const response = await fetch(`/api/sessions/${sessionId}/event-roster`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: player.id, nominated: !player.nominated }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Event-Kader konnte nicht aktualisiert werden.");
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(ATTENDANCE_SCROLL_KEY, String(window.scrollY));
        window.location.reload();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Event-Kader konnte nicht aktualisiert werden.");
      setBusyPlayerId(null);
    }
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-3">
      {absentPlayers.length > 0 ? (
        <section className="rounded-[20px] border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-950">Absagen</div>
              <div className="mt-0.5 text-[11px] text-slate-500">Absagegründe sind optional und für das Team sichtbar.</div>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-rose-700 ring-1 ring-rose-200">{absentPlayers.length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {absentPlayers.map((player) => (
              <div key={player.id} className="flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-white px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-900">{getPlayerDisplayName(player)}</div>
                  <div className={`mt-0.5 text-[11px] leading-4 ${player.rsvp_reason ? "font-semibold text-rose-700" : "text-slate-400"}`}>
                    {player.rsvp_reason ? `„${player.rsvp_reason}“` : "Kein Grund angegeben"}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-rose-100 px-2 py-1 text-[9px] font-black text-rose-700">ABGESAGT</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {isAdmin && isEvent ? (
        <section className="rounded-[20px] border border-violet-200 bg-violet-50/60 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-950">Event-Kader</div>
              <p className="mt-1 text-[11px] leading-5 text-slate-600">Alle sind standardmäßig im Kader. Einzelne Spieler kannst du für diesen Termin rausnehmen.</p>
              <div className="mt-2 text-[10px] font-bold text-violet-700">{nominatedCount} von {rosterPlayers.length} im Kader</div>
            </div>
            <button type="button" onClick={() => setRosterOpen((value) => !value)} disabled={rosterLoading} className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
              {rosterOpen ? "Schließen" : "Kader festlegen"}
            </button>
          </div>
          {rosterOpen ? (
            <div className="mt-4 grid gap-2 border-t border-violet-200 pt-4 sm:grid-cols-2">
              {rosterPlayers.map((player) => (
                <button key={player.id} type="button" disabled={busyPlayerId !== null} onClick={() => void toggleRoster(player)} className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left disabled:opacity-60 ${player.nominated ? "border-emerald-200 bg-white" : "border-slate-200 bg-slate-100"}`}>
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{rosterName(player)}</span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${player.nominated ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {busyPlayerId === player.id ? "…" : player.nominated ? "IM KADER" : "NICHT IM KADER"}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {isAdmin && !hasResult && eligiblePlayers.length > 0 ? (
        <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-950">Rückmeldungen verwalten</div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">Als Admin kannst du einen Spieler für genau diese Session absagen.</p>
            </div>
            {absentPlayers.length > 0 ? <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">{absentPlayers.length} abgesagt</span> : null}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <select value={selectedPlayerId} onChange={(event) => { setSelectedPlayerId(event.target.value); setError(null); }} disabled={busyPlayerId !== null} className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 disabled:opacity-60">
              <option value="">Spieler auswählen…</option>
              {eligiblePlayers.map((player) => <option key={player.id} value={player.id}>{getPlayerDisplayName(player)} · {statusLabel(player)}</option>)}
            </select>
            <button type="button" disabled={!selectedPlayer || busyPlayerId !== null} onClick={() => { if (selectedPlayer) void updateRsvp(selectedPlayer.id, selectedIsAbsent ? "open" : "out"); }} className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedIsAbsent ? "border border-slate-300 bg-white text-slate-800" : "bg-rose-600 text-white"}`}>
              {selectedPlayer && busyPlayerId === selectedPlayer.id ? "Speichert…" : selectedIsAbsent ? "Absage aufheben" : "Spieler absagen"}
            </button>
          </div>
        </section>
      ) : null}

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div> : null}
    </div>
  );
}
