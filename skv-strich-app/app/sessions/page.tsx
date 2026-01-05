import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type SessionRow = {
  id: number;
  date: string;
  notes: string | null;
};

export default async function SessionsPage() {
  // Sessions holen
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, date, notes")
    .order("date", { ascending: false });

  if (error) {
    return <p className="text-red-600">Fehler: {error.message}</p>;
  }

  const sessionsList = sessions ?? [];

  // Für Status & Teilnehmer Infos
  async function getSessionInfo(id: number) {
    const [{ data: result }, { data: players }] = await Promise.all([
      supabase
        .from("results")
        .select("id")
        .eq("session_id", id)
        .maybeSingle(),

      supabase
        .from("session_players")
        .select("player_id")
        .eq("session_id", id),
    ]);

    const hasResult = !!result;
    const participants = players?.length ?? 0;

    let statusLabel = "Kein Ergebnis";
    let statusColor = "bg-red-100 text-red-700";

    if (participants > 0 && !hasResult) {
      statusLabel = "Nur Anwesenheit";
      statusColor = "bg-amber-100 text-amber-700";
    }

    if (hasResult) {
      statusLabel = "Ergebnis gespeichert";
      statusColor = "bg-emerald-100 text-emerald-700";
    }

    return { participants, statusLabel, statusColor };
  }

  const infos = await Promise.all(
    sessionsList.map((s) => getSessionInfo(s.id))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Trainings &amp; Spieltage
        </h1>

        <Link
          href="/sessions/new"
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          + Neuer Termin
        </Link>
      </div>

      {sessionsList.length === 0 && (
        <p className="text-sm text-slate-600">
          Noch keine Trainings oder Spieltage erfasst.
        </p>
      )}

      <div className="space-y-3">
        {sessionsList.map((s, idx) => {
          const info = infos[idx];

          const formattedDate = new Date(s.date).toLocaleDateString("de-DE", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });

          return (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {/* Links: Datum & Notiz */}
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {formattedDate}
                  </div>

                  {s.notes && (
                    <div className="text-xs text-slate-500">
                      {s.notes}
                    </div>
                  )}
                </div>

                {/* Rechts: Status + Teilnehmer */}
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${info.statusColor}`}
                  >
                    {info.statusLabel}
                  </span>

                  <div className="text-xs text-slate-600">
                    <strong>{info.participants}</strong> Teilnehmer
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
