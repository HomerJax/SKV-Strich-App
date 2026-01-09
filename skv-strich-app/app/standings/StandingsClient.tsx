"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import ExportButtons from "@/components/ExportButtons";

type Season = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type Session = {
  id: number;
  date: string;
  season_id: number | null;
};

type StandingRow = {
  player_id: number;
  name: string;
  wins: number;
  sessions: number;
};

type RankRow = StandingRow & {
  rank: number;
  deltaRank: number | null; // + hoch, - runter, 0 gleich, null = keine Vorwoche
};

function sortRows(a: StandingRow, b: StandingRow) {
  if (b.wins !== a.wins) return b.wins - a.wins;
  if (b.sessions !== a.sessions) return b.sessions - a.sessions;
  return a.name.localeCompare(b.name, "de");
}

// Competition ranking: 1,2,2,5...
function addRanks(rows: StandingRow[]): RankRow[] {
  const sorted = [...rows].sort(sortRows);

  let lastWins: number | null = null;
  let lastSessions: number | null = null;
  let currentRank = 0;

  return sorted.map((r, idx) => {
    const tie = idx > 0 && r.wins === lastWins && r.sessions === lastSessions;
    if (!tie) currentRank = idx + 1;

    lastWins = r.wins;
    lastSessions = r.sessions;

    return { ...r, rank: currentRank, deltaRank: null };
  });
}

export default function StandingsClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selected, setSelected] = useState<string>(""); // "all" oder seasonId
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Dropdown: aktuelle Saison zuerst, Ewige Tabelle als 2.
  const options = useMemo(() => {
    const sorted = [...seasons].sort((a, b) => b.id - a.id);
    const first = sorted[0]
      ? [{ value: String(sorted[0].id), label: sorted[0].name }]
      : [];
    const rest = sorted.slice(1).map((s) => ({ value: String(s.id), label: s.name }));

    return [
      ...first,
      { value: "all", label: "Ewige Tabelle" },
      ...rest,
    ];
  }, [seasons]);

  async function fetchSessions(seasonIdOrAll: string) {
    let q = supabase.from("sessions").select("id, date, season_id").order("date", { ascending: true });
    if (seasonIdOrAll !== "all") q = q.eq("season_id", Number(seasonIdOrAll));

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Session[];
  }

  async function computeStandings(sessionIds: number[]) {
    // Anwesenheit
    const { data: spData, error: spErr } = await supabase
      .from("session_players")
      .select("session_id, player_id, players(name)")
      .in("session_id", sessionIds);
    if (spErr) throw spErr;

    // Results + Teams + TeamPlayers
    const { data: rData, error: rErr } = await supabase
      .from("results")
      .select("session_id, goals_team_a, goals_team_b, team_a_id, team_b_id")
      .in("session_id", sessionIds);
    if (rErr) throw rErr;

    const results = (rData ?? []) as any[];

    const teamIds = Array.from(
      new Set(
        results
          .flatMap((r) => [r.team_a_id, r.team_b_id])
          .filter((x) => typeof x === "number")
      )
    ) as number[];

    let teamPlayers: any[] = [];
    if (teamIds.length > 0) {
      const { data: tpData, error: tpErr } = await supabase
        .from("team_players")
        .select("team_id, player_id, players(name)")
        .in("team_id", teamIds);
      if (tpErr) throw tpErr;
      teamPlayers = tpData ?? [];
    }

    const playersByTeam = new Map<number, number[]>();
    for (const tp of teamPlayers) {
      if (!playersByTeam.has(tp.team_id)) playersByTeam.set(tp.team_id, []);
      playersByTeam.get(tp.team_id)!.push(tp.player_id);
    }

    const nameByPlayer = new Map<number, string>();
    for (const row of spData ?? []) {
      const pid = (row as any).player_id as number;
      const nm = (row as any).players?.name ?? "Unbekannt";
      nameByPlayer.set(pid, nm);
    }
    for (const tp of teamPlayers) {
      const pid = tp.player_id as number;
      const nm = tp.players?.name ?? "Unbekannt";
      if (!nameByPlayer.has(pid)) nameByPlayer.set(pid, nm);
    }

    const sessionsCount = new Map<number, number>();
    for (const row of spData ?? []) {
      const pid = (row as any).player_id as number;
      sessionsCount.set(pid, (sessionsCount.get(pid) ?? 0) + 1);
    }

    const winsCount = new Map<number, number>();
    for (const r of results) {
      const ga = r.goals_team_a;
      const gb = r.goals_team_b;
      if (ga == null || gb == null) continue;
      if (ga === gb) continue;

      const winnerTeamId = ga > gb ? r.team_a_id : r.team_b_id;
      if (!winnerTeamId) continue;

      const winnerPlayers = playersByTeam.get(winnerTeamId) ?? [];
      for (const pid of winnerPlayers) {
        winsCount.set(pid, (winsCount.get(pid) ?? 0) + 1);
      }
    }

    const allPlayers = Array.from(
      new Set([...Array.from(sessionsCount.keys()), ...Array.from(winsCount.keys())])
    );

    const rows: StandingRow[] = allPlayers.map((pid) => ({
      player_id: pid,
      name: nameByPlayer.get(pid) ?? "Unbekannt",
      wins: winsCount.get(pid) ?? 0,
      sessions: sessionsCount.get(pid) ?? 0,
    }));

    return rows;
  }

  // Load seasons + default selection
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data, error } = await supabase
          .from("seasons")
          .select("id, name, start_date, end_date")
          .order("id", { ascending: false });

        if (error) throw error;

        const list = (data ?? []) as Season[];
        setSeasons(list);

        const qp = sp.get("season");
        if (qp) setSelected(qp);
        else if (list.length > 0) {
          setSelected(String(list[0].id));
          router.replace(`/standings?season=${list[0].id}`);
        } else {
          setSelected("all");
          router.replace(`/standings?season=all`);
        }
      } catch (e: any) {
        setErr(e?.message ?? "Fehler beim Laden.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load standings + movement
  useEffect(() => {
    (async () => {
      if (!selected) return;
      try {
        setLoading(true);
        setErr(null);

        const sessions = await fetchSessions(selected);

        if (sessions.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        const idsAll = sessions.map((s) => s.id);
        const idsPrev =
          sessions.length >= 2 ? sessions.slice(0, sessions.length - 1).map((s) => s.id) : null;

        const current = addRanks(await computeStandings(idsAll));
        const prev = idsPrev ? addRanks(await computeStandings(idsPrev)) : null;

        if (!prev) {
          setRows(current);
        } else {
          const prevRank = new Map<number, number>();
          prev.forEach((r) => prevRank.set(r.player_id, r.rank));

          const merged = current.map((r) => {
            const pr = prevRank.get(r.player_id);
            const delta = pr == null ? null : pr - r.rank; // + hoch
            return { ...r, deltaRank: delta };
          });

          merged.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "de"));
          setRows(merged);
        }

        router.replace(`/standings?season=${selected}`);
      } catch (e: any) {
        setErr(e?.message ?? "Fehler beim Laden.");
      } finally {
        setLoading(false);
      }
    })();
  }, [selected, router]);

  function movementText(d: number | null) {
    if (d == null) return "–";
    if (d === 0) return "→ 0";
    if (d > 0) return `↑ +${d}`;
    return `↓ ${d}`;
  }

  function movementClass(d: number | null) {
    if (d == null) return "text-slate-400";
    if (d === 0) return "text-slate-500";
    if (d > 0) return "text-emerald-600";
    return "text-red-600";
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900">Tabellen</h1>

        {/* Export Buttons -> screenshot vom sichtbaren Bereich */}
        <ExportButtons targetId="export-standings" fileBaseName="skv-tabelle" />
      </div>

      {/* Saison Dropdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-700">Saison</div>
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              router.replace(`/standings?season=${e.target.value}`);
            }}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Lade…
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      )}

      {!loading && !err && rows.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Keine Daten in dieser Auswahl.
        </div>
      )}

      {/* EXPORT TARGET: genau dieser Bereich wird als Screenshot exportiert */}
      {!loading && !err && rows.length > 0 && (
        <div id="export-standings" className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-800">
              {selected === "all"
                ? "Ewige Tabelle"
                : options.find((o) => o.value === selected)?.label ?? "Saison"}
            </div>
            <div className="text-[10px] text-slate-500">
              Stand: {new Date().toLocaleDateString("de-DE")}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] text-slate-600">
                <tr>
                  <th className="w-20 px-2 py-2 text-left">Platz</th>
                  <th className="px-2 py-2 text-left">Spieler</th>
                  <th className="w-20 px-2 py-2 text-right">Siege</th>
                  <th className="w-28 px-2 py-2 text-right">Teilnahmen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.player_id} className="border-t border-slate-100">
                    <td className="px-2 py-2 align-top">
                      <div className="font-semibold text-slate-900">{r.rank}.</div>
                      <div className={`text-[11px] font-semibold ${movementClass(r.deltaRank)}`}>
                        {movementText(r.deltaRank)}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-middle text-slate-900 font-medium">{r.name}</td>
                    <td className="px-2 py-2 text-right font-semibold text-slate-900">{r.wins}</td>
                    <td className="px-2 py-2 text-right text-slate-700">{r.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-[10px] text-slate-500">
            Bewegung (↑/↓) = Vergleich zur Einheit davor (in dieser Auswahl).
          </div>
        </div>
      )}
    </div>
  );
}
