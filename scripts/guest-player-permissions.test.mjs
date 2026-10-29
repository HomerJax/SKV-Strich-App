import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canManageGuestPlayer, canManageClub, maskGuestStrengthForClient } from "../lib/auth/access.ts";

test("guest creation is limited to admin, power user, and assigned training leader", () => {
  assert.equal(canManageGuestPlayer({ role: "admin" }), true);
  assert.equal(canManageGuestPlayer({ role: "member", isPowerUser: true }), true);
  assert.equal(canManageGuestPlayer({ role: "member", canLeadTraining: true }), true);
  assert.equal(canManageGuestPlayer({ role: "member" }), false);
  assert.equal(canManageGuestPlayer({ role: "player" }), false);
  assert.equal(canManageGuestPlayer({ role: null }), false);
});

test("training leaders receive a new guest without individual strength", () => {
  const player = { id: 17, name: "Gast", strength: 5, is_guest: true };
  const redacted = maskGuestStrengthForClient(player, canManageClub({ role: "member" }));
  assert.equal(redacted.strength, null);
  assert.equal(redacted.id, 17);
  assert.equal(redacted.is_guest, true);
  assert.equal(player.strength, 5, "the server-side source remains unchanged");
  assert.equal(maskGuestStrengthForClient(player, canManageClub({ role: "admin" })).strength, 5);
  assert.equal(maskGuestStrengthForClient(player, canManageClub({ role: "member", isPowerUser: true })).strength, 5);
});

test("guest endpoint uses the already authorized server-side client", () => {
  const route = readFileSync(new URL("../app/api/sessions/[id]/route.ts", import.meta.url), "utf8");
  assert.match(route, /if \(intent === "add_guest_player"\) \{[\s\S]*?canManageClub\([\s\S]*?return handleAddGuestPlayer\(\{\s*adminSupabase,/);
  const handler = readFileSync(new URL("../lib/session-detail/actions/add-guest-player.ts", import.meta.url), "utf8");
  assert.match(handler, /\.insert\(payload\)[\s\S]*?\.select\([\s\S]*?strength/);
  assert.match(handler, /player: maskGuestStrengthForClient/);
});
