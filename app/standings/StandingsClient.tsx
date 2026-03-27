"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ExportButtons from "@/components/ExportButtons";
import { getPlayerDisplayName } from "@/lib/player-display";
import StandingsShareCard from "./StandingsShareCard";
import type { RankRow, Season } from "./standings-types";
import {
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

type StandingsApiResponse = {
  seasons: Season[];
  selected: string;
  rows: RankRow[];
  error?: string;
};

export default function StandingsClient({
  initialClubId,
}: StandingsClientProps) {
  void initialClubId;

  const router = useRouter();
  const searchParams = useSearchParams();
  const seasonParam = searchParams.get("season") ?? "";

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selected, setSelected] = useState<string>(seasonParam || "");
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
      .map((season) => ({ value: String(season.id), label: season.name }));

    return [...first, { value: "all", label: "Ewige Tabelle" }, ...rest];
  }, [seasons]);

  const selectedLabel = useMemo(() => {
    return selected === "all"
      ? "Ewige Tabelle"
      : options.find((option) => option.value === selected)?.label ?? "Saison";
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

  useEffect(() => {
    let cancelled = false;

    async function loadStandings() {
      try {
        setLoading(true);
        setErr(null);
        setMsg(null);

        const url = seasonParam
          ? `/api/standings?season=${encodeURIComponent(seasonParam)}`
          : "/api/standings";

        const response = await fetch(url, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        const payload = (await response.json()) as StandingsApiResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Fehler beim Laden der Tabelle.");
        }

        if (cancelled) {
          return;
        }

        setSeasons(payload.seasons ?? []);
        setSelected(payload.selected ?? "all");
        setRows(payload.rows ?? []);
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        setErr(getErrorMessage(error, "Fehler beim Laden der Tabelle."));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStandings();

    return () => {
      cancelled = true;
    };
  }, [seasonParam]);

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
    } catch (error: unknown) {
      setErr(getErrorMessage(error, "Tabellenkarte konnte nicht geteilt werden."));
    } finally {
      setSharingCardIndex(null);
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zur Startseite
          </Link>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Tabellen
              </div>

              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Tabellenübersicht
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Saison auswählen, Tabelle prüfen und über die Share Cards unten
                sauber teilen oder exportieren.
              </p>
            </div>
          </div>
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
                const value = e.target.value;
                setSelected(value);
                router.replace(`/standings?season=${value}`);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
                    {rows.map((row) => (
                      <tr key={row.player_id} className="border-t border-slate-100">
                        <td className="px-2 py-2 align-top">
                          <div className="font-semibold text-slate-900">
                            {row.rank}.
                          </div>
                          <div
                            className={`text-[11px] font-semibold ${movementClass(
                              row.deltaRank
                            )}`}
                          >
                            {movementText(row.deltaRank)}
                          </div>
                        </td>
                        <td className="px-2 py-2 align-middle font-medium text-slate-900">
                          {getPlayerDisplayName(row)}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-slate-900">
                          {row.wins}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-700">
                          {row.sessions}
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