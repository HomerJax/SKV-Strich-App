"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Season = {
  id: number;
  name: string;
  start_date: string | null;
};

type StandingRow = {
  player_id: number;
  name: string;
  participated: number;
  wins: number;
};

export default function StandingsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | "all">(
    "all"
  );
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [movement, setMovement] = useState<Map<number, number | null>>(
    new Map()
  );
  const [ranks, setRanks] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Platz-Berechnung mit Gleichstand (Siege & Teilnahmen)
  function computeRanks(list: StandingRow[]): Map<number, number> {
    const rankMap = new Map<number, number>();
    let currentRank = 0;
    let lastWins: number | null = null;
    let lastPart: number | null = null;

    list.forEach((row, index) => {
      if (index === 0) {
        currentRank = 1;
      } else {
        if (row.wins === lastWins && row.participated === lastPart) {
          // gleicher Platz wie vorher
        } else {
          currentRank = index + 1;
        }
      }

      rankMap.set(row.player_id, currentRank);
      lastWins = row.wins;
      lastPart = row.participated;
    });

    return rankMap;
  }

  // Saisons laden
  useEffect(() => {
    async function loadSeasons() {
      const { data, error } = await supabase
        .from("seasons")
        .select("id, name, start_date")
        .order("start_date", { ascending: false });

      if (error) {
        setError(error.message);
        return;
      }

      const list = data ?? [];
      setSeasons(list);

      if (list.length > 0) {
        // neueste Saison als Standard
        setSelectedSeasonId(String(list[0].id));
      } else {
        setSelectedSeasonId("all");
      }
    }

    loadSeasons();
  }, []);

  // Tabelle + Bewegung laden
  useEffect(() => {
    async function loadStandings() {
      setLoading(true);
      setError(null);
      try {
        // Sessions bestimmen
        let sessionsQuery = supabase
          .from("sessions")
          .select("id, season_id, date");

        if (selectedSeasonId !== "all") {
          sessionsQuery = sessionsQuery.eq(
            "season_id",
            Number(selectedSeasonId)
          );
        }

        const { data: sessions, error: sessionsErr } = await sessionsQuery;
        if (sessionsErr) throw sessionsErr;

        const sessionIds = (sessions ?? []).map((s) => s.id as number);
        if (sessionIds.length === 0) {
          setRows([]);
          setMovement(new Map());
          setRanks(new Map());
          setLoading(false);
          return;
        }

        const [
          { data: players, error: playersErr },
          { data: sessionPlayers, error: spErr },
          { data: teams, error: teamsErr },
          { data: teamPlayers, error: tpErr },
          { data: results, error: resultsErr },
        ] = await Promise.all([
          supabase.from("players").select("id, name"),
          supabase
            .from("session_players")
            .select("session_id, player_id")
            .in("session_id", sessionIds),
          supabase
            .from("teams")
            .select("id, session_id, name")
            .in("session_id", sessionIds),
          supabase.from("team_players").select("team_id, player_id"),
          supabase
            .from("results")
            .select(
              "session_id, team_a_id, team_b_id, goals_team_a, goals_team_b"
            )
            .in("session_id", sessionIds),
        ]);

        if (playersErr) throw playersErr;
        if (spErr) throw spErr;
        if (teamsErr) throw teamsErr;
        if (tpErr) throw tpErr;
        if (resultsErr) throw resultsErr;

        const playerMap = new Map<number, string>();
        (players ?? []).forEach((p) => {
          playerMap.set(p.id as number, p.name as string);
        });

        const teamPlayerMap = new Map<number, number[]>();
        (teamPlayers ?? []).forEach((tp) => {
          const tid = tp.team_id as number;
          const pid = tp.player_id as number;
          if (!teamPlayerMap.has(tid)) teamPlayerMap.set(tid, []);
          teamPlayerMap.get(tid)!.push(pid);
        });

        // Stats pro Spieler berechnen
        function computeStats(sessionIdSet: Set<number>): StandingRow[] {
          const stats = new Map<number, StandingRow>();

          (sessionPlayers ?? []).forEach((sp) => {
            const sid = sp.session_id as number;
            if (!sessionIdSet.has(sid)) return;

            const pid = sp.player_id as number;
            if (!playerMap.has(pid)) return;

            if (!stats.has(pid)) {
              stats.set(pid, {
                player_id: pid,
                name: playerMap.get(pid) ?? "Unbekannt",
                participated: 0,
                wins: 0,
              });
            }
            stats.get(pid)!.participated += 1;
          });

          (results ?? []).forEach((r) => {
            const sid = r.session_id as number;
            if (!sessionIdSet.has(sid)) return;

            const aId = r.team_a_id as number | null;
            const bId = r.team_b_id as number | null;
            if (aId == null || bId == null) return;
            if (r.goals_team_a == null || r.goals_team_b == null) return;

            let winnerTeamId: number | null = null;
            if (r.goals_team_a > r.goals_team_b) winnerTeamId = aId;
            else if (r.goals_team_b > r.goals_team_a) winnerTeamId = bId;
            else winnerTeamId = null;

            if (!winnerTeamId) return;

            const playersOfWinner = teamPlayerMap.get(winnerTeamId) ?? [];
            playersOfWinner.forEach((pid) => {
              if (!playerMap.has(pid)) return;

              if (!stats.has(pid)) {
                stats.set(pid, {
                  player_id: pid,
                  name: playerMap.get(pid) ?? "Unbekannt",
                  participated: 0,
                  wins: 0,
                });
              }
              stats.get(pid)!.wins += 1;
            });
          });

          const list = Array.from(stats.values());
          list.sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.participated !== a.participated)
              return b.participated - a.participated;
            return a.name.localeCompare(b.name);
          });

          return list;
        }

        const allSessionSet = new Set(sessionIds);
        const currentList = computeStats(allSessionSet);
        const currentRanks = computeRanks(currentList);

        // Bewegung zur Vorwoche
        const movementMap = new Map<number, number | null>();
        if (sessions && sessions.length > 1) {
          const sessionsSorted = [...sessions].sort(
            (a, b) =>
              new Date(a.date as string).getTime() -
              new Date(b.date as string).getTime()
          );
          const prevSessions = sessionsSorted.slice(0, -1);
          const prevSessionIds = prevSessions.map((s) => s.id as number);
          const prevSet = new Set(prevSessionIds);

          if (prevSessionIds.length > 0) {
            const prevList = computeStats(prevSet);
            const prevRanks = computeRanks(prevList);

            currentList.forEach((row) => {
              const currentRank = currentRanks.get(row.player_id);
              const prevRank = prevRanks.get(row.player_id);
              if (currentRank == null || prevRank == null) {
                movementMap.set(row.player_id, null);
              } else {
                movementMap.set(row.player_id, prevRank - currentRank);
              }
            });
          }
        }

        setRows(currentList);
        setRanks(currentRanks);
        setMovement(movementMap);
      } catch (e: any) {
        setError(e.message ?? "Fehler beim Laden der Tabelle.");
      } finally {
        setLoading(false);
      }
    }

    loadStandings();
  }, [selectedSeasonId]);

  const currentSeasonId = seasons[0]?.id ?? null;

  // PDF-Export der aktuell angezeigten Tabelle
  async function handleExportPdf() {
    if (rows.length === 0) return;

    const jsPDFModule = await import("jspdf");
    const autoTableModule: any = await import("jspdf-autotable");

    const doc = new jsPDFModule.jsPDF({
      orientation: "portrait",
      unit: "pt",
    });

    const title =
      selectedSeasonId === "all"
        ? "Ewige Tabelle"
        : `Tabelle – ${
            seasons.find((s) => String(s.id) === selectedSeasonId)?.name ??
            "Saison"
          }`;

    doc.setFontSize(14);
    doc.text(title, 40, 40);

    const body = rows.map((r) => [
      ranks.get(r.player_id) ?? "",
      r.name,
      r.wins,
      r.participated,
    ]);

    autoTableModule.default(doc, {
      startY: 60,
      head: [["Platz", "Spieler", "Siege", "Teilnahmen"]],
      body,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] }, // dunkles Blau-Grau
    });

    const filenameBase =
      selectedSeasonId === "all"
        ? "ewige-tabelle"
        : `tabelle-saison-${selectedSeasonId}`;
    doc.save(`${filenameBase}.pdf`);
  }

  return (
    <div className="space-y-4">
      {/* Kopf + Saison-Auswahl */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900">Tabellen</h1>

        <div className="flex flex-col items-end gap-1">
          <label className="text-[11px] text-slate-500">Saison:</label>
          <select
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value as any)}
          >
            {currentSeasonId && seasons.length > 0 && (
              <option value={String(currentSeasonId)}>
                {seasons[0].name} (aktuell)
              </option>
            )}
            <option value="all">Ewige Tabelle (alle Saisons)</option>
            {seasons.slice(1).map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Export-Button */}
      {rows.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleExportPdf}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] hover:bg-slate-50"
          >
            Als PDF exportieren
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-xs text-slate-500">Lade Tabelle…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-500">
          Keine Daten für diese Auswahl.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 text-left">Platz</th>
                <th className="px-3 py-2 text-left">Spieler</th>
                <th className="px-3 py-2 text-right">Siege</th>
                <th className="px-3 py-2 text-right">Teilnahmen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rank = ranks.get(r.player_id) ?? 0;
                const delta = movement.get(r.player_id) ?? null;

                let deltaText = "";
                let deltaClass = "";
                if (delta != null && delta !== 0) {
                  if (delta > 0) {
                    deltaText = `▲${delta}`;
                    deltaClass = "text-emerald-600";
                  } else if (delta < 0) {
                    deltaText = `▼${Math.abs(delta)}`;
                    deltaClass = "text-red-600";
                  }
                }

                return (
                  <tr key={r.player_id} className="border-b last:border-b-0">
                    <td className="px-3 py-2 text-left align-middle">
                      <div className="flex items-center gap-1">
                        <span>{rank}.</span>
                        {deltaText && (
                          <span
                            className={`text-[10px] font-medium ${deltaClass}`}
                          >
                            {deltaText}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="font-medium text-slate-900">
                        {r.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right align-middle">
                      {r.wins}
                    </td>
                    <td className="px-3 py-2 text-right align-middle">
                      {r.participated}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
