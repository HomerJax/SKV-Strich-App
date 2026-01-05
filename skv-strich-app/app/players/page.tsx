import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type PlayerRow = {
  id: number;
  name: string;
  age_group: string | null; // "AH" | "Ü32"
  preferred_position: string | null; // "defense" | "attack" | "goalkeeper"
  is_active: boolean | null;
};

function positionLabel(pos: string | null) {
  if (pos === "defense") return "Hinten";
  if (pos === "attack") return "Vorne";
  if (pos === "goalkeeper") return "Torwart";
  return "Unbekannt";
}

function positionColor(pos: string | null) {
  if (pos === "defense") return "bg-sky-100 text-sky-800";
  if (pos === "attack") return "bg-orange-100 text-orange-800";
  if (pos === "goalkeeper") return "bg-purple-100 text-purple-800";
  return "bg-slate-100 text-slate-600";
}

function ageColor(age: string | null) {
  if (age === "AH") return "bg-emerald-100 text-emerald-800";
  if (age === "Ü32") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export default async function PlayersPage() {
  const { data: players, error } = await supabase
    .from("players")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Spieler</h1>
        <p className="text-sm text-red-600">
          Fehler beim Laden der Spieler: {error.message}
        </p>
      </div>
    );
  }

  const list: PlayerRow[] = (players ?? []) as PlayerRow[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Spieler</h1>
          <p className="text-xs text-slate-500">
            Altersgruppe, Position und Aktiv-Status zur Steuerung der Aufstellung.
          </p>
        </div>

        <Link
          href="/players/new"
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          + Neuen Spieler hinzufügen
        </Link>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-slate-600">Noch keine Spieler vorhanden.</p>
      ) : (
        <div className="space-y-2">
          {list.map((p) => {
            const isActive = p.is_active ?? true;

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isActive
                    ? "border-slate-200 bg-white"
                    : "border-slate-200 bg-slate-50 opacity-70"
                }`}
              >
                {/* Name + Badges */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {p.name}
                    </span>
                    {!isActive && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                        Inaktiv
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${ageColor(
                        p.age_group
                      )}`}
                    >
                      Altersgruppe: {p.age_group ?? "unbekannt"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${positionColor(
                        p.preferred_position
                      )}`}
                    >
                      Position: {positionLabel(p.preferred_position)}
                    </span>
                  </div>
                </div>

                {/* Optional: später Edit-Link / Stats */}
                {/* <Link
                  href={`/players/${p.id}`}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Details →
                </Link> */}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
