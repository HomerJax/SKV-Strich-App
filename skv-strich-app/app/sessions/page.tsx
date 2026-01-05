import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type SessionRow = {
  id: number;
  date: string;
  notes: string | null;
  season_id: number | null;
};

type SeasonRow = {
  id: number;
  name: string;
};

export default async function SessionsPage() {
  const [{ data: sessions }, { data: seasons }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, date, notes, season_id")
      .order("date", { ascending: false }),
    supabase.from("seasons").select("id, name").order("start_date", {
      ascending: true,
    }),
  ]);

  const seasonMap = new Map<number, string>();
  (seasons || []).forEach((s) => {
    seasonMap.set(s.id, s.name);
  });

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
            Training / Termine
          </h1>
          <p className="text-xs text-slate-500">
            Anwesenheit, Teams & Ergebnisse.
          </p>
        </div>

        <Link
          href="/sessions/new"
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50"
        >
          + Neuer Termin
        </Link>
      </div>

      {/* Liste */}
      {(!sessions || sessions.length === 0) ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
          Noch keine Termine angelegt.
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const d = new Date(s.date);
            const formatted = d.toLocaleDateString("de-DE", {
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });

            const seasonName =
              s.season_id ? seasonMap.get(s.season_id) ?? "" : "";

            return (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {formatted}
                  </div>

                  {/* 👉 Nur anzeigen, wenn eine Saison existiert */}
                  {seasonName && (
                    <div className="text-[11px] text-slate-500">
                      {seasonName}
                      {s.notes ? ` · ${s.notes}` : null}
                    </div>
                  )}

                  {/* Wenn nur Notiz, aber keine Saison */}
                  {!seasonName && s.notes && (
                    <div className="text-[11px] text-slate-500">
                      {s.notes}
                    </div>
                  )}
                </div>

                <span className="text-[11px] text-slate-400">Verwalten →</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
