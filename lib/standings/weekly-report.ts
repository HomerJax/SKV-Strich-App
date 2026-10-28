/**
 * Pure, date-window based narrative highlights for the standings pilot.
 * Snapshots are reconstructed from session dates, not historic database writes.
 * A missing baseline never produces fabricated rank movements.
 */
export type WeeklyRankRow = {
  player_id: number;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  rank: number;
  wins: number;
  sessions: number;
  photoUrl?: string | null;
};

export type WeeklyMover = {
  player_id: number;
  name: string;
  fromRank: number;
  toRank: number;
  places: number;
  photoUrl?: string | null;
};

export type WeeklyExtraHighlight = {
  kind: "wheel" | "leader" | "top5" | "finale";
  title: string;
  text: string;
  playerId?: number;
  playerName?: string;
  photoUrl?: string | null;
};

export type WeeklyWheelMoment = {
  playerId: number;
  playerName: string;
  photoUrl?: string | null;
  outcomeLabel: string;
  outcomeDetail?: string | null;
  outcomeIcon?: string | null;
};

export type WeeklyReport = {
  cutoffDate: string;
  completedTrainings: number;
  hasBaseline: boolean;
  biggestRiser: WeeklyMover | null;
  biggestFaller: WeeklyMover | null;
  leaderChanged: boolean;
  leaderName: string | null;
  topGapWins: number | null;
  topNames: string[];
  upcomingTrainings: number | null;
  seasonEndDate: string | null;
  headlines: string[];
  extraHighlight: WeeklyExtraHighlight | null;
};

function playerName(row: WeeklyRankRow): string {
  const full = [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean).join(" ");
  return full || row.nickname?.trim() || row.name?.trim() || "Spieler";
}

/** Generate only statements substantiated by the supplied standings. */
export function buildWeeklyReport(input: {
  current: WeeklyRankRow[];
  previous: WeeklyRankRow[];
  cutoffDate: string;
  completedTrainings: number;
  upcomingTrainings?: number | null;
  seasonEndDate?: string | null;
  wheelMoment?: WeeklyWheelMoment | null;
}): WeeklyReport {
  const { current, previous, cutoffDate, completedTrainings } = input;
  const hasBaseline = previous.length > 0;
  const canCompare = hasBaseline && completedTrainings > 0;
  const oldRanks = new Map(previous.map((row) => [row.player_id, row.rank]));
  const movers = canCompare
    ? current.flatMap((row): WeeklyMover[] => {
      const fromRank = oldRanks.get(row.player_id);
      if (fromRank == null || fromRank === row.rank) return [];
      return [{ player_id: row.player_id, name: playerName(row),
        fromRank, toRank: row.rank, places: fromRank - row.rank, photoUrl: row.photoUrl ?? null }];
    })
    : [];
  const rising = movers.filter((row) => row.places > 0).sort((a, b) =>
    b.places - a.places || a.toRank - b.toRank || a.player_id - b.player_id);
  const falling = movers.filter((row) => row.places < 0).sort((a, b) =>
    a.places - b.places || a.toRank - b.toRank || a.player_id - b.player_id);
  const top = current[0] ?? null;
  const second = current[1] ?? null;
  const oldTop = previous[0] ?? null;
  const oldLeaders = previous.filter((row) => row.rank === 1);
  const currentLeaders = current.filter((row) => row.rank === 1);
  // A rank-1 tie or reordering by name is not an unambiguous new leader.
  const leaderChanged = canCompare && !!top && !!oldTop
    && oldLeaders.length === 1 && currentLeaders.length === 1
    && top.player_id !== oldTop.player_id;
  const topGapWins = top && second ? Math.max(0, top.wins - second.wins) : null;
  const topNames = current.slice(0, 3).map(playerName);
  const upcomingTrainings = Number.isInteger(input.upcomingTrainings) && (input.upcomingTrainings ?? -1) >= 0
    ? input.upcomingTrainings! : null;
  const headlines: string[] = [];
  const newTopFive = canCompare
    ? current.find((row) => row.rank <= 5 &&
      oldRanks.has(row.player_id) && (oldRanks.get(row.player_id) ?? 0) > 5)
    : null;
  // Do not manufacture extra highlights without supporting data.
  const extraHighlight: WeeklyExtraHighlight | null =
    input.wheelMoment
      ? { kind: "wheel", title: "Glücksrad-Moment",
          text: input.wheelMoment.playerName + " hat „" + input.wheelMoment.outcomeLabel + "“ gedreht"
            + (input.wheelMoment.outcomeDetail ? " – " + input.wheelMoment.outcomeDetail : ""),
          playerId: input.wheelMoment.playerId,
          playerName: input.wheelMoment.playerName,
          photoUrl: input.wheelMoment.photoUrl ?? null }
    : leaderChanged && top
      ? { kind: "leader", title: "Führungswechsel",
          text: `${playerName(top)} übernimmt Platz 1`,
          playerId: top.player_id, playerName: playerName(top), photoUrl: top.photoUrl ?? null }
      : newTopFive
        ? { kind: "top5", title: "Neu in den Top 5",
            text: `${playerName(newTopFive)} ist jetzt auf Platz ${newTopFive.rank}`,
            playerId: newTopFive.player_id, playerName: playerName(newTopFive), photoUrl: newTopFive.photoUrl ?? null }
        : upcomingTrainings !== null && upcomingTrainings > 0 && upcomingTrainings <= 3
          && input.seasonEndDate && input.seasonEndDate >= cutoffDate
          ? { kind: "finale", title: "Saisonfinale",
              text: `Noch ${upcomingTrainings} geplante ${upcomingTrainings === 1 ? "Einheit" : "Einheiten"} bis Saisonende` }
          : null;

  if (canCompare) {
    if (rising[0]) headlines.push(`Aufsteiger: ${rising[0].name} +${rising[0].places} Plätze (${rising[0].fromRank} → ${rising[0].toRank})`);
    if (falling[0]) headlines.push(`Absteiger: ${falling[0].name} −${Math.abs(falling[0].places)} Plätze (${falling[0].fromRank} → ${falling[0].toRank})`);
    if (leaderChanged && top) headlines.push(`Führungswechsel: ${playerName(top)} jetzt auf Platz 1`);
    if (top && second && topGapWins !== null && topGapWins <= 2) {
      headlines.push(topGapWins === 0
        ? `Spitze eng: ${playerName(top)} und ${playerName(second)} mit je ${top.wins} Siegen`
        : `Spitze eng: nur ${topGapWins} ${topGapWins === 1 ? "Sieg" : "Siege"} zwischen Platz 1 und 2`);
    }
  }
  if (upcomingTrainings !== null && upcomingTrainings > 0 && upcomingTrainings <= 3
    && input.seasonEndDate && input.seasonEndDate >= cutoffDate) {
    headlines.push(`Saisonfinale: noch ${upcomingTrainings} ${upcomingTrainings === 1 ? "geplanter Trainingstermin" : "geplante Trainingstermine"} bis Saisonende`);
  }
  return {
    cutoffDate, completedTrainings, hasBaseline,
    biggestRiser: rising[0] ?? null, biggestFaller: falling[0] ?? null,
    leaderChanged, leaderName: top ? playerName(top) : null,
    topGapWins, topNames, upcomingTrainings,
    seasonEndDate: input.seasonEndDate ?? null,
    headlines: headlines.slice(0, 5),
    extraHighlight,
  };
}
