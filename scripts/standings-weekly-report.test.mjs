import assert from "node:assert/strict";
import test from "node:test";
import { buildWeeklyReport } from "../lib/standings/weekly-report.ts";

const row = (player_id, rank, wins, name = `Spieler ${player_id}`) =>
  ({ player_id, rank, wins, sessions: 9, name });

test("largest rank changes are determined from historic player ids, not invented", () => {
  const report = buildWeeklyReport({
    current: [row(2, 1, 8), row(3, 2, 7), row(1, 3, 7), row(4, 4, 5), row(5, 5, 2)],
    previous: [row(1, 1, 7), row(2, 2, 7), row(4, 3, 5), row(5, 4, 2), row(3, 5, 1)],
    cutoffDate: "2026-10-20", completedTrainings: 2,
  });
  assert.equal(report.biggestRiser?.player_id, 3);
  assert.equal(report.biggestRiser?.places, 3);
  assert.equal(report.biggestFaller?.player_id, 1);
  assert.equal(report.biggestFaller?.places, -2);
  assert.equal(report.leaderChanged, true);
  assert.equal(report.topGapWins, 1);
  assert.ok(report.headlines.some((h) => h.includes("Führungswechsel")));
  assert.ok(report.headlines.some((h) => h.includes("Spitze eng")));
});

test("no baseline must never manufacture rank movements or tight race stories", () => {
  const report = buildWeeklyReport({
    current: [row(1, 1, 3), row(2, 2, 2)],
    previous: [], cutoffDate: "2026-10-20", completedTrainings: 1,
  });
  assert.equal(report.hasBaseline, false);
  assert.equal(report.biggestRiser, null);
  assert.equal(report.biggestFaller, null);
  assert.deepEqual(report.headlines, []);
});

test("without a completed training in window, no changes are claimed", () => {
  const report = buildWeeklyReport({
    current: [row(2, 1, 4), row(1, 2, 3)],
    previous: [row(1, 1, 3), row(2, 2, 3)],
    cutoffDate: "2026-10-20", completedTrainings: 0,
  });
  assert.equal(report.biggestRiser, null);
  assert.equal(report.leaderChanged, false);
  assert.equal(report.headlines.length, 0);
});

test("ties do not trigger an invented change of leader", () => {
  const report = buildWeeklyReport({
    current: [row(2, 1, 4), row(1, 1, 4)],
    previous: [row(1, 1, 4), row(2, 1, 4)],
    cutoffDate: "2026-10-20", completedTrainings: 1,
  });
  assert.equal(report.leaderChanged, false);
  assert.ok(report.headlines.some((h) => h.includes("gleichauf")));
});

test("season-final heading only uses real scheduled remaining training dates", () => {
  const baseline = {
    current: [row(1, 1, 6), row(2, 2, 5)],
    previous: [row(1, 1, 5), row(2, 2, 4)],
    cutoffDate: "2026-10-20", completedTrainings: 1,
    seasonEndDate: "2026-12-20",
  };
  const finale = buildWeeklyReport({ ...baseline, upcomingTrainings: 3 });
  assert.ok(finale.headlines.some((h) => h.includes("noch 3 geplante Trainingstermine")));
  const tooEarly = buildWeeklyReport({ ...baseline, upcomingTrainings: 5 });
  assert.ok(!tooEarly.headlines.some((h) => h.startsWith("Saisonfinale")));
  const unknown = buildWeeklyReport({ ...baseline, upcomingTrainings: null });
  assert.ok(!unknown.headlines.some((h) => h.startsWith("Saisonfinale")));
});
