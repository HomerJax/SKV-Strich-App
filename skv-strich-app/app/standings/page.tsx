"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type SeasonConfig = {
  id: string;
  label: string;
  startDate: string | null;
  endDate: string | null;
};

type PlayerStatsBase = {
  player_id: number;
  name: string;
  participations: number;
  wins: number;
};

type PlayerStats = PlayerStatsBase & {
  rank: number;
  rankChange: number | null;
};

const SEASONS: SeasonConfig[] = [
  {
    id: "2025",
    label: "Saison 2025 (10.12.2024 – 06.12.2025)",
    startDate: "2024-12-10",
    endDate: "2025-12-06",
  },
  {
    id: "2026",
    label: "Saison 2026 (ab 07.12.2025)",
    startDate: "2025-12-07",
    endDate: "2026-12-31",
  },
  {
    id: "all",
    label: "Ewige Tabelle (alle Saisons)",
    startDate: null,
    endDate: null,
  },
];

export default function StandingsPage() {
  const router = useRouter();
  const params = useSearchParams();

  const numericSeasons = SEASONS.filter((s) => /^\d+$/.test(s.id));
  let defaultSeason = "all";

  if (numericSeasons.length > 0) {
    defaultSeason = numericSeasons.reduce((m, s) =>
      parseInt(s.id) > parseInt(m.id) ? s : m
    ).id;
  }

  const selected = params.get("season") ?? defaultSeason;
  const season =
    SEASONS.find((s) => s.id === selected) ??
    SEASONS.find((s) => s.id === defaultSeason)!;

  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPreviousSnapshot, setHasPreviousSnapshot] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Spieler
      const { data: players } = await supabase
        .from("players")
        .select("id,name");

      const playersMap = new Map<number, string>();
      (players ?? []).forEach((p) => playersMap.set(p.id, p.name));

      // Sessions
      let q = supabase.from("sessions").select("id,date");

      if (season.startDate) q = q.gte("date", season.startDate);
      if (season.endDate) q = q.lte("date", season.endDate);

      const { data: sessions } = await q;

      const list = (sessions ?? []).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      if (!list.length) {
        setStats([]);
        setLoading(false);
        return;
      }

      const allIds = list.map((s) => s.id);
      const prevIds =
        list.length > 1 ? list.slice(0, -1).map((s) => s.id) : [];

      setHasPreviousSnapshot(prevIds.length > 0);

      async function compute(sessionIds: number[]) {
        const stats = new Map<number, PlayerStatsBase>();

        if (!sessionIds.length) return stats;

        const [{ data: sp }, { data: results }, { data: tp }, { data: teams }] =
          await Promise.all([
            supabase
              .from("session_players")
              .select("session_id,player_id")
              .in("session_id", sessionIds),

            supabase
              .from("results")
              .select(
                "session_id,team_a_id,team_b_id,goals_team_a,goals_team_b"
              )
              .in("session_id", sessionIds),

            supabase
              .from("team_players")
              .select("team_id,player_id"),

            supabase
              .from("teams")
              .select("id,session_id")
              .in("session_id", sessionIds),
          ]);

        const playersByTeam = new Map<number, number[]>();
        (tp ?? []).forEach((t) => {
          const arr = playersByTeam.get(t.team_id) ?? [];
          arr.push(t.player_id);
          playersByTeam.set(t.team_id, arr);
        });

        function ensure(pid: number) {
          if (!stats.has(pid)) {
            stats.set(pid, {
              player_id: pid,
              name: playersMap.get(pid) ?? "Unbekannt",
              participations: 0,
              wins: 0,
            });
          }
          return stats.get(pid)!;
        }

        (sp ?? []).forEach((r) => {
          ensure(r.player_id).participations++;
        });

        (results ?? []).forEach((r) => {
          if (
            r.goals_team_a == null ||
            r.goals_team_b == null ||
            r.team_a_id == null ||
            r.team_b_id == null
          )
            return;

          let winner: number | null = null;

          if (r.goals_team_a > r.goals_team_b) winner = r.team_a_id;
          else if (r.goals_team_b > r.goals_team_a) winner = r.team_b_id;

          if (!winner) return;

          (playersByTeam.get(winner) ?? []).forEach((pid) => {
            ensure(pid).wins++;
          });
        });

        return stats;
      }

      const current = await compute(allIds);
      const previous = await compute(prevIds);

      function sort(arr: PlayerStatsBase[]) {
        return arr.sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          if (b.participations !== a.participations)
            return b.participations - a.participations;
          return a.name.localeCompare(b.name);
        });
      }

      const curArr = sort([...current.values()]);
      const prevArr = sort([...previous.values()]);

      const prevRank = new Map<number, number>();
      prevArr.forEach((p, i) => prevRank.set(p.player_id, i + 1));

      const final = curArr.map((p, i) => {
        const now = i + 1;
        const was = prevRank.get(p.player_id);
        return {
          ...p,
          rank: now,
          rankChange: was == null ? null : was - now,
        };
      });

      setStats(final);
      setLoading(false);
    }

    load();
  }, [season.id, season.startDate, season.endDate]);

  function changeSeason(id: string) {
    router.push(`/standings?season=${id}`);
  }

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Standings</h1>
          <p className="text-xs text-slate-500">
            Platzierung &amp; Veränderung (Vorwoche).
          </p>
        </div>

        <select
          value={selected}
          onChange={(e) => changeSeason(e.target.value)}
          className="rounded-md border px-2 py-1 text-xs"
        >
          {SEASONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Lade…</p>}

      {!loading && stats.length > 0 && (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-center">Platz</th>
                <th className="px-3 py-2 text-left">Spieler</th>
                <th className="px-3 py-2 text-center">Teilnahmen</th>
                <th className="px-3 py-2 text-center">Siege</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((p, idx) => {
                let change = null;

                if (hasPreviousSnapshot) {
                  if (p.rankChange === null)
                    change = (
                      <span className="text-[10px] text-slate-400">
                        neu
                      </span>
                    );
                  else if (p.rankChange > 0)
                    change = (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px]">
                        ↑ {p.rankChange}
                      </span>
                    );
                  else if (p.rankChange < 0)
                    change = (
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-[10px]">
                        ↓ {Math.abs(p.rankChange)}
                      </span>
                    );
                  else change = <span className="text-[10px]">–</span>;
                }

                return (
                  <tr key={p.player_id}>
                    <td className="text-center px-3 py-2">
                      <div className="flex flex-col items-center">
                        <strong>{p.rank}.</strong>
                        {change}
                      </div>
                    </td>
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="text-center px-3 py-2">
                      {p.participations}
                    </td>
                    <td className="text-center px-3 py-2">
                      {p.wins}
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
