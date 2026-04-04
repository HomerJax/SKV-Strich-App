import { getPlayerDisplayName } from "@/lib/player-display";
import type { Player, SessionRow } from "./session-types";

export function getErrorMessage(e: unknown, fallback: string) {
  if (
    e &&
    typeof e === "object" &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return (e as { message: string }).message;
  }

  return fallback;
}

export function positionLabel(pos: Player["preferred_position"]) {
  if (pos === "defense") return "Hinten";
  if (pos === "attack") return "Vorne";
  if (pos === "goalkeeper") return "Torwart";
  return "Unbekannt";
}

export function badgeColor(pos: Player["preferred_position"]) {
  if (pos === "defense") return "bg-sky-100 text-sky-800";
  if (pos === "attack") return "bg-orange-100 text-orange-800";
  if (pos === "goalkeeper") return "bg-purple-100 text-purple-800";
  return "bg-slate-100 text-slate-700";
}

export function ageBadgeColor(age: Player["age_group"]) {
  if (age === "Ü32") return "bg-amber-100 text-amber-800";
  if (age === "AH") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

/**
 * Individuelle Stärke bleibt 1–5.
 * Wenn nichts gepflegt ist, wird konservativ 3 angenommen.
 */
export const strengthScore = (s: number | null) => {
  if (typeof s !== "number" || Number.isNaN(s)) return 3;
  return Math.max(1, Math.min(5, s));
};

/**
 * Harte Kategorietrennung:
 * AH 1–5   => 1–5
 * Ü32 1–5  => 6–10
 *
 * Damit gilt:
 * - AH 5 = 5
 * - Ü32 1 = 6
 */
export const categoryBaseScore = (age: Player["age_group"]) => {
  if (age === "Ü32") return 5;
  if (age === "AH") return 0;
  return 0;
};

export function playerGeneratorScore(player: Player) {
  return categoryBaseScore(player.age_group) + strengthScore(player.strength);
}

export function sumTeamScore(team: Player[]) {
  return team.reduce((sum, player) => sum + playerGeneratorScore(player), 0);
}

export function teamPositionCounts(team: Player[]) {
  return {
    gk: team.filter((p) => p.preferred_position === "goalkeeper").length,
    def: team.filter((p) => p.preferred_position === "defense").length,
    att: team.filter((p) => p.preferred_position === "attack").length,
  };
}

/**
 * Positionen sind KEIN Qualitätsbonus / -malus.
 * Es wird nur bewertet, wie ähnlich die Positionsverteilung
 * zwischen Team A und Team B ist.
 *
 * Torhüter zählen etwas stärker, weil dort ein Ungleichgewicht
 * besonders auffällt.
 */
export function positionBalancePenalty(teamA: Player[], teamB: Player[]) {
  const a = teamPositionCounts(teamA);
  const b = teamPositionCounts(teamB);

  return (
    Math.abs(a.gk - b.gk) * 2 +
    Math.abs(a.def - b.def) +
    Math.abs(a.att - b.att)
  );
}

export function shuffle<T>(arr: T[]) {
  const c = [...arr];

  for (let i = c.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }

  return c;
}

export function positionRank(pos: Player["preferred_position"]) {
  if (pos === "goalkeeper") return 0;
  if (pos === "defense") return 1;
  if (pos === "attack") return 2;
  return 3;
}

function playerSortName(player: Player) {
  const firstName = (player.first_name || "").trim();
  const lastName = (player.last_name || "").trim();
  const fallbackName = (player.name || "").trim();

  return {
    firstName,
    lastName,
    fallbackName,
  };
}

export function sortForTeamView(a: Player, b: Player) {
  const ra = positionRank(a.preferred_position);
  const rb = positionRank(b.preferred_position);

  if (ra !== rb) return ra - rb;

  const aName = playerSortName(a);
  const bName = playerSortName(b);

  const firstCompare = aName.firstName.localeCompare(bName.firstName, "de", {
    sensitivity: "base",
  });
  if (firstCompare !== 0) return firstCompare;

  const lastCompare = aName.lastName.localeCompare(bName.lastName, "de", {
    sensitivity: "base",
  });
  if (lastCompare !== 0) return lastCompare;

  return aName.fallbackName.localeCompare(bName.fallbackName, "de", {
    sensitivity: "base",
  });
}

export function formatGermanDate(date: string) {
  return new Date(date).toLocaleDateString("de-DE");
}

export function normalizeGoalValue(value: string) {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (digitsOnly === "") return "";
  return digitsOnly;
}

function sharePlayerLabel(player: Player) {
  const base = getPlayerDisplayName(player);
  return player.is_guest ? `${base} (Gast)` : base;
}

export function buildLineupShareText(
  session: SessionRow | null,
  teamA: Player[],
  teamB: Player[]
) {
  const header = session
    ? `Aufstellung vom ${formatGermanDate(session.date)}`
    : "Aufstellung";

  const teamALines =
    teamA.length > 0
      ? teamA.map(
          (player, index) =>
            `${index + 1}. ${sharePlayerLabel(player)} (${positionLabel(
              player.preferred_position
            )})`
        )
      : ["Noch keine Spieler zugewiesen."];

  const teamBLines =
    teamB.length > 0
      ? teamB.map(
          (player, index) =>
            `${index + 1}. ${sharePlayerLabel(player)} (${positionLabel(
              player.preferred_position
            )})`
        )
      : ["Noch keine Spieler zugewiesen."];

  return [
    `${header}`,
    "",
    `Team 1 (${teamA.length})`,
    ...teamALines,
    "",
    `Team 2 (${teamB.length})`,
    ...teamBLines,
    "",
    "made with strikr",
    "#strikr",
  ].join("\n");
}

export function buildResultShareText(
  session: SessionRow | null,
  goalsA: string,
  goalsB: string,
  teamA: Player[],
  teamB: Player[]
) {
  const header = session
    ? `Ergebnis vom ${formatGermanDate(session.date)}`
    : "Ergebnis";

  const scoreA = goalsA.trim() === "" ? "?" : goalsA.trim();
  const scoreB = goalsB.trim() === "" ? "?" : goalsB.trim();

  const winnerLine =
    goalsA.trim() !== "" && goalsB.trim() !== ""
      ? Number(goalsA) === Number(goalsB)
        ? "Unentschieden"
        : Number(goalsA) > Number(goalsB)
          ? "Sieger: Team 1"
          : "Sieger: Team 2"
      : "Ergebnis noch unvollständig";

  return [
    `${header}`,
    "",
    `Team 1 ${scoreA}:${scoreB} Team 2`,
    winnerLine,
    "",
    `Team 1 (${teamA.length} Spieler)`,
    `Team 2 (${teamB.length} Spieler)`,
    "",
    "made with strikr",
    "#strikr",
  ].join("\n");
}

export function winnerLabel(goalsA: string, goalsB: string) {
  if (goalsA.trim() === "" || goalsB.trim() === "") {
    return "Noch kein vollständiges Ergebnis";
  }

  const a = Number(goalsA);
  const b = Number(goalsB);

  if (Number.isNaN(a) || Number.isNaN(b)) {
    return "Noch kein vollständiges Ergebnis";
  }

  if (a === b) return "Unentschieden";
  return a > b ? "Team 1 gewinnt" : "Team 2 gewinnt";
}

export function winnerBadgeClass(goalsA: string, goalsB: string) {
  if (goalsA.trim() === "" || goalsB.trim() === "") {
    return "bg-slate-100 text-slate-700";
  }

  const a = Number(goalsA);
  const b = Number(goalsB);

  if (Number.isNaN(a) || Number.isNaN(b)) {
    return "bg-slate-100 text-slate-700";
  }

  if (a === b) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-emerald-100 text-emerald-800";
}