/**
 * Team-generator balance groups are optional profile tags.
 * Every non-empty group (including "Gehfußballer") has identical weight.
 */
export type BalanceGroupPlayer = { balance_group?: string | null };

function normalizeBalanceGroup(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim().toLocaleLowerCase("de-DE");
  return normalized || null;
}

function balanceGroupCounts(team: readonly BalanceGroupPlayer[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const player of team) {
    const group = normalizeBalanceGroup(player.balance_group);
    if (group) counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return counts;
}

/** Lower is better. No named group receives a priority bonus. */
export function balanceGroupPenalty(
  teamA: readonly BalanceGroupPlayer[],
  teamB: readonly BalanceGroupPlayer[],
): number {
  const a = balanceGroupCounts(teamA);
  const b = balanceGroupCounts(teamB);
  const groups = new Set([...a.keys(), ...b.keys()]);
  let penalty = 0;
  for (const group of groups) {
    const diff = Math.abs((a.get(group) ?? 0) - (b.get(group) ?? 0));
    penalty += diff <= 1 ? diff : diff * diff;
  }
  return penalty;
}

export type TeamBalanceQuality = {
  goalkeeperDiff: number;
  scoreDiff: number;
  groupPenalty: number;
  categoryPositionPenalty: number;
  positionPenalty: number;
};

/**
 * Lexicographic priorities in team generation:
 * goalkeeper distribution -> team score -> ALL profile groups equally ->
 * category/position distribution -> positions.
 * Equal team size is enforced before evaluating quality.
 */
const priorities: readonly (keyof TeamBalanceQuality)[] = [
  "goalkeeperDiff",
  "scoreDiff",
  "groupPenalty",
  "categoryPositionPenalty",
  "positionPenalty",
];

export function compareTeamBalanceQuality(
  left: TeamBalanceQuality,
  right: TeamBalanceQuality,
): number {
  for (const priority of priorities) {
    if (left[priority] !== right[priority]) {
      return left[priority] - right[priority];
    }
  }
  return 0;
}
