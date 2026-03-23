"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import ExportButtons from "@/components/ExportButtons";
import { getPlayerDisplayName } from "@/lib/player-display";
import StandingsShareCard from "./StandingsShareCard";
import type {
  RankRow,
  Season,
  Session,
  StandingRow,
} from "./standings-types";
import {
  addRanks,
  buildStandingsShareText,
  chunkRows,
  getErrorMessage,
  movementClass,
  movementText,
} from "./standings-ui";

type RankingCard = {
  index: number;
  rows: RankRow[];
  startRank: number;
  endRank: number;
  exportId: string;
  fileBaseName: string;
};

type StandingsClientProps = {
  initialClubId: string;
};

export default function StandingsClient({
  initialClubId,
}: StandingsClientProps) {
  const router = useRouter();
  const sp = useSearchParams();

  const [clubId] = useState<string>(initialClubId);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [sharingCardIndex, setSharingCardIndex] = useState<number | null>(null);

  const options = useMemo(() => {
    const sorted = [...seasons].sort((a, b) => b.id - a.id);
    const first = sorted[0]
      ? [{ value: String(sorted[0].id), label: sorted[0].name }]
      : [];
    const rest = sorted
      .slice(1)
      .map((s) => ({ value: String(s.id), label: s.name }));

    return [...first, { value: "all", label: "Ewige Tabelle" }, ...rest];
  }, [seasons]);

  const selectedLabel = useMemo(() => {
    return selected === "all"
      ? "Ewige Tabelle"
      : options.find((o) => o.value === selected)?.label ?? "Saison";
  }, [options, selected]);

  const rankingCards = useMemo<RankingCard[]>(() => {
    const chunks = chunkRows(rows, 10);

    return chunks.map((chunk, index) => {
      const startRank = chunk[0]?.rank ?? index * 10 + 1;
      const endRank = chunk[chunk.length - 1]?.rank ?? startRank;
      const exportId = `export-standings-card-${index + 1}`;
      const fileBaseName = `strikr-tabelle-${selectedLabel
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9äöüß-]/gi, "")}-${index + 1}`;

      return {
        index,
        rows: chunk,
        startRank,
        endRank,
        exportId,
        fileBaseName,
      };
    });
  }, [rows, selectedLabel]);

  async function fetchSessions(currentClubId: string, seasonIdOrAll: string) {
    let q = supabase
      .from("sessions")
      .select("id, date, season_id")
      .eq("club_id", currentClubId)
      .order("date", { ascending: true });

    if (seasonIdOrAll !== "all") {
      q = q.eq("season_id", Number(seasonIdOrAll));
    }

    const { data, error } = await q;
    if (error) throw error;

    return (data ?? []) as Session[];
  }

  async function computeStandings(currentClubId: string, sessionIds: number[]) {
    const { data: spData, error: spErr } = await supabase
      .from("session_players")
      .select("session_id, player_id")
      .in("session_id", sessionIds);

    if (spErr) throw spErr;

    const presentRows = (spData ?? []) as {
      session_id: number;
      player_id: number;
    }[];
    const playerIds = Array.from(new Set(presentRows.map((r) => r.player_id)));

    const { data: playerData, error: playerErr } = await supabase
      .from("players")
      .select("id, name, first_name, last_name, nickname, is_guest")
      .eq("club_id", currentClubId)
      .in("id", playerIds.length > 0 ? playerIds : [-1]);

    if (playerErr) throw playerErr;

    const nonGuestPlayerIds = new Set<number>(
      (playerData ?? [])
        .filter((p: any) => p.is_guest !== true)
        .map((p: any) => p.id as number)
    );

    const { data: rData, error: rErr } = await supabase
      .from("results")
      .select("session_id, goals_team_a, goals_team_b, team_a_id, team_b_id")
      .eq("club_id", currentClubId)
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
        .select("team_id, player_id")
        .in("team_id", teamIds);

      if (tpErr) throw tpErr;
      teamPlayers = tpData ?? [];
    }

    const playersByTeam = new Map<number, number[]>();
    for (const tp of teamPlayers) {
      if (!playersByTeam.has(tp.team_id)) playersByTeam.set(tp.team_id, []);
      playersByTeam.get(tp.team_id)!.push(tp.player_id);
    }

    const playerById = new Map<
      number,
      {
        name?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        nickname?: string | null;
      }
    >();

    for (const p of playerData ?? []) {
      if ((p as any).is_guest === true) continue;

      playerById.set(p.id as number, {
        name: (p as any).name ?? null,
        first_name: (p as any).first_name ?? null,
        last_name: (p as any).last_name ?? null,
        nickname: (p as any).nickname ?? null,
      });
    }

    const sessionsCount = new Map<number, number>();
    for (const row of presentRows) {
      if (!nonGuestPlayerIds.has(row.player_id)) continue;
      sessionsCount.set(
        row.player_id,
        (sessionsCount.get(row.player_id) ?? 0) + 1
      );
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
        if (!nonGuestPlayerIds.has(pid)) continue;
        winsCount.set(pid, (winsCount.get(pid) ?? 0) + 1);
      }
    }

    const allPlayers = Array.from(
      new Set([
        ...Array.from(sessionsCount.keys()),
        ...Array.from(winsCount.keys()),
      ])
    );

    const nextRows: StandingRow[] = allPlayers.map((pid) => {
      const player = playerById.get(pid);

      return {
        player_id: pid,
        name: player?.name ?? "Unbekannt",
        first_name: player?.first_name ?? null,
        last_name: player?.last_name ?? null,
        nickname: player?.nickname ?? null,
        wins: winsCount.get(pid) ?? 0,
        sessions: sessionsCount.get(pid) ?? 0,
      };
    });

    return nextRows;
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setMsg(null);

        const { data, error } = await supabase
          .from("seasons")
          .select("id, name, start_date, end_date")
          .eq("club_id", clubId)
          .order("id", { ascending: false });

        if (error) throw error;

        const list = (data ?? []) as Season[];
        setSeasons(list);

        const qp = sp.get("season");
        if (qp) {
          setSelected(qp);
        } else if (list.length > 0) {
          setSelected(String(list[0].id));
          router.replace(`/standings?season=${list[0].id}`);
        } else {
          setSelected("all");
          router.replace(`/standings?season=all`);
        }
      } catch (e: unknown) {
        setErr(getErrorMessage(e, "Fehler beim Laden der Tabelle."));
      } finally {
        setLoading(false);
      }
    })();
  }, [router, sp, clubId]);

  useEffect(() => {
    (async () => {
      if (!selected || !clubId) return;

      try {
        setLoading(true);
        setErr(null);
        setMsg(null);

        const sessions = await fetchSessions(clubId, selected);

        if (sessions.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        const idsAll = sessions.map((s) => s.id);
        const idsPrev =
          sessions.length >= 2
            ? sessions.slice(0, sessions.length - 1).map((s) => s.id)
            : null;

        const current = addRanks(await computeStandings(clubId, idsAll));
        const prev = idsPrev
          ? addRanks(await computeStandings(clubId, idsPrev))
          : null;

        if (!prev) {
          setRows(current);
        } else {
          const prevRank = new Map<number, number>();
          prev.forEach((r) => prevRank.set(r.player_id, r.rank));

          const merged = current.map((r) => {
            const pr = prevRank.get(r.player_id);
            const delta = pr == null ? null : pr - r.rank;
            return { ...r, deltaRank: delta };
          });

          merged.sort(
            (a, b) =>
              a.rank - b.rank ||
              getPlayerDisplayName(a).localeCompare(getPlayerDisplayName(b), "de")
          );
          setRows(merged);
        }

        router.replace(`/standings?season=${selected}`);
      } catch (e: unknown) {
        setErr(getErrorMessage(e, "Fehler beim Laden der Tabelle."));
      } finally {
        setLoading(false);
      }
    })();
  }, [selected, router, clubId]);

  async function shareText(text: string, title: string) {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({
        title,
        text,
      });
      return "shared";
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }

    throw new Error("Teilen wird auf diesem Gerät oder Browser nicht unterstützt.");
  }

  async function handleShareCard(card: RankingCard) {
    try {
      setSharingCardIndex(card.index);
      setErr(null);
      setMsg(null);

      const text = buildStandingsShareText(
        selectedLabel,
        card.rows,
        card.startRank,
        card.endRank
      );

      const title =
        card.startRank === card.endRank
          ? `${selectedLabel} – Platz ${card.startRank}`
          : `${selectedLabel} – Plätze ${card.startRank}-${card.endRank}`;

      const result = await shareText(text, title);

      if (result === "copied") {
        setMsg("Share-Text der Tabellenkarte wurde in die Zwischenablage kopiert.");
      } else {
        setMsg("Tabellenkarte erfolgreich geteilt.");
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "Tabellenkarte konnte nicht geteilt werden."));
    } finally {
      setSharingCardIndex(null);
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Tabellen</h1>
            <p className="text-xs text-slate-500">
              Saison auswählen, Tabelle prüfen und als Share Card exportieren.
            </p>
          </div>

          {!loading && !err && rows.length > 0 && (
            <ExportButtons
              targetId="export-standings"
              fileBaseName={`strikr-tabelle-${selectedLabel
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9äöüß-]/gi, "")}`}
            />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-700">Saison</div>
              <div className="text-[11px] text-slate-500">
                Für Share Cards wird die aktuelle Auswahl verwendet.
              </div>
            </div>

            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                router.replace(`/standings?season=${e.target.value}`);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {msg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {msg}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
            Lade Tabelle…
          </div>
        )}

        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {err}
          </div>
        )}

        {!loading && !err && rows.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="max-w-lg">
              <div className="text-sm font-semibold text-slate-500">
                Noch keine Tabelle
              </div>

              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                In dieser Auswahl sind noch keine Ergebnisse vorhanden.
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sobald ihr Trainings spielt und Ergebnisse speichert, baut sich
                eure Tabelle hier automatisch auf. Starte am besten mit eurer
                ersten Session.
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/sessions/new"
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Erstes Training erstellen
                </Link>

                <Link
                  href="/sessions"
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700"
                >
                  Zu den Trainings
                </Link>
              </div>
            </div>
          </div>
        )}

        {!loading && !err && rows.length > 0 && (
          <>
            <div
              id="export-standings"
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    {selectedLabel}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Gesamttabelle dieser Auswahl
                  </div>
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
                          <div
                            className={`text-[11px] font-semibold ${movementClass(
                              r.deltaRank
                            )}`}
                          >
                            {movementText(r.deltaRank)}
                          </div>
                        </td>
                        <td className="px-2 py-2 align-middle font-medium text-slate-900">
                          {getPlayerDisplayName(r)}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-slate-900">
                          {r.wins}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-700">
                          {r.sessions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[10px] text-slate-500">
                  Bewegung (↑/↓) = Vergleich zur Einheit davor in dieser Auswahl.
                </div>
                <div className="text-[10px] font-medium text-slate-500">
                  made with strikr · #strikr
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Standings Share Cards
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Die Tabelle wird automatisch in Karten mit jeweils 10 Plätzen
                    aufgeteilt. Jede Karte kann separat exportiert oder als Text
                    geteilt werden.
                  </div>
                </div>

                <div className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  {rankingCards.length} Karte{rankingCards.length === 1 ? "" : "n"}
                </div>
              </div>

              <div className="space-y-3">
                {rankingCards.map((card) => {
                  const title =
                    card.startRank === card.endRank
                      ? `Platz ${card.startRank}`
                      : `Plätze ${card.startRank}–${card.endRank}`;

                  return (
                    <div
                      key={card.exportId}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {title}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {selectedLabel} · Share Card {card.index + 1}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleShareCard(card)}
                            disabled={sharingCardIndex === card.index}
                            className={`rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 ${
                              sharingCardIndex === card.index
                                ? "cursor-not-allowed opacity-60"
                                : ""
                            }`}
                          >
                            {sharingCardIndex === card.index
                              ? "Teile…"
                              : "Text teilen"}
                          </button>

                          <ExportButtons
                            targetId={card.exportId}
                            fileBaseName={card.fileBaseName}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {!loading && !err && rankingCards.length > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -left-[99999px] top-0 opacity-0"
        >
          {rankingCards.map((card) => (
            <StandingsShareCard
              key={card.exportId}
              exportId={card.exportId}
              selectedLabel={selectedLabel}
              startRank={card.startRank}
              endRank={card.endRank}
              rows={card.rows}
            />
          ))}
        </div>
      )}
    </>
  );
}