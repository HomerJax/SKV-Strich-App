import Link from "next/link";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PublicPlayer } from "@/lib/types/player";
import { getPlayerDisplayName } from "@/lib/player-display";

type PlayerListItem = PublicPlayer & {
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
};

function positionLabel(pos: PublicPlayer["preferred_position"]) {
  if (pos === "defense") return "Hinten";
  if (pos === "attack") return "Vorne";
  if (pos === "goalkeeper") return "Torwart";
  return "Position offen";
}

function sortPlayersByDisplayName(players: PlayerListItem[]) {
  return [...players].sort((a, b) =>
    getPlayerDisplayName(a).localeCompare(getPlayerDisplayName(b), "de")
  );
}

export default async function PlayersPage() {
  await requireClub();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_players_public");

  const players = sortPlayersByDisplayName(
    ((data ?? []) as PlayerListItem[]).filter((p) => p.is_active !== false)
  );

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/"
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          ← Zur Startseite
        </Link>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Spieler</h1>
          <p className="text-xs text-slate-500">
            Kader für den aktiven Club.
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

      {!error && players.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
          Noch keine Spieler vorhanden.
        </div>
      )}

      {!error && players.length > 0 && (
        <ul className="space-y-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            >
              <div>
                <div className="font-medium text-slate-900">
                  {getPlayerDisplayName(player)}
                </div>
                <div className="text-[11px] text-slate-500">
                  {player.age_group ?? "?"} ·{" "}
                  {positionLabel(player.preferred_position)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}