import type { Player } from "./session-types";
import { getPlayerDisplayName } from "@/lib/player-display";

export type ClubSettings = {
  use_strength: boolean;
  strength_default: number;
  use_categories: boolean;
  category_label: string | null;
  position_label: string | null;
  attack_label: string | null;
  defense_label: string | null;
  goalkeeper_label: string | null;
  use_nicknames?: boolean;
  use_field_view?: boolean;
};

export function sameIdSet(a: number[], b: number[]) {
  if (a.length !== b.length) return false;

  const aSorted = [...a].sort((x, y) => x - y);
  const bSorted = [...b].sort((x, y) => x - y);

  return aSorted.every((value, index) => value === bSorted[index]);
}

export function getResultHighlight(scoreA: number, scoreB: number) {
  const diff = Math.abs(scoreA - scoreB);

  if (scoreA === scoreB) return "🤝 Alles offen";
  if (diff >= 3) return "💪 Dominanter Sieg";
  if (diff === 1) return "😮 Knappe Kiste";
  return "⚡ Klar entschieden";
}

export function getResultStory(scoreA: number, scoreB: number) {
  const diff = Math.abs(scoreA - scoreB);

  if (scoreA === scoreB) return "Zwei Teams auf Augenhöhe.";
  if (diff >= 3) return "Klare Sache heute.";
  if (diff === 1) return "Bis zum Schluss spannend.";
  return "Verdient durchgesetzt.";
}

function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
}

function pickVariant(seed: string, options: string[]) {
  if (options.length === 0) return "";
  return options[hashString(seed) % options.length];
}

export function getAutoTeamNames(
  sessionId: number,
  goalsA: number,
  goalsB: number,
  teamAPlayers: Player[],
  teamBPlayers: Player[],
  useNicknames: boolean
) {
  const seed = `${sessionId}-${goalsA}:${goalsB}-${teamAPlayers.length}-${teamBPlayers.length}`;
  const diff = Math.abs(goalsA - goalsB);
  const isDraw = goalsA === goalsB;

  const teamAFirst = teamAPlayers[0]
    ? getPlayerDisplayName(teamAPlayers[0], { useNicknames })
    : null;
  const teamBFirst = teamBPlayers[0]
    ? getPlayerDisplayName(teamBPlayers[0], { useNicknames })
    : null;

  const neutralA = [
    "Die Roten",
    "Die Flinken",
    "Die Kämpfer",
    "Die Wilden",
    "Die Maschinen",
    "Die Eisernen",
  ];

  const neutralB = [
    "Die Blauen",
    "Die Herausforderer",
    "Die Raketen",
    "Die Unbequemen",
    "Die Jäger",
    "Die Unermüdlichen",
  ];

  const stronger = [
    "Die Favoriten",
    "Die Dominanten",
    "Die Formstarken",
    "Die Titeljäger",
  ];

  const weaker = [
    "Die Underdogs",
    "Die Außenseiter",
    "Die Herausforderer",
    "Die Spätstarter",
  ];

  if (teamAFirst && teamBFirst && diff <= 1) {
    return {
      a: `Team ${teamAFirst}`,
      b: `Team ${teamBFirst}`,
    };
  }

  if (isDraw) {
    return {
      a: pickVariant(`${seed}-a`, neutralA),
      b: pickVariant(`${seed}-b`, neutralB),
    };
  }

  if (diff >= 3) {
    const winnerIsA = goalsA > goalsB;

    return winnerIsA
      ? {
          a: pickVariant(`${seed}-strong-a`, stronger),
          b: pickVariant(`${seed}-weak-b`, weaker),
        }
      : {
          a: pickVariant(`${seed}-weak-a`, weaker),
          b: pickVariant(`${seed}-strong-b`, stronger),
        };
  }

  return {
    a: pickVariant(`${seed}-neutral-a`, neutralA),
    b: pickVariant(`${seed}-neutral-b`, neutralB),
  };
}

export function sortPlayersByFirstName(players: Player[]) {
  return [...players].sort((a, b) => {
    const firstA = (a.first_name || "").trim().toLocaleLowerCase("de");
    const firstB = (b.first_name || "").trim().toLocaleLowerCase("de");

    const firstCompare = firstA.localeCompare(firstB, "de");
    if (firstCompare !== 0) return firstCompare;

    const lastA = (a.last_name || "").trim().toLocaleLowerCase("de");
    const lastB = (b.last_name || "").trim().toLocaleLowerCase("de");

    const lastCompare = lastA.localeCompare(lastB, "de");
    if (lastCompare !== 0) return lastCompare;

    const nameA = (a.name || "").trim().toLocaleLowerCase("de");
    const nameB = (b.name || "").trim().toLocaleLowerCase("de");

    return nameA.localeCompare(nameB, "de");
  });
}

export function withDisplayName(player: Player, useNicknames: boolean): Player {
  return {
    ...player,
    name: getPlayerDisplayName(player, { useNicknames }),
  };
}

export function withDisplayNames(players: Player[], useNicknames: boolean): Player[] {
  return players.map((player) => withDisplayName(player, useNicknames));
}

export function teamMeta(team: Player[]) {
  const gk = team.filter((p) => p.preferred_position === "goalkeeper").length;
  const def = team.filter((p) => p.preferred_position === "defense").length;
  const att = team.filter((p) => p.preferred_position === "attack").length;
  const ah = team.filter((p) => p.age_group === "AH").length;
  const u32 = team.filter((p) => p.age_group === "Ü32").length;
  return { gk, def, att, ah, u32 };
}