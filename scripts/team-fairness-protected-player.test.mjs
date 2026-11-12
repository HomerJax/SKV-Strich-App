import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("generator protects only present player when attendance count is odd", () => {
  const source = read("lib/team-generator/server-balanced.ts");
  assert.match(source, /present\.length % 2 === 1/);
  assert.match(source, /present\.some\(p => p\.id === options\.protectedPlayerId\)/);
  assert.match(source, /A\.push\(protectedPlayer\)/);
  assert.match(source, /bestA\[i\]\.id === protectedId/);
  assert.match(source, /field\.filter\(p => p\.id !== protectedId\)/);
  assert.match(source, /keepers\.filter\(p => p\.id !== protectedId\)/);
});

test("all team generation uses the protected server implementation", () => {
  const client = read("app/sessions/[id]/useSessionDetail.ts");
  const api = read("app/api/sessions/[id]/balanced-teams/route.ts");
  assert.match(client, /fetch\("\/api\/sessions\/" \+ sessionId \+ "\/balanced-teams"/);
  assert.doesNotMatch(client, /compareTeamBalanceQuality/);
  assert.match(api, /protectedPlayerId: settings\?\.protected_player_id/);
});

test("legacy balance presets remain available only where assigned", () => {
  const roster = read("components/admin/RosterBulkEditor.tsx");
  assert.match(roster, /LEGACY_BALANCE_GROUP_OPTIONS\.filter\(\(group\) => assignedGroups\.has\(group\.value\)\)/);
  assert.match(roster, /Offensive Topspieler/);
  assert.match(roster, /Defensive Topspieler/);
});

test("admin announcement persists read receipts cross-device", () => {
  const modal = read("components/notifications/TeamFairnessAdminLaunchModal.tsx");
  const home = read("app/home/page.tsx");
  assert.match(modal, /admin_feature_announcement_receipts/);
  assert.match(home, /isAdmin && !isSupportView \? <TeamFairnessAdminLaunchModal/);
});
