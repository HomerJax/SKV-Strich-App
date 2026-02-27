/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default async function PlayersPage() {
  const { data: players, error } = await supabase
    .from("players")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div className="space-y-4">
      {/* Zurück zur Startseite */}
      <div>
        <Link
          href="/"
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          ← Zur Startseite
        </Link>
      </div>

      {/* Kopfbereich */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Spieler
          </h1>
          <p className="text-xs text-slate-500">
            Kader für die App.
          </p>
        </div>

        <Link
          href="/players/new"
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50"
        >
          + Spieler
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          Fehler beim Laden: {error.message}
        </div>
      )}

      {!players || players.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
          Noch keine Spieler vorhanden.
        </div>
      ) : (
        <ul className="space-y-2">
          {players.map((p: any) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            >
              <div>
                <div className="font-medium text-slate-900">{p.name}</div>
                <div className="text-[11px] text-slate-500">
                  {p.age_group ?? "?"} ·{" "}
                  {p.preferred_position === "defense"
                    ? "Hinten"
                    : p.preferred_position === "attack"
                    ? "Vorne"
                    : p.preferred_position === "goalkeeper"
                    ? "Torwart"
                    : "Position offen"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
