import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export const dynamic = "force-dynamic";

type Season = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type SessionRow = {
  id: number;
  date: string;
  notes: string | null;
  season_id: number | null;
};

function fmtDateDE(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function SessionsPage() {
  const { data: seasons, error: sErr } = await supabase
    .from("seasons")
    .select("id, name, start_date, end_date")
    .order("start_date", { ascending: false });

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, date, notes, season_id")
    .order("date", { ascending: false });

  // seasonId -> season
  const seasonMap = new Map<number, Season>();
  (seasons ?? []).forEach((s: any) => seasonMap.set(s.id, s as Season));

  // seasonId -> sessions[]
  const seasonSessions = new Map<number, SessionRow[]>();
  const withoutSeason: SessionRow[] = [];

  (sessions ?? []).forEach((t: any) => {
    const row = t as SessionRow;
    if (!row.season_id) {
      withoutSeason.push(row);
    } else {
      const arr = seasonSessions.get(row.season_id) ?? [];
      arr.push(row);
      seasonSessions.set(row.season_id, arr);
    }
  });

  // Sortierte Saisonliste (neueste oben)
  const seasonListSorted = (seasons ?? []).slice() as Season[];

  // Innerhalb jeder Saison: Termine neueste oben
  for (const [sid, arr] of seasonSessions.entries()) {
    arr.sort((a, b) => (a.date < b.date ? 1 : -1));
    seasonSessions.set(sid, arr);
  }

  // Ohne Saison: neueste oben
  withoutSeason.sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-4">
      <div>
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-700">
          ← Zur Startseite
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Trainings</h1>
          <p className="text-xs text-slate-500">Termine, Teams & Ergebnisse.</p>
        </div>

        <Link
          href="/sessions/new"
          className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white shadow-sm"
        >
          + Neues Training
        </Link>
      </div>

      {(sErr || error) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          Fehler: {sErr?.message ?? error?.message}
        </div>
      )}

      <div className="space-y-3">
        {/* Saisons (neueste zuerst) */}
        {seasonListSorted.map((season) => {
          const list = seasonSessions.get(season.id) ?? [];
          if (list.length === 0) return null;

          return (
            <div
              key={season.id}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="text-xs font-semibold text-slate-700 mb-2">
                {season.name}
              </div>

              <div className="space-y-2">
                {list.map((s) => (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className="block rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm hover:bg-slate-50"
                  >
                    <div className="font-semibold text-slate-900">
                      {fmtDateDE(s.date)}
                    </div>
                    {s.notes && (
                      <div className="text-xs text-slate-500">{s.notes}</div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {/* Ohne Saison ganz unten */}
        {withoutSeason.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs font-semibold text-amber-800 mb-2">
              Ohne Saison
            </div>
            <div className="space-y-2">
              {withoutSeason.map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="block rounded-xl border border-amber-200 bg-white px-3 py-3 shadow-sm hover:bg-amber-100"
                >
                  <div className="font-semibold text-slate-900">
                    {fmtDateDE(s.date)}
                  </div>
                  {s.notes && (
                    <div className="text-xs text-slate-500">{s.notes}</div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
