import type { Player, TeamMap } from "@/app/sessions/[id]/session-types";
import type { BalanceCategory } from "@/app/sessions/[id]/session-ui";
import {
  shuffle, sumTeamScore, balanceGroupPenalty, categoryPositionBalancePenalty,
  positionBalancePenalty,
} from "@/app/sessions/[id]/session-ui";
import { compareTeamBalanceQuality, type TeamBalanceQuality } from "@/lib/team-generator-quality";

/** Run the same goalkeeper/strength/groups/position optimization as the wizard
 * exclusively against server-fetched player ratings.
 * No per-player strengths or scores are returned to the caller. */
export function generateBalancedTeamMap(
  present: Player[],
  options: { useStrength: boolean; useCategories: boolean; balanceCategories: BalanceCategory[] },
): { teams: TeamMap; aggregate: { a: number; b: number } } {
  if (present.length < 2) throw new Error("Mindestens zwei anwesende Spieler erforderlich.");
  const targetA = Math.ceil(present.length / 2);
  const targetB = Math.floor(present.length / 2);
  const keepers = present.filter(p => p.preferred_position === "goalkeeper");
  const field = present.filter(p => p.preferred_position !== "goalkeeper");
  const {useStrength, useCategories, balanceCategories} = options;
  const shouldUseScore = useStrength || useCategories;

  const evaluate = (A: Player[], B: Player[]): TeamBalanceQuality => ({
    goalkeeperDiff: Math.abs(
      A.filter(p => p.preferred_position === "goalkeeper").length -
      B.filter(p => p.preferred_position === "goalkeeper").length),
    scoreDiff: shouldUseScore
      ? Math.abs(sumTeamScore(A, options) - sumTeamScore(B, options)) : 0,
    groupPenalty: balanceGroupPenalty(A,B),
    categoryPositionPenalty: useCategories ? categoryPositionBalancePenalty(A,B,balanceCategories) : 0,
    positionPenalty: positionBalancePenalty(A,B),
  });

  let bestA: Player[] = [];
  let bestB: Player[] = [];
  let bestQuality: TeamBalanceQuality | null = null;
  const attempts = Math.max(1200, Math.min(6000, present.length * 250));
  for (let k = 0; k < attempts; k++) {
    const A: Player[] = [];
    const B: Player[] = [];
    let keepersA = 0;
    let keepersB = 0;
    for (const keeper of shuffle(keepers)) {
      if (A.length >= targetA) { B.push(keeper); keepersB++; }
      else if (B.length >= targetB) { A.push(keeper); keepersA++; }
      else if (keepersA < keepersB) { A.push(keeper); keepersA++; }
      else if (keepersB < keepersA) { B.push(keeper); keepersB++; }
      else if (Math.random() < .5) { A.push(keeper); keepersA++; }
      else { B.push(keeper); keepersB++; }
    }
    const shuffled = shuffle(field);
    const remainingA = targetA - A.length;
    const remainingB = targetB - B.length;
    A.push(...shuffled.slice(0, remainingA));
    B.push(...shuffled.slice(remainingA, remainingA + remainingB));
    if (A.length !== targetA || B.length !== targetB) continue;
    const quality = evaluate(A,B);
    if (!bestQuality || compareTeamBalanceQuality(quality,bestQuality) < 0) {
      bestQuality = quality; bestA = A; bestB = B;
    }
  }
  if (!bestQuality || !bestA.length || !bestB.length)
    throw new Error("Keine gültige Teamaufteilung gefunden.");
  for (let round = 0; round < Math.min(40,present.length * 2); round++) {
    let roundA = bestA, roundB = bestB;
    let quality = bestQuality, improved = false;
    for (let i = 0; i < bestA.length; i++) {
      for (let j = 0; j < bestB.length; j++) {
        const A = [...bestA], B = [...bestB];
        [A[i],B[j]] = [B[j],A[i]];
        const candidate = evaluate(A,B);
        if (compareTeamBalanceQuality(candidate,quality) < 0) {
          roundA = A; roundB = B; quality = candidate; improved = true;
        }
      }
    }
    if (!improved) break;
    bestA = roundA; bestB = roundB; bestQuality = quality;
  }
  const teams: TeamMap = {};
  for (const p of present) teams[p.id] = null;
  for (const p of bestA) teams[p.id] = "A";
  for (const p of bestB) teams[p.id] = "B";
  return { teams, aggregate: {
    a: shouldUseScore ? sumTeamScore(bestA,options) : bestA.length,
    b: shouldUseScore ? sumTeamScore(bestB,options) : bestB.length,
  } };
}
