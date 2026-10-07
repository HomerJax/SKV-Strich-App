export type TournamentTeam = {
  id: number;
  name: string;
};

export type TournamentMatch = {
  id?: number;
  game_no: number;
  team_a_id: number;
  team_b_id: number;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

export type TournamentStanding = {
  teamId: number;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export function buildRoundRobinSchedule(teamIds: number[], rounds = 2) {
  const uniqueIds = Array.from(new Set(teamIds.filter(Number.isFinite)));
  if (uniqueIds.length < 2) return [] as Array<{ game_no: number; team_a_id: number; team_b_id: number }>;

  const ghost = -1;
  const participants = uniqueIds.length % 2 === 0 ? [...uniqueIds] : [...uniqueIds, ghost];
  const fixtures: Array<{ game_no: number; team_a_id: number; team_b_id: number }> = [];
  let rotation = [...participants];
  let gameNo = 1;

  for (let leg = 0; leg < Math.max(1, rounds); leg += 1) {
    for (let round = 0; round < rotation.length - 1; round += 1) {
      for (let i = 0; i < rotation.length / 2; i += 1) {
        const left = rotation[i];
        const right = rotation[rotation.length - 1 - i];
        if (left === ghost || right === ghost) continue;
        const swap = leg % 2 === 1;
        fixtures.push({
          game_no: gameNo++,
          team_a_id: swap ? right : left,
          team_b_id: swap ? left : right,
        });
      }

      rotation = [
        rotation[0],
        rotation[rotation.length - 1],
        ...rotation.slice(1, rotation.length - 1),
      ];
    }
  }

  return fixtures;
}

export function calculateTournamentStandings(
  teams: TournamentTeam[],
  matches: TournamentMatch[],
): TournamentStanding[] {
  const byTeam = new Map<number, TournamentStanding>();

  for (const team of teams) {
    byTeam.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    if (match.goals_team_a == null || match.goals_team_b == null) continue;
    const a = byTeam.get(match.team_a_id);
    const b = byTeam.get(match.team_b_id);
    if (!a || !b) continue;

    a.played += 1;
    b.played += 1;
    a.goalsFor += match.goals_team_a;
    a.goalsAgainst += match.goals_team_b;
    b.goalsFor += match.goals_team_b;
    b.goalsAgainst += match.goals_team_a;

    if (match.goals_team_a > match.goals_team_b) {
      a.wins += 1;
      b.losses += 1;
      a.points += 3;
    } else if (match.goals_team_b > match.goals_team_a) {
      b.wins += 1;
      a.losses += 1;
      b.points += 3;
    } else {
      a.draws += 1;
      b.draws += 1;
      a.points += 1;
      b.points += 1;
    }
  }

  for (const row of byTeam.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  return Array.from(byTeam.values()).sort((a, b) =>
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    a.teamName.localeCompare(b.teamName, "de")
  );
}

export function hasUniqueTournamentWinner(standings: TournamentStanding[]) {
  if (standings.length < 2) return false;
  const [first, second] = standings;
  return (
    first.points !== second.points ||
    first.goalDifference !== second.goalDifference ||
    first.goalsFor !== second.goalsFor
  );
}
