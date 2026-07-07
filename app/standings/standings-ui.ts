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
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return "+1";
}

export function movementClass(d: number | null) {
  if (delta < 0) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export type TrainingAward = {
  key:
    | "leader"
    | "win_streak"
    | "loss_streak"
    | "attendance_streak"
    | "riser"
    | "evergreen";
  label: string;
  shortLabel: string;
  mark: string;
  tone: "dark" | "green" | "red" | "blue" | "slate" | "amber";
};

export function getTrainingAwards(row: RankRow): TrainingAward[] {
  const awards: TrainingAward[] = [];

  if (row.rank === 1) {
    awards.push({
      key: "leader",
      label: "Tabellenführer",
      shortLabel: "Leader",
      mark: "L",
      tone: "dark",
    });
  }

  if (row.currentWinStreak >= 3) {
    awards.push({
      key: "win_streak",
      label: `${row.currentWinStreak} Siege am Stück`,
      shortLabel: "Siegesserie",
      mark: "S",
      tone: "green",
    });
  }

  if (row.currentLossStreak >= 3) {
    awards.push({
      key: "loss_streak",
      label: `${row.currentLossStreak} Niederlagen am Stück`,
      shortLabel: "Pechvogel",
      mark: "P",
      tone: "red",
    });
  }

  if (row.currentAttendanceStreak >= 5) {
    awards.push({
      key: "attendance_streak",
      label: `${row.currentAttendanceStreak}x in Folge dabei`,
      shortLabel: "Immer dabei",
      mark: "I",
      tone: "blue",
    });
  }

  if (row.deltaRank !== null && row.deltaRank >= 2) {
    awards.push({
      key: "riser",
      label: `${row.deltaRank} Plätze gutgemacht`,
      shortLabel: "Aufsteiger",
      mark: "A",
      tone: "amber",
    });
  }

  if (row.sessions >= 10) {
    awards.push({
      key: "evergreen",
      label: `${row.sessions} Teilnahmen`,
      shortLabel: "Dauerbrenner",
      mark: "D",
      tone: "slate",
    });
  }

  return awards;
}

export function awardClass(tone: TrainingAward["tone"]) {
  switch (tone) {
    case "dark":
      return "border-slate-900 bg-slate-950 text-white";
    case "green":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "red":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "blue":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "slate":
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
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