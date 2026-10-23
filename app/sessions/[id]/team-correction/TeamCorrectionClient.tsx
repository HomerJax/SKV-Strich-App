"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Team = { id: number; name: string };
type Entry = { playerId: number; teamId: number; name: string };

export default function TeamCorrectionClient({
  sessionId, teams, entries,
}: { sessionId: number; teams: Team[]; entries: Entry[] }) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<number>(0);
  const [mode, setMode] = useState<"swap"|"move">("swap");
  const [swapPlayerId, setSwapPlayerId] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const selected = entries.find((item) => item.playerId === playerId) ?? null;
  const target = selected ? teams.find((team) => team.id !== selected.teamId) ?? null : null;
  const candidates = target ? entries.filter((item) => item.teamId === target.id) : [];
  const otherPlayer = candidates.find((item) => item.playerId === swapPlayerId) ?? null;

  useEffect(() => { setSwapPlayerId(0); }, [playerId, mode, entries]);

  async function save() {
    if (!selected || !target || busy || (mode === "swap" && !otherPlayer)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/team-correction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selected.playerId,
          expectedTeamId: selected.teamId,
          targetTeamId: target.id,
          swapPlayerId: mode === "swap" ? otherPlayer?.playerId : null,
        }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Die Korrektur konnte nicht gespeichert werden.");
      setNotice(result.message || "Teamzuordnung erfolgreich korrigiert.");
      setPlayerId(0);
      setSwapPlayerId(0);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {teams.map((team, index) => {
          const members = entries.filter((item) => item.teamId === team.id);
          return (
            <div key={team.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-black text-slate-950">{team.name}</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{members.length} Spieler</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-400">Mannschaft {index + 1}</p>
              <div className="mt-3 space-y-1.5">
                {members.map((member) => (
                  <button type="button" key={member.playerId}
                    onClick={() => { setPlayerId(member.playerId); setError(""); setNotice(""); }}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition
                      ${selected?.playerId === member.playerId
                        ? "bg-cyan-100 font-bold text-cyan-950 ring-2 ring-cyan-500"
                        : "bg-slate-50 font-medium text-slate-800 hover:bg-cyan-50"}`}>
                    {member.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-black text-slate-950">Manuellen Wechsel nachtragen</h2>
        <p className="mt-1 text-xs leading-5 text-slate-600">Tippe oben auf einen Spieler oder wähle ihn aus der Liste.</p>
        <label className="mt-4 block text-xs font-bold text-slate-700">
          Spieler, dessen Team falsch gespeichert wurde
          <select value={playerId} onChange={(event) => setPlayerId(Number(event.target.value))}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-950">
            <option value={0}>Spieler auswählen …</option>
            {entries.map((entry) => (
              <option key={entry.playerId} value={entry.playerId}>
                {entry.name} · {teams.find((team) => team.id === entry.teamId)?.name || "Team"}
              </option>
            ))}
          </select>
        </label>

        {selected && target ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-cyan-50 p-3 text-sm font-semibold text-cyan-900">
              {selected.name} · {teams.find((team) => team.id === selected.teamId)?.name} → {target.name}
            </div>
            <fieldset className="space-y-2 text-sm text-slate-800">
              <legend className="mb-2 text-xs font-black text-slate-700">Was ist gestern passiert?</legend>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3">
                <input type="radio" checked={mode === "swap"} onChange={() => setMode("swap")}/>
                <span><strong>Spieler getauscht</strong> – je ein Spieler wechselt ins andere Team</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3">
                <input type="radio" checked={mode === "move"} onChange={() => setMode("move")}/>
                <span><strong>Nur verschoben</strong> – Spielerzahl kann ungleich werden</span>
              </label>
            </fieldset>
            {mode === "swap" ? (
              <label className="block text-xs font-bold text-slate-700">
                Mit welchem Spieler aus {target.name} getauscht?
                <select value={swapPlayerId} onChange={(event) => setSwapPlayerId(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-950">
                  <option value={0}>Tauschspieler auswählen …</option>
                  {candidates.map((entry) => (
                    <option key={entry.playerId} value={entry.playerId}>{entry.name}</option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                Achtung: {selected.name} wird alleine nach {target.name} verschoben.
                Die Teams haben danach unterschiedlich viele Spieler.
              </p>
            )}
            {mode === "swap" && otherPlayer ? (
              <p className="rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-700">
                Gespeichert wird nur dieser Tausch: <b>{selected.name}</b> nach {target.name},
                <b> {otherPlayer.name}</b> ins andere Team.
              </p>
            ) : null}
            <button type="button" disabled={busy || (mode === "swap" && !otherPlayer)}
              onClick={() => void save()}
              className="w-full rounded-xl bg-cyan-600 px-4 py-3.5 text-sm font-black text-white disabled:opacity-50">
              {busy ? "Änderung wird gespeichert …" : "Teamkorrektur jetzt speichern"}
            </button>
          </div>
        ) : null}

        {notice ? <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p> : null}
        {error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}
      </div>
    </section>
  );
}
