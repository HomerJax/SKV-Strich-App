"use client";

import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="space-y-4">
      <div>
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-700">
          ← Zur Startseite
        </Link>
      </div>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">Admin</h1>
        <p className="text-xs text-slate-500">
          Verwaltung der App (nur für dich).
        </p>
      </div>

      <div className="grid gap-2">
        {/* Bestehende Spieler + Stärke setzen */}
        <Link
          href="/admin/players"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
        >
          <div className="text-sm font-semibold text-slate-900">
            Spieler & Stärken
          </div>
          <div className="text-xs text-slate-500">
            Bestehende Spieler bearbeiten + Stärke (1–5) setzen
          </div>
        </Link>

        {/* Bestehende Saisonverwaltung falls du sie hast */}
        <Link
          href="/admin/seasons"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
        >
          <div className="text-sm font-semibold text-slate-900">Saisons</div>
          <div className="text-xs text-slate-500">
            Saison-Daten pflegen (Start/Ende)
          </div>
        </Link>

        {/* Spieler hinzufügen (wenn du es getrennt behalten willst) */}
        <Link
          href="/players/new"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50"
        >
          <div className="text-sm font-semibold text-slate-900">
            Spieler hinzufügen
          </div>
          <div className="text-xs text-slate-500">
            Neuen Spieler zum Kader hinzufügen
          </div>
        </Link>
      </div>
    </div>
  );
}
