import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

const tiles = [
  { href: "/sessions", title: "Training", icon: "⚽", subtitle: "Termine & Teams" },
  { href: "/standings", title: "Tabellen", icon: "📊", subtitle: "Striche & Siege" },
];

type SessionRow = { id: number; date: string; notes: string | null };

export default async function HomePage() {
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, date, notes")
    .order("date", { ascending: false })
    .limit(1);

  const latest = (sessions ?? [])[0] as SessionRow | undefined;

  let latestLabel: string | null = null;
  if (latest) {
    latestLabel = new Date(latest.date).toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-4">
      {/* Kopf */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">SKV Strich App</h1>
        <p className="text-xs text-slate-500">
          Aufstellung, Striche & Trainings – optimiert fürs Handy.
        </p>
      </div>

      {/* Haupt-Kacheln */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{tile.icon}</span>
            </div>

            <div className="mt-3">
              <div className="text-sm font-semibold text-slate-900">
                {tile.title}
              </div>
              <div className="text-[11px] text-slate-500">
                {tile.subtitle}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Letztes Training (ganz unten vor Admin) */}
      {latest && (
        <Link
          href={`/sessions/${latest.id}`}
          className="block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Letztes Training
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {latestLabel}
              </div>
              {latest.notes && (
                <div className="text-[11px] text-slate-500">
                  {latest.notes}
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-400">Details →</div>
          </div>
        </Link>
      )}

      {/* Admin-Link ganz unten, klein */}
      <div className="pt-2">
        <Link
          href="/admin"
          className="text-[11px] text-slate-400 hover:text-slate-600"
        >
          Admin
        </Link>
      </div>
    </div>
  );
}
