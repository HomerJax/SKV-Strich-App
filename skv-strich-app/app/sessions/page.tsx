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

export default async function SessionsPage() {
  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name, start_date, end_date")
    .order("start_date", { ascending: false });

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, date, notes, season_id")
    .order("date", { ascending: false });

  // Gruppieren nach Saison
  const seasonMap = new Map<number, Season>();
  (seasons ?? []).forEach((s: any) => seasonMap.set(s.id, s as Season));

  const groups: Record<string, SessionRow[]> = {};
  const withoutSeason: SessionRow[] = [];

  (sessions ?? []).forEach((t: any) => {
    const row = t as SessionRow;
    if (!row.season_id) {
      withoutSeason.push(row);
    } else {
      const name = seasonMap.get(row.season_id)?.name ?? "Unbekannte Saison";
      groups[name] = groups[name] ?? [];
      groups[name].push(row);
    }
  });

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

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          Fehler: {error.message}
        </div>
      )}

      {/* Saison-Gruppen */}
      <div className="space-y-3">
        {Object.entries(groups).map(([seasonName, list]) => (
          <div key={seasonName} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs font-semibold text-slate-700 mb-2">{seasonName}</div>

            <div className="space-y-2">
              {list.map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="block rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm hover:bg-slate-50"
                >
                  <div className="font-semibold text-slate-900">
                    {new Date(s.date).toLocaleDateString("de-DE")}
                  </div>
                  {s.notes && <div className="text-xs text-slate-500">{s.notes}</div>}
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Ohne Saison (sollte selten sein) */}
        {withoutSeason.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs font-semibold text-amber-800 mb-2">Ohne Saison</div>
            <div className="space-y-2">
              {withoutSeason.map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="block rounded-xl border border-amber-200 bg-white px-3 py-3 shadow-sm hover:bg-amber-100"
                >
                  <div className="font-semibold text-slate-900">
                    {new Date(s.date).toLocaleDateString("de-DE")}
                  </div>
                  {s.notes && <div className="text-xs text-slate-500">{s.notes}</div>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
