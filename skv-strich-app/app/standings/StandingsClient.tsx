"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

type Season = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type StandingRow = {
  player_id: number;
  name: string;
  participated: number;
  wins: number;
};

type RankRow = StandingRow & {
  rank: number;
  deltaRank: number | null; // + = hoch, - = runter, 0 = gleich, null = nicht berechenbar
};

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return d;
  }
}

// Sortierung: zuerst Siege, dann Teilnahmen (weniger Teilnahmen = besser bei gleicher Siegzahl?)
// Du wolltest: Rangfolge anhand Siege; bei Gleichstand gleiche Platzierung, danach weiter springen.
// Als Tiebreaker nutzen wir Teilnahmen DESC (wer öfter da war, steht nicht schlechter) – kannst du anpassen.
function sortStandings(a: StandingRow, b: StandingRow) {
  if (b.wins !== a.wins) return b.wins - a.wins;
  if (b.participated !== a.participated) return b.participated - a.participated;
  return a.name.localeCompare(b.name, "de");
}

// Ränge mit "Gleichplatzierungen" (Competition Ranking: 1,2,2,2,5,…)
function withRanks(rows: StandingRow[]): RankRow[] {
  const sorted = [...rows].sort(sortStandings);

  let lastWins: number | null = null;
  let lastPart: number | null = null;
  let currentRank = 0;

  return sorted.map((r, idx) => {
    const sameAsPrev = lastWins === r.wins && lastPart === r.participated;
    if (!sameAsPrev) currentRank = idx + 1;

    lastWins = r.wins;
    lastPart = r.participated;

    return { ...r, rank: currentRank, deltaRank: null };
  });
}

export default function StandingsClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selected, setSelected] = useState<string>(""); // "all" oder season.id als string
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RankRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [exportError, setExportError] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null); // Export-Render (ohne Tailwind-Farben!)

  // ---- Saison-Optionen (Ewige Tabelle als 2.) ----
  const options = useMemo(() => {
    // Sort: "höchste Zahl" / aktuellste Saison nach oben (wir nehmen id desc)
    const sorted = [...seasons].sort((a, b) => b.id - a.id);

    // "Ewige Tabelle" soll 2. sein:
    // 1) aktuelle Saison
    // 2) all
    // 3) restliche Saisons
    const current = sorted[0] ? [{ value: String(sorted[0].id), label: sorted[0].name }] : [];
    const rest = sorted.slice(1).map((s) => ({ value: String(s.id), label: s.name }));

    return [
      ...current,
      { value: "all", label: "Ewige Tabelle (alle Saisons)" },
      ...rest,
    ];
  }, [seasons]);

  const selectedSeason = useMemo(() => {
    if (selected === "all") return null;
    const id = Number(selected);
    if (!Number.isFinite(id)) return null;
    return seasons.find((s) => s.id === id) ?? null;
  }, [selected, seasons]);

  // ---- Initial: Saisons laden + Default setzen ----
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("seasons")
        .select("id, name, start_date, end_date")
        .order("id", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const list = (data ?? []) as Season[];
      setSeasons(list);

      // query param ?season=...
      const qp = sp.get("season");

      // Default: höchste Saison-ID (aktuellste)
      if (qp) {
        setSelected(qp);
      } else if (list.length > 0) {
        setSelected(String(list[0].id));
        router.replace(`/standings?season=${list[0].id}`);
      } else {
        // falls keine Saisons existieren: fallback auf all
        setSelected("all");
        router.replace(`/standings?season=all`);
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Wenn Dropdown geändert ----
  function onChangeSeason(v: string) {
    setSelected(v);
    router.replace(`/standings?season=${v}`);
  }

  // ---- Hilfsfunktion: Sessions-IDs holen (nach Saison oder alle) ----
  async function fetchSessionIds(seasonIdOrAll: string) {
    let q = supabase.from("sessions").select("id, date").order("date", { ascending: true });

    if (seasonIdOrAll !== "all") {
      const sid = Number(seasonIdOrAll);
      if (Number.isFinite(sid)) q = q.eq("season_id", sid);
    }

    const { data, error } = await q;
    if (error) throw error;
    const sessions = (data ?? []) as { id: number; date: string }[];
    return sessions;
  }

  // ---- Hilfsfunktion: Standings bis inkl. sessionIndex berechnen ----
  async function computeStandingsUpTo(sessionIds: number[]) {
    // Teilnahme: session_players
    const { data: presData, error: presErr } = await supabase
      .from("session_players")
      .select("session_id, player_id, players(name)")
      .in("session_id", sessionIds);

    if (presErr) throw presErr;

    // Ergebnisse: results + team_players + players
    // Wir holen results nur für die Session-IDs und ziehen daraus Gewinner + Teamzuordnung
    const { data: resData, error: resErr } = await supabase
      .from("results")
      .select(
        `
        session_id,
        goals_team_a,
        goals_team_b,
        team_a_id,
        team_b_id,
        teams:teams!results_team_a_id_fkey (
          id,
          team_players (
            player_id,
            players ( name )
          )
        ),
        teams_b:teams!results_team_b_id_fkey (
          id,
          team_players (
            player_id,
            players ( name )
          )
        )
      `
      )
      .in("session_id", sessionIds);

    if (resErr) throw resErr;

    const map = new Map<number, StandingRow>();

    // Teilnahmen zählen
    for (const r of presData ?? []) {
      const pid = (r as any).player_id as number;
      const name = (r as any).players?.name ?? "Unbekannt";
      if (!map.has(pid)) map.set(pid, { player_id: pid, name, participated: 0, wins: 0 });
      map.get(pid)!.participated += 1;
    }

    // Siege zählen
    for (const rr of (resData ?? []) as any[]) {
      const aPlayers = (rr.teams?.team_players ?? []) as any[];
      const bPlayers = ((rr.teams_b?.team_players ?? []) as any[]);

      const ga = rr.goals_team_a;
      const gb = rr.goals_team_b;

      // Nur werten, wenn beide Tore gesetzt sind (oder du willst “winner-only”: dann müsstest du anders speichern)
      if (ga == null || gb == null) continue;

      let winner: "A" | "B" | null = null;
      if (ga > gb) winner = "A";
      else if (gb > ga) winner = "B";

      if (!winner) continue;

      const winners = winner === "A" ? aPlayers : bPlayers;

      for (const tp of winners) {
        const pid = tp.player_id as number;
        const name = tp.players?.name ?? "Unbekannt";

        if (!map.has(pid)) map.set(pid, { player_id: pid, name, participated: 0, wins: 0 });
        map.get(pid)!.wins += 1;
      }
    }

    return Array.from(map.values());
  }

  // ---- Standings + Delta berechnen (vs vorletztem Termin) ----
  useEffect(() => {
    (async () => {
      if (!selected) return;

      setLoading(true);
      setError(null);
      try {
        const sessions = await fetchSessionIds(selected);

        if (sessions.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        const idsAll = sessions.map((s) => s.id);
        const idsPrev = sessions.length >= 2 ? sessions.slice(0, sessions.length - 1).map((s) => s.id) : null;

        const current = withRanks(await computeStandingsUpTo(idsAll));
        const previous = idsPrev ? withRanks(await computeStandingsUpTo(idsPrev)) : null;

        if (previous) {
          const prevRank = new Map<number, number>();
          previous.forEach((r) => prevRank.set(r.player_id, r.rank));

          const withDelta = current.map((r) => {
            const pr = prevRank.get(r.player_id);
            if (!pr) return { ...r, deltaRank: null };
            // positive = hoch (z.B. von 5 auf 2 => +3)
            const delta = pr - r.rank;
            return { ...r, deltaRank: delta };
          });

          setRows(withDelta);
        } else {
          setRows(current.map((r) => ({ ...r, deltaRank: null })));
        }
      } catch (e: any) {
        setError(e.message ?? "Fehler beim Laden.");
      } finally {
        setLoading(false);
      }
    })();
  }, [selected]);

  // ---- Export (wir exportieren eine “Export-Version” ohne Tailwind-Farben) ----
  async function exportPNG() {
    setExportError(null);
    try {
      const node = exportRef.current;
      if (!node) throw new Error("Export-Bereich nicht gefunden.");

      const dataUrl = await toPng(node, {
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = selected === "all" ? "skv-ewige-tabelle.png" : "skv-tabelle.png";
      a.click();
    } catch (e: any) {
      setExportError(e?.message ?? String(e));
    }
  }

  async function exportPDF() {
    setExportError(null);
    try {
      const node = exportRef.current;
      if (!node) throw new Error("Export-Bereich nicht gefunden.");

      const dataUrl = await toPng(node, {
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = 210;

      // Bildgröße proportional
      const pxW = node.offsetWidth || 800;
      const pxH = node.offsetHeight || 1200;
      const mmH = (pxH * pageW) / pxW;

      pdf.addImage(dataUrl, "PNG", 0, 0, pageW, mmH);
      pdf.save(selected === "all" ? "skv-ewige-tabelle.pdf" : "skv-tabelle.pdf");
    } catch (e: any) {
      setExportError(e?.message ?? String(e));
    }
  }

  // ---- UI-Helpers für Bewegung ----
  function movementLabel(delta: number | null) {
    if (delta == null) return "–";
    if (delta === 0) return "→ 0";
    if (delta > 0) return `↑ +${delta}`;
    return `↓ ${delta}`;
  }

  function movementClass(delta: number | null) {
    if (delta == null) return "text-slate-400";
    if (delta === 0) return "text-slate-500";
    if (delta > 0) return "text-emerald-600";
    return "text-red-600";
  }

  const titleLabel = selected === "all" ? "Tabellen – Ewige Tabelle" : "Tabellen";

  return (
    <div className="space-y-4">
      {/* Headerzeile */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Tabellen</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportPNG}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50"
          >
            Export PNG
          </button>
          <button
            onClick={exportPDF}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50"
          >
            Export PDF
          </button>
        </div>
      </div>

      {exportError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          Export-Fehler: {exportError}
        </div>
      )}

      {/* Saison Auswahl */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="text-xs font-semibold text-slate-700">Saison</div>
        <select
          value={selected}
          onChange={(e) => onChangeSeason(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Lade…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Keine Daten in dieser Auswahl.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left w-[90px]">PLATZ</th>
                  <th className="px-3 py-2 text-left">SPIELER</th>
                  <th className="px-3 py-2 text-right w-[90px]">SIEGE</th>
                  <th className="px-3 py-2 text-right w-[110px]">TEILNAHMEN</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.player_id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="font-semibold">{r.rank}.</div>
                      <div className={`text-[11px] ${movementClass(r.deltaRank)}`}>
                        {movementLabel(r.deltaRank)}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">{r.name}</td>
                    <td className="px-3 py-2 text-right font-semibold">{r.wins}</td>
                    <td className="px-3 py-2 text-right">{r.participated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------
          EXPORT-RENDER (unsichtbar/offscreen)
          -> keine Tailwind-Farben, nur HEX => kein lab()/oklch() Crash
         ------------------------------------------- */}
      <div className="sr-only">
        <div
          ref={exportRef}
          style={{
            width: 900,
            background: "#ffffff",
            color: "#000000",
            padding: 18,
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>SKV Strich App</div>
            <div style={{ fontSize: 12 }}>
              {selected === "all" ? "Ewige Tabelle (alle Saisons)" : selectedSeason?.name ?? ""}
            </div>
          </div>

          <div style={{ fontSize: 12, marginBottom: 10 }}>
            Stand: {new Date().toLocaleDateString("de-DE")} {new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #000", padding: 8, textAlign: "left", width: 90 }}>Platz</th>
                <th style={{ border: "1px solid #000", padding: 8, textAlign: "left" }}>Spieler</th>
                <th style={{ border: "1px solid #000", padding: 8, textAlign: "right", width: 90 }}>Siege</th>
                <th style={{ border: "1px solid #000", padding: 8, textAlign: "right", width: 110 }}>Teilnahmen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const delta = r.deltaRank;
                let deltaText = "–";
                let deltaColor = "#777777";
                if (delta != null) {
                  if (delta > 0) {
                    deltaText = `↑ +${delta}`;
                    deltaColor = "#0a7a0a";
                  } else if (delta < 0) {
                    deltaText = `↓ ${delta}`;
                    deltaColor = "#b00000";
                  } else {
                    deltaText = "→ 0";
                    deltaColor = "#333333";
                  }
                }

                return (
                  <tr key={`exp-${r.player_id}`}>
                    <td style={{ border: "1px solid #000", padding: 8, verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700 }}>{r.rank}.</div>
                      <div style={{ fontSize: 11, color: deltaColor }}>{deltaText}</div>
                    </td>
                    <td style={{ border: "1px solid #000", padding: 8, fontWeight: 600 }}>{r.name}</td>
                    <td style={{ border: "1px solid #000", padding: 8, textAlign: "right", fontWeight: 700 }}>{r.wins}</td>
                    <td style={{ border: "1px solid #000", padding: 8, textAlign: "right" }}>{r.participated}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ fontSize: 10, color: "#333", marginTop: 10 }}>
            Hinweis: Bewegung (↑/↓) = Veränderung gegenüber dem vorletzten Termin dieser Auswahl.
          </div>
        </div>
      </div>
    </div>
  );
}
