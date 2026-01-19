"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type Player = {
  id: number;
  name: string;
  age_group: string | null; // AH | Ü32
  preferred_position: string | null; // defense | attack | goalkeeper
  is_active: boolean | null;
  strength: number | null; // 1..5
};

function posLabel(p: string | null) {
  if (p === "defense") return "Hinten";
  if (p === "attack") return "Vorne";
  if (p === "goalkeeper") return "Torwart";
  return "Unbekannt";
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // lokale Änderungen (id -> strength)
  const [changes, setChanges] = useState<Record<number, number>>({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data, error } = await supabase
          .from("players")
          .select("id, name, age_group, preferred_position, is_active, strength")
          .order("name", { ascending: true });

        if (error) throw error;

        setPlayers((data ?? []) as Player[]);
      } catch (e: any) {
        setErr(e?.message ?? "Fehler beim Laden.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = players.filter((p) => p.is_active !== false);
    if (!needle) return list;
    return list.filter((p) => p.name.toLowerCase().includes(needle));
  }, [players, q]);

  function getStrength(p: Player) {
    return changes[p.id] ?? p.strength ?? 3;
  }

  function setStrength(id: number, val: number) {
    setChanges((c) => ({ ...c, [id]: val }));
  }

  async function saveAll() {
    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const ids = Object.keys(changes).map(Number);
      if (ids.length === 0) {
        setMsg("Keine Änderungen zum Speichern.");
        return;
      }

      // Updates einzeln (simpel & zuverlässig)
      for (const id of ids) {
        const val = changes[id];
        const { error } = await supabase.from("players").update({ strength: val }).eq("id", id);
        if (error) throw error;
      }

      // lokale Playerliste aktualisieren
      setPlayers((prev) =>
        prev.map((p) => (changes[p.id] != null ? { ...p, strength: changes[p.id] } : p))
      );

      setChanges({});
      setMsg("Stärken gespeichert ✅");
    } catch (e: any) {
      setErr(e?.message ?? "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4 text-sm text-slate-500">Lade…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-700">
              ← Admin
            </Link>
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-700">
              ← Start
            </Link>
          </div>

          <h1 className="mt-2 text-lg font-semibold text-slate-900">Admin · Stärken</h1>
          <p className="text-xs text-slate-500">
            Stärke (1–5) ist nur für Team-Balancing. Spieler sehen das nicht.
          </p>
        </div>

        <button
          onClick={saveAll}
          disabled={saving}
          className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
        >
          {saving ? "Speichere…" : "Alle speichern"}
        </button>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          Fehler: {err}
        </div>
      )}
      {msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          {msg}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-700">Suche</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Spielername…"
            className="w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
          />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
          >
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 truncate">{p.name}</div>
              <div className="text-[11px] text-slate-500">
                {p.age_group ?? "?"} · {posLabel(p.preferred_position)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-[11px] text-slate-500">Stärke</div>
              <select
                value={getStrength(p)}
                onChange={(e) => setStrength(p.id, Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
