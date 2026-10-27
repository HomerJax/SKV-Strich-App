export type TrainingResultRow = {
  game_no: number | null;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

export type TournamentMatchRow = {
  game_no: number | null;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

export function hasNewAuthIdentity(identities: readonly unknown[] | null | undefined) {
  return Array.isArray(identities) && identities.length > 0;
}

function isValidScoredMatch(match: TournamentMatchRow) {
  return Number.isInteger(match.game_no) && (match.game_no ?? 0) >= 1
    && Number.isInteger(match.team_a_id) && Number.isInteger(match.team_b_id)
    && match.team_a_id !== match.team_b_id
    && Number.isInteger(match.goals_team_a) && (match.goals_team_a ?? -1) >= 0
    && Number.isInteger(match.goals_team_b) && (match.goals_team_b ?? -1) >= 0;
}

export function hasValidNormalTrainingResult(rows: TrainingResultRow[]) {
  return rows.length > 0 && rows.every(isValidScoredMatch);
}

export function hasValidTournamentCompletion(input: {
  completedAt: string | null;
  winnerTeamId: number | null;
  matches: TournamentMatchRow[];
}) {
  return input.completedAt !== null
    && Number.isFinite(Date.parse(input.completedAt))
    && Number.isInteger(input.winnerTeamId)
    && (input.winnerTeamId ?? 0) > 0
    && input.matches.length > 0
    && input.matches.some((match) => match.team_a_id === input.winnerTeamId || match.team_b_id === input.winnerTeamId)
    && input.matches.every(isValidScoredMatch);
}

export function canCompleteTraining(input: {
  isPowerUser: boolean;
  role: string | null;
  canLeadTraining: boolean;
}) {
  return input.isPowerUser || input.role === "admin" || input.canLeadTraining;
}
