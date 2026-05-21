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

export const strengthScore = (s: number | null) => {
  if (typeof s !== "number" || Number.isNaN(s)) return 3;
  return Math.max(1, Math.min(5, s));
};

export type BalanceCategory = {
  key: string;
  label: string;
};

type GeneratorScoreOptions = {
  useStrength: boolean;
  useCategories: boolean;
  balanceCategories?: BalanceCategory[];
};

function generatorCategoryClass(
  player: Player,
  balanceCategories: BalanceCategory[] = []
) {
  const key = player.category_key ?? null;

  if (key && balanceCategories[0]?.key === key) return "strong";
  if (key && balanceCategories[1]?.key === key) return "normal";

  // Fallback für ältere Daten/Clubs, solange age_group noch existiert.
  if (!key && player.age_group === "Ü32") return "strong";
  if (!key && player.age_group === "AH") return "normal";

  return "other";
}

export function categoryBaseScore(
  player: Player,
  balanceCategories: BalanceCategory[] = []
) {
  return generatorCategoryClass(player, balanceCategories) === "strong" ? 5 : 0;
}

export function playerGeneratorScore(
  player: Player,
  options: GeneratorScoreOptions = {
    useStrength: true,
    useCategories: true,
    balanceCategories: [],
  }
) {
  const categoryScore = options.useCategories
    ? categoryBaseScore(player, options.balanceCategories ?? [])
    : 0;
  const playerStrength = options.useStrength ? strengthScore(player.strength) : 0;

  return categoryScore + playerStrength;
}

export function sumTeamScore(
  team: Player[],
  options: GeneratorScoreOptions = {
    useStrength: true,
    useCategories: true,
    balanceCategories: [],
  }
) {
  return team.reduce(
    (sum, player) => sum + playerGeneratorScore(player, options),
    0
  );
}

export function teamPositionCounts(team: Player[]) {
  return {
    gk: team.filter((p) => p.preferred_position === "goalkeeper").length,
    def: team.filter((p) => p.preferred_position === "defense").length,
    att: team.filter((p) => p.preferred_position === "attack").length,
  };
}

export function positionBalancePenalty(teamA: Player[], teamB: Player[]) {
  const a = teamPositionCounts(teamA);
  const b = teamPositionCounts(teamB);

  return (
    Math.abs(a.gk - b.gk) * 2 +
    Math.abs(a.def - b.def) +
    Math.abs(a.att - b.att)
  );
}

function categoryPositionKey(
  player: Player,
  balanceCategories: BalanceCategory[] = []
) {
  const category = generatorCategoryClass(player, balanceCategories);
  const position = player.preferred_position ?? "unknown";

  return `${category}:${position}`;
}

function categoryPositionCounts(
  team: Player[],
  balanceCategories: BalanceCategory[] = []
) {
  const counts = new Map<string, number>();

  for (const player of team) {
    const key = categoryPositionKey(player, balanceCategories);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

export function categoryPositionBalancePenalty(
  teamA: Player[],
  teamB: Player[],
  balanceCategories: BalanceCategory[] = []
) {
  const a = categoryPositionCounts(teamA, balanceCategories);
  const b = categoryPositionCounts(teamB, balanceCategories);
  const keys = new Set([...a.keys(), ...b.keys()]);

  let penalty = 0;

  for (const key of keys) {
    const diff = Math.abs((a.get(key) ?? 0) - (b.get(key) ?? 0));
    penalty += diff <= 1 ? diff : diff * diff;
  }

  return penalty;
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

function getFirstName(name: string) {
  return name.split(" ")[0] ?? name;
}

export function sortForTeamView(
  a: Player,
  b: Player,
  useNicknames: boolean = false
) {
  const ra = positionRank(a.preferred_position);
  const rb = positionRank(b.preferred_position);

  if (ra !== rb) return ra - rb;

  const nameA = getFirstName(getPlayerDisplayName(a, { useNicknames }));
  const nameB = getFirstName(getPlayerDisplayName(b, { useNicknames }));

  return nameA.localeCompare(nameB, "de");
}

export function formatGermanDate(date: string) {
  return new Date(date).toLocaleDateString("de-DE");
}

export function normalizeGoalValue(value: string) {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (digitsOnly === "") return "";
  return digitsOnly;
}

function sharePlayerLabel(player: Player, useNicknames: boolean) {
  const base = getPlayerDisplayName(player, { useNicknames });
  return player.is_guest ? `${base} (Gast)` : base;
}

export function buildLineupShareText(
  session: SessionRow | null,
  teamA: Player[],
  teamB: Player[],
  useNicknames: boolean = false
) {
  const header = session
    ? `Aufstellung vom ${formatGermanDate(session.date)}`
    : "Aufstellung";

  const teamALines =
    teamA.length > 0
      ? teamA.map(
          (player, index) =>
            `${index + 1}. ${sharePlayerLabel(
              player,
              useNicknames
            )} (${positionLabel(player.preferred_position)})`
        )
      : ["Noch keine Spieler zugewiesen."];

  const teamBLines =
    teamB.length > 0
      ? teamB.map(
          (player, index) =>
            `${index + 1}. ${sharePlayerLabel(
              player,
              useNicknames
            )} (${positionLabel(player.preferred_position)})`
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
  teamB: Player[],
  _useNicknames: boolean = false
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