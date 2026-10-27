import assert from "node:assert/strict";
import test from "node:test";
import {
  canCompleteTraining,
  hasNewAuthIdentity,
  hasValidNormalTrainingResult,
  hasValidTournamentCompletion,
} from "../lib/analytics/growth-funnel-guards.ts";

test("a valid saved normal-training result, including a draw, is complete", () => {
  assert.equal(hasValidNormalTrainingResult([{
    game_no: 1,
    team_a_id: 10,
    team_b_id: 11,
    goals_team_a: 0,
    goals_team_b: 0,
  }]), true);
});

test("missing, partial, or invalid normal-training results do not complete", () => {
  assert.equal(hasValidNormalTrainingResult([]), false);
  assert.equal(hasValidNormalTrainingResult([{ game_no: 1, team_a_id: 10, team_b_id: 11, goals_team_a: 2, goals_team_b: null }]), false);
  assert.equal(hasValidNormalTrainingResult([
    { game_no: 1, team_a_id: 10, team_b_id: 11, goals_team_a: 2, goals_team_b: 1 },
    { game_no: 2, team_a_id: 10, team_b_id: 11, goals_team_a: null, goals_team_b: null },
  ]), false);
  assert.equal(hasValidNormalTrainingResult([{ game_no: 0, team_a_id: 10, team_b_id: 11, goals_team_a: 2, goals_team_b: 1 }]), false);
  assert.equal(hasValidNormalTrainingResult([{ game_no: 1, team_a_id: 10, team_b_id: 10, goals_team_a: 2, goals_team_b: 1 }]), false);
  assert.equal(hasValidNormalTrainingResult([{ game_no: 1, team_a_id: 10, team_b_id: 11, goals_team_a: -1, goals_team_b: 1 }]), false);
});

test("tournament completion requires finalization, winner, and every match scored", () => {
  const match = { game_no: 1, team_a_id: 10, team_b_id: 11, goals_team_a: 2, goals_team_b: 1 };
  assert.equal(hasValidTournamentCompletion({ completedAt: "2026-10-27T12:00:00.000Z", winnerTeamId: 10, matches: [match] }), true);
  assert.equal(hasValidTournamentCompletion({ completedAt: null, winnerTeamId: 10, matches: [match] }), false);
  assert.equal(hasValidTournamentCompletion({ completedAt: "not-a-date", winnerTeamId: 10, matches: [match] }), false);
  assert.equal(hasValidTournamentCompletion({ completedAt: "2026-10-27T12:00:00.000Z", winnerTeamId: null, matches: [match] }), false);
  assert.equal(hasValidTournamentCompletion({ completedAt: "2026-10-27T12:00:00.000Z", winnerTeamId: 12, matches: [match] }), false);
  assert.equal(hasValidTournamentCompletion({ completedAt: "2026-10-27T12:00:00.000Z", winnerTeamId: 10, matches: [match, { ...match, game_no: 2, goals_team_a: null }] }), false);
  assert.equal(hasValidTournamentCompletion({ completedAt: "2026-10-27T12:00:00.000Z", winnerTeamId: 10, matches: [] }), false);
});

test("only admins, power users, or assigned training leaders may complete", () => {
  assert.equal(canCompleteTraining({ isPowerUser: false, role: "admin", canLeadTraining: false }), true);
  assert.equal(canCompleteTraining({ isPowerUser: true, role: "player", canLeadTraining: false }), true);
  assert.equal(canCompleteTraining({ isPowerUser: false, role: "player", canLeadTraining: true }), true);
  assert.equal(canCompleteTraining({ isPowerUser: false, role: "player", canLeadTraining: false }), false);
  assert.equal(canCompleteTraining({ isPowerUser: false, role: "member", canLeadTraining: false }), false);
});

test("signup identity tracking ignores Supabase's existing-account empty identity response", () => {
  assert.equal(hasNewAuthIdentity([{ id: "provider-identity" }]), true);
  assert.equal(hasNewAuthIdentity([]), false);
  assert.equal(hasNewAuthIdentity(null), false);
  assert.equal(hasNewAuthIdentity(undefined), false);
});
