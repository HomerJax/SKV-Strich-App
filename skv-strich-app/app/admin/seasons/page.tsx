"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type Season = {
  id: number;
  name: string;
  start_date: string | null;
};

export default function SeasonsAdminPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSeasons() {
    const { data, error } = await supabase
      .from("seasons")
      .select("id, name, start_date")
      .order("start_date", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }
    setSeasons(data ?? []);
  }

  useEffect(() => {
    loadSeasons();
  }, []);

  async function addSeason(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);

    if (!name.trim()) {
      setError("Name darf nicht leer sein.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from("seasons").insert({
        name: name.trim(),
        start_date: startDate ? startDate : null,
      });
      if (error) throw error;
      setName("");
      setStartDate("");
      setMsg("Saison angelegt.");
      await loadSeasons();
    } catch (e: any) {
      setError(e.message ?? "Fehler beim Anlegen.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSeason(id: number) {
    if (!confirm("Saison wirklich löschen? (Sessions behalten ihre season_id)"))
      return;
    setError(null);
    setMsg(null);
    try {
      setLoading(true);
      const { error } = await supabase
        .from("seasons")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await loadSeasons();
    } catch (e: any) {
      setError(e.message ?? "Fehler beim Löschen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">
        Saisons verwalten
      </h1>

      {/* Neue Saison */}
      <form onSubmit={addSeason} className="space-y-2 rounded-xl border bg-white p-3">
        <div className="text-xs font-semibold text-slate-700">
          Neue Saison
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="flex-1 rounded-md border px-2 py-1 text-sm"
            placeholder="z.B. Saison 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="date"
            className="rounded-md border px-2 py-1 text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md border px-3 py-1 text-sm bg-emerald-50"
          >
            {loading ? "Speichere…" : "Anlegen"}
          </button>
        </div>
        {msg && (
          <div className="text-[11px] text-emerald-600">{msg}</div>
        )}
        {error && (
          <div className="text-[11px] text-red-600">{error}</div>
        )}
      </form>

      {/* Liste Saisons */}
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs font-semibold text-slate-700 mb-2">
          Bestehende Saisons
        </div>
        {seasons.length === 0 ? (
          <div className="text-xs text-slate-500">
            Noch keine Saisons angelegt.
          </div>
        ) : (
          <ul className="space-y-1 text-sm">
            {seasons.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-md border px-2 py-1"
              >
                <div>
                  <div className="font-medium">{s.name}</div>
                  {s.start_date && (
                    <div className="text-[11px] text-slate-500">
                      Start:{" "}
                      {new Date(s.start_date).toLocaleDateString("de-DE")}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteSeason(s.id)}
                  className="text-[11px] text-red-600"
                >
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
