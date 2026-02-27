"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

type AgeGroup = "AH" | "Ü32" | null;
type PreferredPosition = "defense" | "attack" | "goalkeeper" | null;

type Player = {
  id: number;
  name: string;
  age_group: AgeGroup;
  preferred_position: PreferredPosition;
  strength: number | null;
  is_active: boolean | null;
};

function getErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return fallback;
}

function toStrength(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.max(1, Math.min(5, n));
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [draft, setDraft] = useState<Record<number, Player>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(true);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      setMsg(null);

      const { data, error } = await supabase
        .from("players")
        .select("id, name, age_group, preferred_position, strength, is_active")
        .order("name");

      if (error) throw error;

      const list = (data ?? []) as Player[];
      setPlayers(list);

      const nextDraft: Record<number, Player> = {};
      for (const p of list) nextDraft[p.id] = { ...p };
      setDraft(nextDraft);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Fehler beim Laden."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return players.filter((p) => {
      if (!showInactive && p.is_active === false) return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term);
    });
  }, [players, q, showInactive]);

  function setField(id: number, patch: Partial<Player>) {
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  function isDirty(id: number) {
    const original = players.find((p) => p.id === id);
    const current = draft[id];
    if (!original || !current) return false;

    return (
      original.name !== current.name ||
      (original.age_group ?? null) !== (current.age_group ?? null) ||
      (original.preferred_position ?? null) !== (current.preferred_position ?? null) ||
      (original.strength ?? null) !== (current.strength ?? null) ||
      (original.is_active ?? null) !== (current.is_active ?? null)
    );
  }

  async function savePlayer(id: number) {
    const p = draft[id];
    if (!p) return;

    try {
      setSavingId(id);
      setErr(null);
      setMsg(null);

      const name = (p.name ?? "").trim();
      if (!name) throw new Error("Name darf nicht leer sein.");

      const payload = {
        name,
        age_group: p.age_group ?? null,
        preferred_position: p.preferred_position ?? null,
        strength: p.strength === null ? null : Math.max(1, Math.min(5, Number(p.strength))),
        is_active: p.is_active ?? true,
      };

      const { error } = await supabase.from("players").update(payload).eq("id", id);
      if (error) throw error;

      setPlayers((list) => list.map((x) => (x.id === id ? ({ ...x, ...payload } as Player) : x)));
      setDraft((d) => ({ ...d, [id]: { ...d[id], ...payload } as Player }));

      setMsg(`Gespeichert: ${payload.name}`);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Fehler beim Speichern."));
    } finally {
      setSavingId(null);
    }
  }

  async function createPlayer() {
    const name = window.prompt("Name des neuen Spielers:");
    if (!name || !name.trim()) return;

    try {
      setSavingId(-1);
      setErr(null);
      setMsg(null);

      const { data, error } = await supabase
        .from("players")
        .insert({
          name: name.trim(),
          is_active: true,
          age_group: null,
          preferred_position: null,
          strength: null,
        })
        .select("id, name, age_group, preferred_position, strength, is_active")
        .single();

      if (error) throw error;

      const p = data as Player;
      setPlayers((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name, "de")));
      setDraft((d) => ({ ...d, [p.id]: { ...p } }));

      setMsg(`Spieler angelegt: ${p.name}`);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Fehler beim Anlegen."));
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <div className="p-4 text-sm text-slate-500">Lade Spieler…</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Admin · Spieler</h1>
          <div className="text-xs text-slate-500">Ü32/AH + Position + Stärke bearbeiten</div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-xs border rounded-lg px-2 py-1 bg-white">
            ← Admin
          </Link>
          <button
            onClick={createPlayer}
            disabled={savingId === -1}
            className="text-xs border rounded-lg px-2 py-1 bg-emerald-50"
          >
            {savingId === -1 ? "Erstelle…" : "Neuer Spieler"}
          </button>
        </div>
      </div>

      {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{err}</div>}
      {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{msg}</div>}

      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Spieler suchen…"
          className="rounded-lg border px-3 py-1.5 text-sm bg-white"
        />
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Inaktive anzeigen
        </label>

        <button onClick={load} className="text-xs border rounded-lg px-2 py-1 bg-white">
          Neu laden
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((p) => {
          const d = draft[p.id] ?? p;
          const dirty = isDirty(p.id);

          return (
            <div key={p.id} className="rounded-xl border bg-white p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">#{p.id}</div>
                  <div className="text-sm font-semibold truncate">{p.name}</div>
                </div>

                <button
                  onClick={() => savePlayer(p.id)}
                  disabled={!dirty || savingId === p.id}
                  className={`text-xs border rounded-lg px-3 py-1.5 shadow-sm ${
                    !dirty || savingId === p.id ? "opacity-60 cursor-not-allowed bg-white" : "bg-emerald-50"
                  }`}
                >
                  {savingId === p.id ? "Speichere…" : dirty ? "Speichern" : "Gespeichert"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500">Name</div>
                  <input
                    value={d.name ?? ""}
                    onChange={(e) => setField(p.id, { name: e.target.value })}
                    className="w-full rounded-lg border px-3 py-1.5 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500">Gruppe</div>
                  <select
                    value={d.age_group ?? ""}
                    onChange={(e) =>
                      setField(p.id, { age_group: e.target.value === "" ? null : (e.target.value as AgeGroup) })
                    }
                    className="w-full rounded-lg border px-3 py-1.5 text-sm bg-white"
                  >
                    <option value="">—</option>
                    <option value="AH">AH</option>
                    <option value="Ü32">Ü32</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500">Position</div>
                  <select
                    value={d.preferred_position ?? ""}
                    onChange={(e) =>
                      setField(p.id, {
                        preferred_position: e.target.value === "" ? null : (e.target.value as PreferredPosition),
                      })
                    }
                    className="w-full rounded-lg border px-3 py-1.5 text-sm bg-white"
                  >
                    <option value="">—</option>
                    <option value="goalkeeper">Torwart</option>
                    <option value="defense">Hinten</option>
                    <option value="attack">Vorne</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500">Stärke (1–5)</div>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={d.strength ?? ""}
                    onChange={(e) => setField(p.id, { strength: toStrength(e.target.value) })}
                    className="w-full rounded-lg border px-3 py-1.5 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-500">Aktiv</div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={d.is_active !== false}
                      onChange={(e) => setField(p.id, { is_active: e.target.checked })}
                    />
                    {d.is_active !== false ? "aktiv" : "inaktiv"}
                  </label>
                </div>
              </div>

              <div className="text-[11px] text-slate-500">
                Tipp: Änderung machen → „Speichern“ drücken (pro Spieler).
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <div className="text-sm text-slate-500">Keine Spieler gefunden.</div>}
    </div>
  );
}