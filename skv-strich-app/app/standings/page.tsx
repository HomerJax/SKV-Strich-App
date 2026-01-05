"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Season = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type Player = {
  id: number;
  name: string;
};

type Session = {
  id: number;
  season_id: number | null;
  date: string;
};

type SessionPlayer = {
  session_id: number;
  player_id: number;
};

type Result = {
  session_id: number;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

type Team = {
  id: number;
  session_id: number | null;
};

type TeamPlayer = {
  team_id: number;
  player_id: number;
};

type Row = {
  player_id: number;
  name: string;
  participated: number;
  wins: number;
};

//
// Wrapper-Seite mit Suspense, damit useSearchParams erlaubt ist
//
export default function StandingsPageWrapper() {
  return (
    <Suspense fallback={<div className="p-4">Standings werden geladen…</div>}>
      <StandingsInner />
    </Suspense>
  );
}

//
// Innere Client-Komponente mit eigentlicher Logik
//
function StandingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Query-Parameter "season"
  const seasonParam = searchParams.get("season") ?? "";

  // "all" = ewige Tabelle, sonst Season-ID
  const selectedSeasonId: number | "all" | null = useMemo(() => {
    if (!seasonParam) return null;
    if (seasonParam === "all") return "all";
    const n = Number(seasonParam);
    return Number.isNaN(n) ? null : n;
  }, [seasonParam]);

  // Seasons laden
  useEffect(() => {
    let cancelled = false;

    async function loadSeasons() {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .order("start_date", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error(error);
        setError("Fehler beim Laden der Saisons.");
        return;
      }

      setSeasons(data || []);
    }

    loadSeasons();

    return () => {
      cancelled = true;
    };
  }, []);

  // Standings laden, sobald Saisons da sind oder sich die Auswahl ändert
  useEffect(() => {
    let cancelled = false;

    async function loadStandings() {
      setLoading(true);
      setError(null);

      try {
        // Spieler
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, name")
          .order("name", { ascending: true });

        if (playersError) throw playersError;
        const players: Player[] = playersData || [];

        // Sessions (alle – wir filtern in JS)
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("sessions")
          .select("id, season_id, date")
          .order("date", { ascending: true });

        if (sessionsError) throw sessionsError;
        const sessions: Session[] = sessionsData || [];

        // session_players (Anwesenheit)
        const { data: spData, error: spError } = await supabase
          .from("session_players")
          .select("session_id, player_id");

        if (spError) throw spError;
        const sessionPlayers: SessionPlayer[] = spData || [];

        // results (Ergebnisse)
        const { data: resultsData, error: resultsError } = await supabase
          .from("results")
          .select("session_id, team_a_id, team_b_id, goals_team_a, goals_team_b");

        if (resultsError) throw resultsError;
        const results: Result[] = resultsData || [];

        // teams
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("id, session_id");

        if (teamsError) throw teamsError;
        const teams: Team[] = teamsData || [];

        // team_players
        const { data: tpData, error: tpError } = await supabase
          .from("team_players")
          .select("team_id, player_id");

        if (tpError) throw tpError;
        const teamPlayers: TeamPlayer[] = tpData || [];

        // --- Filter: welche Sessions gehören in die Auswertung? ---

        let relevantSessionIds: number[];

        if (selectedSeasonId === "all") {
          // Ewige Tabelle = alle Sessions aller Saisons
          relevantSessionIds = sessions.map((s) => s.id);
        } else {
          let seasonIdToUse: number | null = selectedSeasonId;

          // Wenn noch keine Season aus URL, nimm die letzte (aktuellste)
          if (seasonIdToUse === null && seasons.length > 0) {
            const last = seasons[seasons.length - 1];
            seasonIdToUse = last.id;
          }

          if (!seasonIdToUse) {
            // keine Saisons im System
            relevantSessionIds = [];
          } else {
            relevantSessionIds = sessions
              .filter((s) => s.season_id === seasonIdToUse)
              .map((s) => s.id);
          }
        }

        // --- Teilnahmen zählen ---

        const participationMap = new Map<number, number>();
        for (const sp of sessionPlayers) {
          if (!relevantSessionIds.includes(sp.session_id)) continue;
          participationMap.set(
            sp.player_id,
            (participationMap.get(sp.player_id) ?? 0) + 1
          );
        }

        // --- Siege zählen ---

        // Hilfstabellen
        const teamToPlayers = new Map<number, number[]>();
        for (const tp of teamPlayers) {
          if (!teamToPlayers.has(tp.team_id)) {
            teamToPlayers.set(tp.team_id, []);
          }
          teamToPlayers.get(tp.team_id)!.push(tp.player_id);
        }

        const winsMap = new Map<number, number>();

        for (const r of results) {
          if (!relevantSessionIds.includes(r.session_id)) continue;
          if (
            r.goals_team_a == null ||
            r.goals_team_b == null ||
            r.team_a_id == null ||
            r.team_b_id == null
          ) {
            continue;
          }

          if (r.goals_team_a === r.goals_team_b) {
            // Unentschieden = kein Sieg
            continue;
          }

          const winningTeamId =
            r.goals_team_a > r.goals_team_b ? r.team_a_id : r.team_b_id;

          const winners = teamToPlayers.get(winningTeamId) || [];
          for (const pid of winners) {
            winsMap.set(pid, (winsMap.get(pid) ?? 0) + 1);
          }
        }

        // --- Tabelle bauen ---

        const tableRows: Row[] = players.map((p) => ({
          player_id: p.id,
          name: p.name,
          participated: participationMap.get(p.id) ?? 0,
          wins: winsMap.get(p.id) ?? 0,
        }));

        // Nur Spieler anzeigen, die überhaupt einmal teilgenommen haben
        const filteredRows = tableRows.filter((r) => r.participated > 0);

        filteredRows.sort((a, b) => {
          // zuerst nach Siegen
          if (b.wins !== a.wins) return b.wins - a.wins;
          // dann nach Teilnahmen
          if (b.participated !== a.participated) {
            return b.participated - a.participated;
          }
          // dann alphabetisch
          return a.name.localeCompare(b.name);
        });

        if (!cancelled) {
          setRows(filteredRows);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Fehler beim Laden der Tabelle.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    // Seasons müssen vorher geladen sein, sonst wissen wir nicht,
    // welche Season standardmäßig aktiv ist
    if (seasons.length > 0) {
      loadStandings();
    }

    return () => {
      cancelled = true;
    };
  }, [selectedSeasonId, seasons]);

  // Standard-Season setzen, wenn noch keine in der URL
  useEffect(() => {
    if (seasons.length === 0) return;
    if (selectedSeasonId !== null) return; // schon gesetzt

    const last = seasons[seasons.length - 1];
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("season", String(last.id));
    router.replace(`/standings?${params.toString()}`);
  }, [seasons, selectedSeasonId, router, searchParams]);

  const handleSeasonChange = (value: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("season", value);
    router.replace(`/standings?${params.toString()}`);
  };

  const seasonLabel = (() => {
    if (seasonParam === "all") return "Ewige Tabelle";
    const season = seasons.find((s) => String(s.id) === seasonParam);
    return season ? season.name : "";
  })();

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Standings / Strichliste
          </h1>
          <p className="text-xs text-slate-500">
            Platzierung je nach Siegen und Trainings­teilnahmen.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Saison:</label>
          <select
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            value={seasonParam || ""}
            onChange={(e) => handleSeasonChange(e.target.value)}
          >
            {/* Aktuelle Saisons */}
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{" "}
                {s.start_date ? `(ab ${new Date(s.start_date).toLocaleDateString("de-DE")})` : ""}
              </option>
            ))}

            {/* Ewige Tabelle */}
            <option value="all">Ewige Tabelle (alle Saisons)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Tabelle wird geladen…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Noch keine Daten für diese Auswahl vorhanden.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 text-left">Platz</th>
                <th className="px-3 py-2 text-left">Spieler</th>
                <th className="px-3 py-2 text-right">Teilnahmen</th>
                <th className="px-3 py-2 text-right">Siege</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.player_id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/80"}
                >
                  <td className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-600">
                    {idx + 1}.
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-slate-800">
                    {row.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-slate-700">
                    {row.participated}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold text-slate-900">
                    {row.wins}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
            {seasonLabel && (
              <span>
                Ansicht: <strong>{seasonLabel}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
