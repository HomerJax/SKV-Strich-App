"use client";

import { useMemo, useState } from "react";

type Player = { id: number; name: string; balance_group: string | null };
type Props = { players: Player[]; isPro: boolean };

const STANDARD_GROUPS = ["Gehfußballer", "Offensive Topspieler", "Defensive Topspieler"];

export default function BalanceGroupManager({ players, isPro }: Props) {
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState(() =>
    Object.fromEntries(players.map(player => [player.id, player.balance_group || ""])) as Record<number, string>
  );
  const [selected, setSelected] = useState<Record<string, string>>({});
  const legacyGroups = [...new Set(players.map(player => player.balance_group).filter((group): group is string => !!group && !STANDARD_GROUPS.includes(group)))];
  const groups = [...STANDARD_GROUPS, ...legacyGroups];
  const available = useMemo(() => players.filter(player => !assignments[player.id]).sort((a, b) => a.name.localeCompare(b.name, "de")), [players, assignments]);
  const activeGroups = new Set(Object.values(assignments).filter(Boolean));

  async function save(playerId: number, group: string) {
    if (pending !== null) return;
    setPending(playerId);
    setError("");
    try {
      const response = await fetch("/api/admin/players/balance-group", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, balanceGroup: group || null }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Zuordnung konnte nicht gespeichert werden.");
      setAssignments(current => ({ ...current, [playerId]: group }));
      setSelected(current => ({ ...current, [group]: "" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="mb-5 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-xl font-extrabold text-slate-950">Balance-Gruppen verwalten</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Ordne Spieler direkt einer Gruppe zu. Bereits zugeordnete Spieler verschwinden aus allen Hinzufügen-Dropdowns. Entfernen macht sie wieder auswählbar.</p>
      {!isPro && <p className="mt-2 text-sm text-amber-800">Free: eine aktive Balance-Gruppe. Für mehrere Gruppen benötigst du PRO.</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {groups.map(group => {
          const members = players.filter(player => assignments[player.id] === group);
          const blocked = !isPro && !activeGroups.has(group) && activeGroups.size >= 1;
          return (
            <div key={group} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-slate-900">{group}</h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{members.length} Spieler</span>
              </div>
              <div className="mt-3 space-y-2">
                {members.length === 0 && <p className="text-sm text-slate-500">Noch niemand zugeordnet.</p>}
                {members.map(player => (
                  <div key={player.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-slate-800">{player.name}</span>
                    <button type="button" disabled={pending !== null} onClick={() => void save(player.id, "")} className="shrink-0 font-semibold text-red-700 disabled:opacity-40" aria-label={`${player.name} aus ${group} entfernen`}>Entfernen</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <select aria-label={`Spieler zu ${group} hinzufügen`} value={selected[group] || ""} disabled={pending !== null || blocked || available.length === 0} onChange={event => setSelected(current => ({ ...current, [group]: event.target.value }))} className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50">
                  <option value="">Spieler auswählen …</option>
                  {available.map(player => <option key={player.id} value={player.id}>{player.name}</option>)}
                </select>
                <button type="button" disabled={pending !== null || blocked || !selected[group]} onClick={() => void save(Number(selected[group]), group)} className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Hinzufügen</button>
              </div>
              {blocked && <p className="mt-2 text-xs text-amber-800">Weitere Gruppe nur mit PRO.</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
