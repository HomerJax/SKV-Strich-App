import { getPlayerDisplayName } from "@/lib/player-display";
import type { RankRow, StandingRow } from "./standings-types";

export function sortRows(a: StandingRow, b: StandingRow) {
  if (b.wins !== a.wins) return b.wins - a.wins;
  if (b.sessions !== a.sessions) return b.sessions - a.sessions;
  return getPlayerDisplayName(a).localeCompare(getPlayerDisplayName(b), "de");
}

export function addRanks(rows: StandingRow[]): RankRow[] {
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

export function chunkRows<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function getErrorMessage(e: unknown, fallback: string) {
  if (
    e &&
    typeof e === "object" &&
    "message" in e &&
    typeof (e as { message?: unknown }).message === "string"
  ) {
    return (e as { message: string }).message;
  }
  return fallback;
}

export function movementText(d: number | null) {
  if (d == null) return "–";
  if (d === 0) return "→ 0";
  if (d > 0) return `↑ +${d}`;
  return `↓ ${d}`;
}

export function movementClass(d: number | null) {
  if (d == null) return "text-slate-400";
  if (d === 0) return "text-slate-500";
  if (d > 0) return "text-emerald-600";
  return "text-red-600";
}

export function buildStandingsShareText(
  selectedLabel: string,
  cardRows: RankRow[],
  startRank: number,
  endRank: number
) {
  const headline =
    startRank === endRank
      ? `${selectedLabel} – Platz ${startRank}`
      : `${selectedLabel} – Plätze ${startRank}–${endRank}`;

  const lines = cardRows.map((r) => {
    const movement = movementText(r.deltaRank);
    return `${r.rank}. ${getPlayerDisplayName(r)} · Siege ${r.wins} · MVPs ${r.mvps} · Teilnahmen ${r.sessions} · ${movement}`;
  });

  return [
    headline,
    `Stand: ${new Date().toLocaleDateString("de-DE")}`,
    "",
    ...lines,
    "",
    "made with strikr",
    "#strikr",
  ].join("\n");
}