import assert from "node:assert/strict";
import test from "node:test";
import { buildWeeklyReport } from "../lib/standings/weekly-report.ts";
import { weeklyRaceStory, weeklyStoryScale } from "../lib/standings/weekly-race-story.ts";
import { recognizePenaltySpecial, choosePenaltySpecial, isKistePenalty } from "../lib/standings/weekly-penalty-special.ts";
import { isWeeklyReportPilotClub } from "../lib/standings/weekly-report-pilots.ts";

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

test("fourth tile prefers a real top-five entry over routine weekly counts", () => {
  const report = buildWeeklyReport({
    current: [row(1, 1, 9), row(2, 2, 7), row(6, 3, 6), row(3, 4, 5), row(4, 5, 4), row(5, 6, 3)],
    previous: [row(1, 1, 8), row(2, 2, 7), row(3, 3, 5), row(4, 4, 4), row(5, 5, 3), row(6, 6, 1)],
    cutoffDate: "2026-10-20", completedTrainings: 1,
  });
  assert.equal(report.extraHighlight?.kind, "top5");
  assert.equal(report.extraHighlight?.playerId, 6);
});

test("new leader receives a photo reference in the fourth highlight", () => {
  const report = buildWeeklyReport({
    current: [{ ...row(2, 1, 8), photoUrl: "https://example.test/photo.jpg" }, row(1, 2, 7)],
    previous: [row(1, 1, 7), row(2, 2, 7)],
    cutoffDate: "2026-10-20", completedTrainings: 1,
  });
  assert.equal(report.extraHighlight?.kind, "leader");
  assert.equal(report.extraHighlight?.photoUrl, "https://example.test/photo.jpg");
});

test("no wheel spin or notable event means no filler fourth tile", () => {
  const base = {
    current: [row(1, 1, 4), row(2, 2, 2)],
    previous: [row(1, 1, 3), row(2, 2, 2)],
    cutoffDate: "2026-10-20",
  };
  assert.equal(buildWeeklyReport({ ...base, completedTrainings: 1 }).extraHighlight, null);
  assert.equal(buildWeeklyReport({ ...base, completedTrainings: 0 }).extraHighlight, null);
});

test("a genuine wheel result takes fourth-tile priority, with name and photo", () => {
  const report = buildWeeklyReport({
    current: [row(2, 1, 9), row(1, 2, 7)],
    previous: [row(1, 1, 7), row(2, 2, 8)],
    cutoffDate: "2026-10-20", completedTrainings: 1,
    wheelMoment: { playerId: 2, playerName: "Sommi", outcomeLabel: "Wäsche waschen",
      outcomeDetail: "Trikots einsammeln", photoUrl: "https://example.test/player.png" },
  });
  assert.equal(report.extraHighlight?.kind, "wheel");
  assert.equal(report.extraHighlight?.playerName, "Sommi");
  assert.equal(report.extraHighlight?.photoUrl, "https://example.test/player.png");
  assert.match(report.extraHighlight?.text ?? "", /Wäsche waschen/);
  assert.doesNotMatch(report.extraHighlight?.text ?? "", /Strafe entfällt/);
});

test("a wheel moment may appear even when no match was completed", () => {
  const report = buildWeeklyReport({
    current: [row(1, 1, 3)], previous: [row(1, 1, 3)],
    cutoffDate: "2026-10-20", completedTrainings: 0,
    wheelMoment: { playerId: 1, playerName: "Alex", outcomeLabel: "Joker" },
  });
  assert.equal(report.extraHighlight?.kind, "wheel");
  assert.equal(report.biggestRiser, null);
});

test("a one-win gap reads like a human football headline, with a factual supporting sentence", () => {
  const report = buildWeeklyReport({
    current: [row(1, 1, 8, "Sommi"), row(2, 2, 7, "Alex")],
    previous: [row(1, 1, 7, "Sommi"), row(2, 2, 6, "Alex")],
    cutoffDate: "2026-10-21", completedTrainings: 1,
  });
  const story = weeklyRaceStory(report);
  assert.equal(story?.headline, "🔥 Heißes Duell an der Spitze!");
  assert.equal(story?.detail, "Nur 1 Sieg trennt Sommi und Alex.");
});

test("a tied top spot gets a genuine head-to-head headline", () => {
  const story = weeklyRaceStory({ hasBaseline: true, completedTrainings: 1, topGapWins: 0,
    topNames: ["Alex", "Sommi"] });
  assert.match(story?.headline ?? "", /Kopf an Kopf/);
  assert.match(story?.detail ?? "", /gleichauf/);
});

test("no weekly results produce no potentially misleading title-race narrative", () => {
  assert.equal(weeklyRaceStory({ hasBaseline: true, completedTrainings: 0, topGapWins: 1,
    topNames: ["Sommi", "Alex"] }), null);
  assert.equal(weeklyRaceStory({ hasBaseline: false, completedTrainings: 1, topGapWins: 1,
    topNames: ["Sommi", "Alex"] }), null);
});

test("three cards use larger text and avatars than four cards", () => {
  const three = weeklyStoryScale(3);
  const four = weeklyStoryScale(4);
  assert.ok(three.headlinePx > four.headlinePx);
  assert.ok(three.detailPx > four.detailPx);
  assert.ok(three.avatarPx > four.avatarPx);
  assert.equal(weeklyStoryScale(2).detailPx, three.detailPx);
});

test("only a recorded missed-penalty fine can become an Elfer-Special", () => {
  const penalty = { id: 11, player_id: 3, reason: "Elfmeter verschossen",
    type: "beer", value: "1 Kiste Bier" };
  assert.equal(recognizePenaltySpecial(penalty)?.specialKind, "missed_penalty");
  assert.equal(isKistePenalty(penalty), true);
  assert.equal(recognizePenaltySpecial({ ...penalty, reason: "Elfmeter geschossen" }), null);
  assert.equal(recognizePenaltySpecial({ ...penalty, reason: "Verschossen" }), null);
  assert.equal(recognizePenaltySpecial({ ...penalty, source_key: "test:elfer:1" }), null);
});

test("Elfer special outranks birthday even when birthday fine is newer", () => {
  const entries = [
    { id: 2, player_id: 8, reason: "Geburtstag", type: "beer", value: "1 Kiste Bier" },
    { id: 1, player_id: 3, reason: "Elfmeter verschossen", type: "money", value: "1 €" },
  ];
  assert.equal(choosePenaltySpecial(entries)?.id, 1);
  assert.equal(choosePenaltySpecial(entries.slice(0, 1))?.specialKind, "birthday");
  assert.equal(isKistePenalty(entries[1]), false);
});

test("recorded missed kick creates factual Kischde highlight, without claiming paid", () => {
  const report = buildWeeklyReport({
    current: [row(1, 1, 9)],
    previous: [row(1, 1, 8)],
    cutoffDate: "2026-10-21",
    completedTrainings: 0,
    wheelMoment: { playerId: 1, playerName: "Sommi", outcomeLabel: "Joker" },
    penaltyMoment: { kind: "missed_penalty", playerId: 1, playerName: "Sommi",
      value: "1 Kiste Bier", isKiste: true, photoUrl: "https://example.test/sommi.png" },
  });
  assert.equal(report.extraHighlight?.kind, "missed_penalty");
  assert.match(report.extraHighlight?.text ?? "", /Sommi.*Elfer/);
  assert.match(report.extraHighlight?.detail ?? "", /Kischde/);
  assert.equal(report.extraHighlight?.photoUrl, "https://example.test/sommi.png");
  assert.doesNotMatch(report.extraHighlight?.text ?? "", /bezahlt|erlassen/i);
});

test("money Elfer fine never becomes a fictional Kiste", () => {
  const report = buildWeeklyReport({
    current: [row(1, 1, 9)], previous: [row(1, 1, 9)],
    cutoffDate: "2026-10-21", completedTrainings: 0,
    penaltyMoment: { kind: "missed_penalty", playerId: 1, playerName: "Alex",
      value: "1 €", isKiste: false },
  });
  assert.equal(report.extraHighlight?.kind, "missed_penalty");
  assert.match(report.extraHighlight?.detail ?? "", /1 €/);
  assert.doesNotMatch(report.extraHighlight?.detail ?? "", /Kischde/);
});

test("ordinary penalties stay out of weekly specials", () => {
  assert.equal(choosePenaltySpecial([
    { id: 1, player_id: 1, reason: "Zugesagt, nach Anmeldeschluss abgesagt",
      type: "money", value: "2 €" },
    { id: 2, player_id: 2, reason: "Zu spät", type: "money", value: "0,50 €" },
  ]), null);
});

test("weekly recap is enabled only for the test club and SKV Rutesheim AH", () => {
  assert.equal(isWeeklyReportPilotClub("12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60"), true);
  assert.equal(isWeeklyReportPilotClub("108590d9-0877-4787-90a5-4679615b3b76"), true);
  assert.equal(isWeeklyReportPilotClub("b8d4b692-baf1-4263-8fdd-64df424114a7"), false);
  assert.equal(isWeeklyReportPilotClub(null), false);
  assert.equal(isWeeklyReportPilotClub(""), false);
});
