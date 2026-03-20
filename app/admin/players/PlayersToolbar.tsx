"use client";

import Link from "next/link";

type PlayersToolbarProps = {
  q: string;
  onQueryChange: (value: string) => void;
  showInactive: boolean;
  onShowInactiveChange: (value: boolean) => void;
  onReload: () => void;
  onCreate: () => void;
  creating: boolean;
};

export default function PlayersToolbar({
  q,
  onQueryChange,
  showInactive,
  onShowInactiveChange,
  onReload,
  onCreate,
  creating,
}: PlayersToolbarProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Admin · Spieler</h1>
          <div className="text-xs text-slate-500">
            Namen, Spitznamen, Ü32/AH, Position und Stärke bearbeiten
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin" className="rounded-lg border bg-white px-2 py-1 text-xs">
            ← Admin
          </Link>
          <button
            onClick={onCreate}
            disabled={creating}
            className="rounded-lg border bg-emerald-50 px-2 py-1 text-xs"
          >
            {creating ? "Erstelle…" : "Neuer Spieler"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          value={q}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Spieler suchen…"
          className="rounded-lg border bg-white px-3 py-1.5 text-sm"
        />
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => onShowInactiveChange(e.target.checked)}
          />
          Inaktive anzeigen
        </label>

        <button
          onClick={onReload}
          className="rounded-lg border bg-white px-2 py-1 text-xs"
        >
          Neu laden
        </button>
      </div>
    </>
  );
}