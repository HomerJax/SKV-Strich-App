import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = source("supabase/migrations/20261109211000_completed_training_stats.sql");

test("completion state is persisted and stats view is RLS-safe", () => {
  assert.match(migration, /add column if not exists completed_at timestamptz/);
  assert.match(migration, /create or replace view public\.stats_session_players[\s\S]*?security_invoker\s*=\s*true/);
  assert.match(migration, /where s\.type = 'training'[\s\S]*?s\.completed_at is not null/);
  assert.match(migration, /revoke all on public\.stats_session_players from public, anon/);
  assert.match(migration, /create or replace view public\.player_mvp_stats/);
  assert.match(migration, /from public\.stats_session_players sp/);
});

test("backfill only from recorded results or verified tournament, NEVER from RSVP", () => {
  assert.match(migration, /update public\.sessions s/);
  assert.match(migration, /exists\s*\([\s\S]*?from public\.results r/);
  assert.match(migration, /s\.tournament_completed_at is not null/);
  assert.doesNotMatch(migration, /update public\.session_players|delete from public\.session_rsvps/);
});

test("all attendance-facing stats exclude unconfirmed sessions", () => {
  for (const path of [
    "app/api/standings/route.ts",
    "app/stats/page.tsx",
    "app/api/home/quick-stats/route.ts",
    "lib/badges/progress.ts",
    "lib/badges/engine.ts",
    "app/badges/BadgesPageV3.tsx",
  ]) {
    const s = source(path);
    assert.match(s, /\.from\("stats_session_players"\)/, path);
    assert.doesNotMatch(s, /\.from\("session_players"\)/, path);
  }
  for (const path of [
    "app/api/standings/route.ts",
    "app/api/home/quick-stats/route.ts",
    "lib/badges/progress.ts",
    "lib/badges/engine.ts",
    "app/badges/BadgesPageV3.tsx",
    "app/api/stats/extended/route.ts",
  ]) {
    assert.match(source(path), /\.not\("completed_at", "is", null\)/, path);
  }
});

test("completion is explicit, leader-authorized, and never created by RSVP", () => {
  const route = source("app/api/sessions/[id]/route.ts");
  assert.match(route, /if \(intent === "complete_training"\)/);
  assert.match(route, /if \(intent === "complete_training_no_score"\)/);
  assert.match(route, /canCompleteTraining/);
  assert.match(route, /completed_at: new Date\(\)\.toISOString\(\)/);
  assert.match(route, /\.from\("session_players"\)[\s\S]*?count: "exact", head: true/);
  const ui = source("app/sessions/[id]/ConfirmPlayedTrainingButton.tsx");
  assert.match(ui, /window\.confirm/);
  assert.match(ui, /intent", "complete_training_no_score"/);
  const page = source("app/sessions/[id]/page.tsx");
  assert.match(page, /!session\.completed_at && !hasResult/);
  assert.match(page, /isPowerUser \|\| isAdminRole\(membership\.role\) \|\| canLeadTraining/);
});

test("pilot wizard does not claim success when server completion fails", () => {
  const wizard = source("app/sessions/[id]/SessionDetailClientPilot.tsx");
  assert.match(wizard, /completionTrackingRecorded\.current = response\.ok/);
  assert.match(wizard, /if \(!recorded\)/);
  assert.match(wizard, /Der Trainingsabschluss wurde nicht gespeichert/);
});

test("tournament finish/reopen synchronizes statistics completion", () => {
  const tournament = source("app/api/sessions/[id]/tournament/route.ts");
  assert.match(tournament, /tournament_completed_at: new Date\(\)\.toISOString\(\),[\s\S]*?completed_at: new Date\(\)\.toISOString\(\)/);
  assert.match(tournament, /tournament_completed_at: null,[\s\S]*?completed_at: null/);
});
