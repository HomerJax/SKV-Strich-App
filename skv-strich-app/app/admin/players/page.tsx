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

  // lokale Änderungen (id -> patch)
  const [patches, setPatches] = useState<
    Record<number, Partial<Pick<Player, "strength" | "is_active">>>
  >({});

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
    if (!needle) return players;
    return players.filter((p) => p.name.toLowerCase().includes(needle));
  }, [players, q]);

  function currentStrength(p: Player): number {
    const patched = patches[p.id]?.strength;
    const base = p.strength ?? 3;
    return (patched ?? base) as number;
  }

  function currentActive(p: Player): boolean {
    // WICHTIG: immer boolean zurückgeben
    const patched = patches[p.id]?.is_active;
    if (patched === true) return true;
    if (patched === false) return false;

    // DB: null bedeutet bei dir "aktiv" (default true)
    return p.is_active !== false;
  }

  function setStrength(id: number, strength: number) {
    setPatches((prev) => ({ ...prev, [id]: { ...prev[id], strength } }));
  }

  function toggleActive(id: number, active: boolean) {
    setPatches((prev) => ({ ...prev, [id]: { ...prev[id], is_active: active } }));
  }

  async function saveAll() {
    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const ids = Object.keys(patches).map(Number);
      if (ids.length === 0) {
        setMsg("Keine Änderungen zum Speichern.");
        return;
      }

      for (const id of ids) {
        const patch = patches[id];
        const { error } = await supabase.from("players").update(patch).eq("id", id);
        if (error) throw error;
      }

      // lokal aktualisieren
      setPlayers((prev) =>
        prev.map((p) => (patches[p.id] ? { ...p, ...patches[p.id] } : p))
      );

      setPatches({});
      setMsg("Gespeichert ✅");
    } catch (e: any) {
      setErr(e?.message ?? "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4 text-sm text-slate-500">Lade…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-700">
              ← Admin
            </Link>
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-700">
              ← Start
            </Link>
          </div>

          <h1 className="mt-2 text-lg font-semibold text-slate-900">
            Spieler & Stärken
          </h1>
          <p className="text-xs text-slate-500">
            Stärke (1–5) wird nur für Team-Balancing genutzt und nicht angezeigt.
          </p>
        </div>

        <button
          onClick={saveAll}
          disabled={saving}
          className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
        >
          {saving ? "Speichere…" : "Speichern"}
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
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                <div className="text-[11px] text-slate-500">
                  {p.age_group ?? "?"} · {posLabel(p.preferred_position)}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Stärke</span>
                  <select
                    value={currentStrength(p)}
                    onChange={(e) => setStrength(p.id, Number(e.target.value))}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                </label>

                <label className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Aktiv</span>
                  <input
                    type="checkbox"
                    checked={currentActive(p)}  // <- jetzt immer boolean ✅
                    onChange={(e) => toggleActive(p.id, e.target.checked)}
                  />
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
        Hinweis: Name/Position/Altersgruppe kannst du weiterhin im Supabase Table Editor ändern
        (oder wir bauen dir eine Edit-Seite pro Spieler).
      </div>
    </div>
  );
}
