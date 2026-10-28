"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "./session-types";
import { getPlayerDisplayName } from "@/lib/player-display";

type Props = { sessionId: number; teamA: Player[]; teamB: Player[] };

export default function SessionCompletedTeamCorrection({ sessionId, teamA, teamB }: Props) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function swap() {
    if (!playerA || !playerB || saving) return;
    if (!window.confirm("Spieler nachträglich tauschen? Die Änderung wird protokolliert und wirkt sich auf die Statistik dieses Trainings aus.")) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/completed-team-correction`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: Number(playerA),
          expectedSide: "A",
          swapPlayerId: Number(playerB),
        }),
      });
      const body = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(body.error ?? "Korrektur fehlgeschlagen.");
      // Preserve the mobile viewport and data view; use the fresh server props.
      setNotice(body.message ?? "Teamkorrektur gespeichert.");
      setPlayerA("");
      setPlayerB("");
      router.refresh();
      setSaving(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Korrektur fehlgeschlagen.");
      setSaving(false);
    }
  }

  if (!teamA.length || !teamB.length) return null;
  return (
    <details className="rounded-2xl border border-amber-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-black text-slate-900">↔ Gespeicherte Teams nachträglich korrigieren (Admin)</summary>
      <p className="mt-3 text-sm text-slate-600">
        Falls Spieler tatsächlich im anderen Team gespielt haben: zwei Spieler tauschen.
        strikr protokolliert die Korrektur und berechnet die Statistiken anhand der gespeicherten Zuordnung.
        Ergebnisse und Siegerfoto bleiben unverändert.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-700">Spieler aus Team 1
          <select value={playerA} onChange={event => setPlayerA(event.target.value)} disabled={saving}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="">Spieler wählen</option>
            {teamA.map(player => <option key={player.id} value={player.id}>{getPlayerDisplayName(player)}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">Tauschspieler aus Team 2
          <select value={playerB} onChange={event => setPlayerB(event.target.value)} disabled={saving}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="">Spieler wählen</option>
            {teamB.map(player => <option key={player.id} value={player.id}>{getPlayerDisplayName(player)}</option>)}
          </select>
        </label>
      </div>
      <button type="button" disabled={!playerA || !playerB || saving} onClick={() => void swap()}
        className="mt-4 min-h-12 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-40">
        {saving ? "Speichere Korrektur …" : "Spieler tauschen & Änderung protokollieren"}
      </button>
      {error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
      {notice ? <p role="status" className="mt-3 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">{notice}</p> : null}
    </details>
  );
}
