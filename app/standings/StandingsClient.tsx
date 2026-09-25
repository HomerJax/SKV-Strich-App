"use client";

import { useEffect, useMemo, useState } from "react";
import * as htmlToImage from "html-to-image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ExportButtons from "@/components/ExportButtons";
import PageHero from "@/components/ui/PageHero";
import { getPlayerDisplayName } from "@/lib/player-display";
import StandingsShareCard from "./StandingsShareCard";
import type { RankRow, Season } from "./standings-types";
import {
  awardClass,
  chunkRows,
  getErrorMessage,
  movementClass,
  movementText,
} from "./standings-ui";
import type { TrainingAward } from "./standings-ui";
import { useI18n } from "@/components/i18n/I18nProvider";

const DEMO_STANDINGS_MOVEMENT_CLUB_ID = "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60";

type SortKey = "rank" | "sessions" | "winRate";
type SortDirection = "asc" | "desc";

function PlayerBadge(_props: Record<string, unknown>) {
  return null;
}

function getTrainingAwards(_row: unknown): TrainingAward[] {
  return [];
}

function getDemoMovementValue(rank: number, movement: number | null | undefined) {
  if (movement && movement !== 0) return movement;
  if (rank === 1) return 0;
  if (rank === 2) return 2;
  if (rank === 3) return -1;
  if (rank === 4) return 1;
  if (rank === 5) return -2;
  if (rank === 6) return 1;
  if (rank === 7) return -1;
  if (rank === 8) return 2;
  if (rank === 9) return -2;
  if (rank % 4 === 0) return 1;
  if (rank % 5 === 0) return -1;
  return 0;
}

function winRateValue(wins: number, sessions: number) {
  if (sessions <= 0) return -1;
  return wins / sessions;
}

function formatWinRate(wins: number, sessions: number) {
  const value = winRateValue(wins, sessions);
  if (value < 0) return "–";
  return `${Math.round(value * 100)}%`;
}

type RankingCard = {
  index: number;
  rows: RankRow[];
  startRank: number;
  endRank: number;
  exportId: string;
  fileBaseName: string;
};

type NavigatorWithFileShare = Navigator & {
  canShare?: (data: ShareData) => boolean;
};

function padShareNumber(value: number) {
  return String(value).padStart(2, "0");
}

function buildShareStamp() {
  const now = new Date();
  return `${now.getFullYear()}-${padShareNumber(now.getMonth() + 1)}-${padShareNumber(
    now.getDate()
  )}_${padShareNumber(now.getHours())}-${padShareNumber(now.getMinutes())}`;
}

function sanitizeShareFileBaseName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9äöüß_-]/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "strikr-tabelle"
  );
}

async function blobFromDataUrl(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function createStandingsShareBlob(targetId: string) {
  const element = document.getElementById(targetId);
  if (!element) throw new Error(`Share Card nicht gefunden: #${targetId}`);

  const dataUrl = await htmlToImage.toPng(element, {
    cacheBust: true,
    pixelRatio: Math.max(2, Math.min(4, window.devicePixelRatio || 2)),
    backgroundColor: "#020617",
    skipFonts: false,
  });

  return blobFromDataUrl(dataUrl);
}

async function shareOrDownloadStandingsBlob(
  blob: Blob,
  fileBaseName: string,
  shareTitle: string,
  shareText: string,
) {
  const fileName = `${sanitizeShareFileBaseName(fileBaseName)}_${buildShareStamp()}.png`;
  const file = new File([blob], fileName, { type: blob.type || "image/png" });
  const nav = navigator as NavigatorWithFileShare;

  if (typeof nav.share === "function") {
    const shareData: ShareData = {
      files: [file],
      title: shareTitle,
      text: shareText,
    };

    if (!nav.canShare || nav.canShare(shareData)) {
      await nav.share(shareData);
      return "shared" as const;
    }
  }

  downloadBlob(blob, fileName);
  return "downloaded" as const;
}

type StandingsClientProps = {
  initialClubId: string;
  initialPrimaryColor?: string | null;
  isPro?: boolean;
  clubName?: string;
  hallOfFameEnabled?: boolean;
  currentPlayerId?: number | null;
};

type StandingsApiResponse = {
  seasons: Season[];
  selected: string;
  awardsStartedAt?: string | null;
  awardsOfficial?: boolean;
  rows: RankRow[];
  error?: string;
};

function AwardSummaryBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-slate-300/70 bg-[radial-gradient(circle_at_35%_22%,#f8fafc_0%,#cbd5e1_36%,#334155_100%)] px-1 text-[8px] font-black leading-none text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.22)] ring-1 ring-white/70">
      {count > 1 ? `+${count}` : "•"}
    </span>
  );
}

export default function StandingsClient({
  initialClubId,
  initialPrimaryColor,
  isPro = false,
  clubName = "dein Team",
  hallOfFameEnabled = false,
  currentPlayerId = null,
}: StandingsClientProps) {
  void clubName;
  const { locale, t } = useI18n();

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
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [, setAwardsStartedAt] = useState<string | null>(null);
  const [, setAwardsOfficial] = useState(false);
  const [activeAward, setActiveAward] = useState<{
    playerName: string;
    award: TrainingAward;
  } | null>(null);

  const options = useMemo(() => {
    const sorted = [...seasons].sort((a, b) => b.id - a.id);
    const first = sorted[0]
      ? [{ value: String(sorted[0].id), label: sorted[0].name }]
      : [];
    const rest = sorted.slice(1).map((season) => ({
      value: String(season.id),
      label: season.name,
    }));
    if (!isPro) return first;
    return [...first, { value: "all", label: t("standings.allTime") }, ...rest];
  }, [isPro, seasons, t]);

  const selectedLabel = useMemo(() => {
    return selected === "all"
      ? t("standings.allTime")
      : options.find((option) => option.value === selected)?.label ?? t("standings.season");
  }, [options, selected, t]);

  const sortedRows = useMemo(() => {
    const nextRows = [...rows];
    nextRows.sort((a, b) => {
      let comparison = 0;
      if (sortKey === "rank") comparison = a.rank - b.rank;
      if (sortKey === "sessions") comparison = a.sessions - b.sessions;
      if (sortKey === "winRate") {
        comparison = winRateValue(a.wins, a.sessions) - winRateValue(b.wins, b.sessions);
      }
      if (comparison === 0) comparison = a.rank - b.rank;
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return nextRows;
  }, [rows, sortDirection, sortKey]);

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

      return { index, rows: chunk, startRank, endRank, exportId, fileBaseName };
    });
  }, [rows, selectedLabel]);

  useEffect(() => {
    let cancelled = false;

    async function loadStandings() {
      try {
        setLoading(true);
        setErr(null);
        setMsg(null);

        const url =
          isPro && seasonParam
            ? `/api/standings?season=${encodeURIComponent(seasonParam)}`
            : "/api/standings";

        const response = await fetch(url, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const payload = (await response.json()) as StandingsApiResponse;
        if (!response.ok) throw new Error(payload.error || t("standings.loadError"));
        if (cancelled) return;

        setSeasons(payload.seasons ?? []);
        setSelected(payload.selected ?? "all");
        setRows(payload.rows ?? []);
        setAwardsStartedAt(payload.awardsStartedAt ?? null);
        setAwardsOfficial(payload.awardsOfficial === true);
        setSortKey("rank");
        setSortDirection("asc");
      } catch (error: unknown) {
        if (!cancelled) setErr(getErrorMessage(error, t("standings.loadError")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStandings();
    return () => {
      cancelled = true;
    };
  }, [isPro, seasonParam, t]);

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "rank" ? "asc" : "desc");
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  async function handleShareCard(card: RankingCard) {
    try {
      setSharingCardIndex(card.index);
      setErr(null);
      setMsg(null);
      const blob = await createStandingsShareBlob(card.exportId);
      const result = await shareOrDownloadStandingsBlob(
        blob,
        card.fileBaseName,
        t("standings.shareTitle"),
        t("standings.shareText"),
      );
      setMsg(result === "shared" ? t("standings.shared") : t("standings.downloaded"));
    } catch (error: unknown) {
      const errorName = error instanceof DOMException ? error.name : "";
      if (errorName === "AbortError") {
        setErr(null);
        setMsg(null);
        return;
      }
      setErr(getErrorMessage(error, t("standings.shareError")));
    } finally {
      setSharingCardIndex(null);
    }
  }

  return (
    <>
      <div className="space-y-4">
        {activeAward ? (
          <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-sm rounded-[22px] border border-slate-200 bg-white p-4 shadow-2xl sm:bottom-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className={`flex h-10 min-w-10 items-center justify-center rounded-2xl border text-sm font-black shadow-sm ${awardClass(activeAward.award.tone)}`}>
                  {activeAward.award.mark}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Award</div>
                  <div className="mt-1 text-base font-black tracking-tight text-slate-950">{activeAward.award.shortLabel}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-600">{activeAward.playerName}</div>
                  <div className="mt-2 text-sm leading-5 text-slate-500">{activeAward.award.label}</div>
                </div>
              </div>
              <button type="button" onClick={() => setActiveAward(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-500" aria-label={t("standings.closeAward")}>×</button>
            </div>
          </div>
        ) : null}

        <PageHero
          eyebrow={t("standings.eyebrow")}
          title={t("standings.title")}
          description={t("standings.description")}
          primaryColorKey={initialPrimaryColor}
          backLabel={t("standings.back")}
          backHref="/"
          topRightSlot={
            isPro ? (
              <select
                value={selected}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelected(value);
                  router.replace(`/standings?season=${value}`);
                }}
                className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none backdrop-blur transition hover:bg-white/15"
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value} className="text-slate-900">{option.label}</option>
                ))}
              </select>
            ) : (
              <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold text-white backdrop-blur">{t("standings.current")}</div>
            )
          }
          compact
        />

        {msg ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{msg}</div> : null}
        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">{t("standings.loading")}</div> : null}
        {err ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</div> : null}

        {!loading && !err && rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="max-w-lg">
              <div className="text-sm font-semibold text-slate-500">{t("standings.emptyEyebrow")}</div>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">{t("standings.emptyTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("standings.emptyText")}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link href="/sessions/new" className="rounded-xl bg-slate-950 px-4 py-2.5 text-center text-sm font-semibold text-white">{t("standings.createTraining")}</Link>
                <Link href="/sessions" className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700">{t("standings.toTraining")}</Link>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !err && rows.length > 0 ? (
          <>
            <div id="export-standings" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800">{selectedLabel}</div>
                  <div className="text-[11px] text-slate-500">{t("standings.playersSort", { count: rows.length })}</div>
                </div>
                <div className="text-[10px] text-slate-500">{t("standings.asOf", { date: new Date().toLocaleDateString(locale === "de" ? "de-DE" : "en-GB") })}</div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[430px] text-sm">
                  <thead className="bg-slate-50 text-[11px] text-slate-600">
                    <tr>
                      <th className="w-14 px-2 py-2 text-left">
                        <button type="button" onClick={() => handleSort("rank")} className="inline-flex items-center gap-1 font-semibold transition hover:text-slate-950">{t("standings.rank")} <span className="text-[10px] text-slate-400">{sortIndicator("rank")}</span></button>
                      </th>
                      <th className="px-1.5 py-2 text-left">{t("standings.player")}</th>
                      <th className="w-12 px-1 py-2 text-right">{t("standings.wins")}</th>
                      <th className="w-16 px-1 py-2 text-right">
                        <button type="button" onClick={() => handleSort("sessions")} className="ml-auto inline-flex items-center gap-1 font-semibold transition hover:text-slate-950">{t("standings.appearancesShort")} <span className="text-[10px] text-slate-400">{sortIndicator("sessions")}</span></button>
                      </th>
                      <th className="w-20 px-1.5 py-2 text-right">
                        <button type="button" onClick={() => handleSort("winRate")} className="ml-auto inline-flex items-center gap-1 font-semibold transition hover:text-slate-950">{t("standings.winRate")} <span className="text-[10px] text-slate-400">{sortIndicator("winRate")}</span></button>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedRows.map((row) => {
                      const isCurrentPlayer = currentPlayerId === row.player_id;

                      return (
                      <tr
                        key={row.player_id}
                        data-rank={row.rank}
                        className={[
                          "border-t border-slate-100 transition",
                          isCurrentPlayer
                            ? "bg-cyan-50/75 shadow-[inset_3px_0_0_rgba(6,182,212,0.55)] hover:bg-cyan-100/70"
                            : "hover:bg-slate-50/70",
                        ].join(" ")}
                      >
                        <td className="px-2 py-2 align-middle">
                          <div className="flex items-center gap-1.5">
                            <div className="shrink-0 text-sm font-black leading-none text-slate-700">{row.rank}</div>
                            <div className={`text-[10px] font-semibold ${movementClass(initialClubId === DEMO_STANDINGS_MOVEMENT_CLUB_ID ? getDemoMovementValue(row.rank, row.deltaRank) : row.deltaRank)}`}>
                              {movementText(initialClubId === DEMO_STANDINGS_MOVEMENT_CLUB_ID ? getDemoMovementValue(row.rank, row.deltaRank) : row.deltaRank)}
                            </div>
                          </div>
                        </td>

                        <td className="min-w-0 px-1.5 py-2 align-middle">
                          <div className="flex min-w-0 items-center gap-1.5">
                            {hallOfFameEnabled ? (
                              <Link
                                href={`/badges?player=${row.player_id}`}
                                className={`min-w-0 truncate whitespace-nowrap text-[13px] text-slate-950 underline decoration-slate-200 underline-offset-4 transition hover:decoration-slate-500 sm:text-sm ${row.rank <= 3 ? "font-bold" : "font-semibold"}`}
                                title={t("standings.viewHallOfFame")}
                              >
                                {getPlayerDisplayName(row)}
                              </Link>
                            ) : (
                              <span className={`min-w-0 truncate whitespace-nowrap text-[13px] text-slate-950 sm:text-sm ${row.rank <= 3 ? "font-bold" : "font-semibold"}`}>
                                {getPlayerDisplayName(row)}
                              </span>
                            )}
                            <div className="flex shrink-0 items-center gap-0.5">
                              <PlayerBadge mvpCount={row.mvps} size="sm" hideIfNone iconOnly />
                              {getTrainingAwards(row).length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const awards = getTrainingAwards(row);
                                    const firstAward = awards[0];
                                    if (!firstAward) return;
                                    setActiveAward({
                                      playerName: getPlayerDisplayName(row),
                                      award: {
                                        ...firstAward,
                                        shortLabel: awards.length > 1 ? `${awards.length} Awards` : firstAward.shortLabel,
                                        label: awards.length > 1 ? awards.map((award) => `${award.shortLabel}: ${award.label}`).join(" · ") : firstAward.label,
                                      },
                                    });
                                  }}
                                  title={`${getTrainingAwards(row).length} Award${getTrainingAwards(row).length === 1 ? "" : "s"}`}
                                  className="inline-flex transition hover:scale-105"
                                >
                                  <AwardSummaryBadge count={getTrainingAwards(row).length} />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-1 py-2 text-right font-semibold text-slate-900">{row.wins}</td>
                        <td className="px-1 py-2 text-right text-slate-700">{row.sessions}</td>
                        <td className="px-1.5 py-2 text-right font-bold text-slate-900">{formatWinRate(row.wins, row.sessions)}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[10px] text-slate-500">{t("standings.winRateHint")}</div>
                <div className="text-[10px] font-medium text-slate-500">made with strikr · #strikr</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">{t("standings.shareSection")}</div>
                  <div className="mt-1 max-w-xl text-[11px] leading-5 text-slate-500">
                    {t("standings.shareSectionHint")}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{t("standings.playersSort", { count: rows.length }).split(" · ")[0]}</div>
              </div>

              <div className="space-y-3">
                {rankingCards.map((card) => {
                  const title = card.startRank === card.endRank
                    ? t("standings.shareRank", { rank: card.startRank })
                    : t("standings.shareRanks", { start: card.startRank, end: card.endRank });
                  const isTopCard = card.index === 0;

                  return (
                    <div key={card.exportId} className={`rounded-2xl border p-3 shadow-sm ${isTopCard ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white"}`}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-slate-900">{isTopCard ? "Top 10" : title}</div>
                            {isTopCard ? <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">{t("standings.recommended")}</span> : null}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">{selectedLabel} · {isTopCard ? t("standings.mainCard") : t("standings.continuation", { number: card.index + 1 })}</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleShareCard(card)}
                            disabled={sharingCardIndex === card.index}
                            className={`rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 ${sharingCardIndex === card.index ? "cursor-not-allowed opacity-60" : ""}`}
                          >
                            {sharingCardIndex === card.index ? t("standings.sharing") : isTopCard ? t("standings.shareTop10") : t("standings.shareRange", { range: title })}
                          </button>
                          <ExportButtons targetId={card.exportId} fileBaseName={card.fileBaseName} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {!loading && !err && rankingCards.length > 0 ? (
        <div aria-hidden="true" className="pointer-events-none fixed -left-[99999px] top-0">
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
      ) : null}
    </>
  );
}
