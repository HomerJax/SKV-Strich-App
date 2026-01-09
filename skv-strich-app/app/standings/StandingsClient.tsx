"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  is_active: boolean | null;
};

type Session = {
  id: number;
  date: string;
  season_id: number | null;
};

type SessionPlayer = {
  session_id: number;
  player_id: number;
};

type ResultRow = {
  session_id: number;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

type TeamPlayer = {
  team_id: number;
  player_id: number;
};

type StandingRow = {
  player_id: number;
  name: string;
  wins: number;
  sessions: number;
  rank: number;
  movement: number | null;
};

function byDateAsc(a: Session, b: Session) {
  return new Date(a.date).getTime() - new Date(b.date).getTime();
}

function computeRanks(rows: { wins: number; sessions: number }[]) {
  const sorted = [...rows]
    .map((r, idx) => ({ ...r, __i: idx }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.sessions !== a.sessions) return b.sessions - a.sessions;
      return 0;
    });

  const rankByOriginalIndex = new Array<number>(rows.length).fill(0);
  let currentRank = 0;
  let position = 0;

  for (let i = 0; i < sorted.length; i++) {
    position += 1;

    const prev = sorted[i - 1];
    const cur = sorted[i];

    const isTie =
      i > 0 && cur.wins === prev.wins && cur.sessions === prev.sessions;

    if (!isTie) currentRank = position;

    rankByOriginalIndex[cur.__i] = currentRank;
  }

  return rankByOriginalIndex;
}

async function buildStandings({
  seasonId,
  upToSessionId,
}: {
  seasonId: number | "all";
  upToSessionId: number | null;
}) {
  const { data: playersData, error: pErr } = await supabase
    .from("players")
    .select("id, name, is_active")
    .order("name");
  if (pErr) throw pErr;

  const players = (playersData ?? []).filter((p) => p.is_active !== false) as Player[];

  let sessionsQuery = supabase.from("sessions").select("id, date, season_id");
  if (seasonId !== "all") sessionsQuery = sessionsQuery.eq("season_id", seasonId);

  const { data: sessionsData, error: sErr } = await sessionsQuery.order("date", { ascending: true });
  if (sErr) throw sErr;

  let sessions = (sessionsData ?? []) as Session[];
  sessions.sort(byDateAsc);

  if (upToSessionId != null) {
    const upTo = sessions.find((s) => s.id === upToSessionId);
    if (upTo) {
      const cutoff = new Date(upTo.date).getTime();
      sessions = sessions.filter((s) => new Date(s.date).getTime() <= cutoff);
    }
  }

  const sessionIds = sessions.map((s) => s.id);
  if (sessionIds.length === 0) {
    const base = players.map((p) => ({
      player_id: p.id,
      name: p.name,
      wins: 0,
      sessions: 0,
    }));
    const ranks = computeRanks(base);
    return base.map((r, i) => ({ ...r, rank: ranks[i] }));
  }

  const { data: spData, error: spErr } = await supabase
    .from("session_players")
    .select("session_id, player_id")
    .in("session_id", sessionIds);
  if (spErr) throw spErr;

  const attendance = (spData ?? []) as SessionPlayer[];

  const { data: resData, error: rErr } = await supabase
    .from("results")
    .select("session_id, team_a_id, team_b_id, goals_team_a, goals_team_b")
    .in("session_id", sessionIds);
  if (rErr) throw rErr;

  const results = (resData ?? []) as ResultRow[];

  const teamIds = Array.from(
    new Set(
      results
        .flatMap((r) => [r.team_a_id, r.team_b_id])
        .filter((x): x is number => typeof x === "number")
    )
  );

  let teamPlayers: TeamPlayer[] = [];
  if (teamIds.length > 0) {
    const { data: tpData, error: tpErr } = await supabase
      .from("team_players")
      .select("team_id, player_id")
      .in("team_id", teamIds);
    if (tpErr) throw tpErr;
    teamPlayers = (tpData ?? []) as TeamPlayer[];
  }

  const playersByTeam = new Map<number, number[]>();
  for (const tp of teamPlayers) {
    if (!playersByTeam.has(tp.team_id)) playersByTeam.set(tp.team_id, []);
    playersByTeam.get(tp.team_id)!.push(tp.player_id);
  }

  const sessionsCount = new Map<number, number>();
  for (const a of attendance) {
    sessionsCount.set(a.player_id, (sessionsCount.get(a.player_id) ?? 0) + 1);
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

  const base = players.map((p) => ({
    player_id: p.id,
    name: p.name,
    wins: winsCount.get(p.id) ?? 0,
    sessions: sessionsCount.get(p.id) ?? 0,
  }));

  const ranks = computeRanks(base);
  return base.map((r, i) => ({ ...r, rank: ranks[i] }));
}

export default function StandingsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selected, setSelected] = useState<string>("");

  const [rows, setRows] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadSeasons() {
      try {
        const { data, error } = await supabase
          .from("seasons")
          .select("id, name, start_date, end_date")
          .order("start_date", { ascending: false });

        if (error) throw error;

        const s = (data ?? []) as Season[];
        setSeasons(s);

        const qp = searchParams.get("season");
        if (qp) {
          setSelected(qp);
        } else if (s.length > 0) {
          setSelected(String(s[0].id));
        } else {
          setSelected("all");
        }
      } catch (e: any) {
        setErr(e.message ?? "Fehler beim Laden der Saisons.");
      }
    }

    loadSeasons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const seasonId: number | "all" =
          selected === "all" || selected === "" ? "all" : Number(selected);

        let sessionsQuery = supabase.from("sessions").select("id, date, season_id");
        if (seasonId !== "all") sessionsQuery = sessionsQuery.eq("season_id", seasonId);

        const { data: sessionsData, error: sErr } = await sessionsQuery.order("date", { ascending: true });
        if (sErr) throw sErr;

        const sessions = ((sessionsData ?? []) as Session[]).sort(byDateAsc);

        const lastSessionId = sessions.length > 0 ? sessions[sessions.length - 1].id : null;
        const prevSessionId = sessions.length > 1 ? sessions[sessions.length - 2].id : null;

        const currentBase = await buildStandings({ seasonId, upToSessionId: lastSessionId });
        const prevBase = prevSessionId
          ? await buildStandings({ seasonId, upToSessionId: prevSessionId })
          : null;

        const prevRankByPlayer = new Map<number, number>();
        if (prevBase) for (const r of prevBase) prevRankByPlayer.set(r.player_id, r.rank);

        const enriched: StandingRow[] = currentBase
          .map((r) => {
            const prevRank = prevRankByPlayer.get(r.player_id);
            const movement = prevRank == null ? null : prevRank - r.rank;
            return { ...r, movement };
          })
          .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));

        setRows(enriched);

        const qp = seasonId === "all" ? "all" : String(seasonId);
        router.replace(`/standings?season=${encodeURIComponent(qp)}`);
      } catch (e: any) {
        setErr(e.message ?? "Fehler beim Laden der Tabelle.");
      } finally {
        setLoading(false);
      }
    }

    if (selected !== "") load();
  }, [selected, router]);

  const seasonOptions = useMemo(() => {
    const opts = seasons.map((s) => ({ value: String(s.id), label: s.name }));
    return opts.length >= 1
      ? [opts[0], { value: "all", label: "Ewige Tabelle" }, ...opts.slice(1)]
      : [{ value: "all", label: "Ewige Tabelle" }];
  }, [seasons]);

  function movementView(m: number | null) {
    if (m == null || m === 0) return { text: "–", cls: "text-slate-400" };
    if (m > 0) return { text: `▲${m}`, cls: "text-emerald-600" };
    return { text: `▼${Math.abs(m)}`, cls: "text-red-600" };
  }

  async function exportPNG() {
    if (!exportRef.current) return;

    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(exportRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });

    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `skv-tabelle-${selected === "all" ? "ewig" : selected}.png`;
    a.click();
  }

  async function exportPDF() {
    if (!exportRef.current) return;

    const html2canvas = (await import("html2canvas")).default;
    const jsPDF = (await import("jspdf")).jsPDF;

    const canvas = await html2canvas(exportRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= pageHeight - 40) {
      pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight);
    } else {
      let remaining = imgHeight;
      let offset = 0;
      while (remaining > 0) {
        pdf.addImage(imgData, "PNG", 20, 20 - offset, imgWidth, imgHeight);
        remaining -= pageHeight - 40;
        offset += pageHeight - 40;
        if (remaining > 0) pdf.addPage();
      }
    }

    pdf.save(`skv-tabelle-${selected === "all" ? "ewig" : selected}.pdf`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Tabellen</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportPNG}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50"
            type="button"
          >
            Export PNG
          </button>
          <button
            onClick={exportPDF}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50"
            type="button"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <label className="block text-[11px] font-semibold text-slate-600">Saison</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {seasonOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Lade Tabelle…
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      )}

      {!loading && !err && (
        <div ref={exportRef} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-800">
              {selected === "all"
                ? "Ewige Tabelle"
                : seasonOptions.find((o) => o.value === selected)?.label ?? "Saison"}
            </div>
            <div className="text-[10px] text-slate-500">
              Stand: {new Date().toLocaleDateString("de-DE")}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] text-slate-600">
                <tr>
                  <th className="w-16 px-2 py-2 text-left">Platz</th>
                  <th className="px-2 py-2 text-left">Spieler</th>
                  <th className="w-24 px-2 py-2 text-left">Siege</th>
                  <th className="w-28 px-2 py-2 text-left">Teilnahmen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const mv = movementView(r.movement);
                  return (
                    <tr key={r.player_id} className="border-t border-slate-100">
                      <td className="px-2 py-2 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{r.rank}.</span>
                          <span className={`text-[11px] font-semibold ${mv.cls}`}>{mv.text}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle text-slate-900">{r.name}</td>
                      <td className="px-2 py-2 align-middle font-semibold text-slate-900">{r.wins}</td>
                      <td className="px-2 py-2 align-middle text-slate-700">{r.sessions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-[10px] text-slate-500">
            Bewegung = Vergleich zur letzten Einheit davor (▲ hoch / ▼ runter).
          </div>
        </div>
      )}
    </div>
  );
}
