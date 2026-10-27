import assert from "node:assert/strict";
import test from "node:test";
import {
  balanceGroupPenalty,
  compareTeamBalanceQuality,
} from "../lib/team-generator-quality.ts";

const players = (group, amount) =>
  Array.from({ length: amount }, () => ({ balance_group: group }));

test("Gehfußballer, Defensivanker and Laufstark are weighted identically", () => {
  for (const group of ["Gehfußballer", "Defensivanker", "Laufstark", "Techniker", "Balance-Gruppe 1"]) {
    assert.equal(balanceGroupPenalty(players(group, 2), []), 4);
    assert.equal(balanceGroupPenalty(players(group, 1), players(group, 1)), 0);
    assert.equal(balanceGroupPenalty(players(group, 2), players(group, 1)), 1);
  }
});

test("groups are normalized, independently distributed, and optional", () => {
  const teamA = [
    ...players(" Gehfußballer ", 2),
    ...players("Defensivanker", 1),
    { balance_group: null },
    { balance_group: "" },
  ];
  const teamB = [
    ...players("GEHFUßBALLER", 1),
    ...players("Defensivanker", 2),
    { balance_group: " " },
  ];
  assert.equal(balanceGroupPenalty(teamA, teamB), 2);
  assert.equal(balanceGroupPenalty([{ balance_group: null }], [{}]), 0);
});

test("all balanced groups share one priority behind score and goalkeepers", () => {
  const base = {
    goalkeeperDiff: 0,
    scoreDiff: 0,
    groupPenalty: 0,
    categoryPositionPenalty: 0,
    positionPenalty: 0,
  };

  // A worse group spread beats neither a better goalkeeper spread nor team strength.
  assert.ok(compareTeamBalanceQuality({ ...base, groupPenalty: 4 }, { ...base, scoreDiff: 1 }) < 0);
  assert.ok(compareTeamBalanceQuality({ ...base, goalkeeperDiff: 1 }, { ...base, groupPenalty: 4 }) > 0);
  // With higher priorities equal, group balance matters more than fine tuning.
  assert.ok(compareTeamBalanceQuality({ ...base, groupPenalty: 2 }, { ...base, categoryPositionPenalty: 9 }) > 0);
  // Walking players are only represented through groupPenalty, not a separate quality field.
  assert.deepEqual(Object.keys(base), ["goalkeeperDiff","scoreDiff","groupPenalty","categoryPositionPenalty","positionPenalty"]);
});
