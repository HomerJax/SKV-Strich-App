import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("internal first-run QA is strictly Power-User gated", () => {
  const page = read("app/power-user/onboarding-simulator/page.tsx");
  assert.match(page, /await requirePowerUser\(\)/);
  assert.match(page, /<FirstRunQA\s*\/>/);
});

test("first-run previews use the real product forms without a live submit", () => {
  const qa = read("app/power-user/onboarding-simulator/FirstRunQA.tsx");
  const signup = read("app/signup/SignupForm.tsx");
  const onboarding = read("app/onboarding/OnboardingForm.tsx");
  assert.match(qa, /import SignupForm from "@\/app\/signup\/SignupForm"/);
  assert.match(qa, /import OnboardingForm from "@\/app\/onboarding\/OnboardingForm"/);
  assert.match(qa, /qaPreview=\{\{ onComplete:/);
  assert.match(signup, /action=\{qaPreview \? undefined : formAction\}/);
  assert.match(onboarding, /action=\{qaPreview \? undefined : formAction\}/);
  assert.match(signup, /event\.preventDefault\(\)/);
  assert.match(signup, /onClick=\{qaPreview\.onComplete\}/);
  assert.match(signup, /Registrierung simulieren/);
  assert.match(signup, /type="button"/);
  assert.match(onboarding, /event\.preventDefault\(\)/);
});

test("scenario coverage and reset, no production data writes from the QA surface", () => {
  const qa = read("app/power-user/onboarding-simulator/FirstRunQA.tsx");
  for (const scenario of ["admin", "invited", "waiting", "second-club"]) assert.match(qa, new RegExp(scenario));
  assert.match(qa, /setRunId\(\(id\) => id \+ 1\)/);
  assert.doesNotMatch(qa, /createAdminClient|\.from\(|signUp\(|fetch\(|\.rpc\(/);
});

test("admin simulation opens the isolated Power-User wizard with the same areas as real setup", () => {
  const qa = read("app/power-user/onboarding-simulator/FirstRunQA.tsx");
  const wizard = read("app/power-user/onboarding-simulator/wizard/page.tsx");
  const realSetup = read("app/admin/setup/page.tsx");
  const shell = read("components/RouteAwareAppShell.tsx");
  assert.match(qa, /setStage\("club-setup"\)/);
  assert.match(qa, /href="\/power-user\/onboarding-simulator\/wizard"/);
  assert.match(wizard, /await requirePowerUser\(\)/);
  assert.match(wizard, /<SetupWizard[\s\S]*preview allowTest/);
  assert.match(shell, /pathname === "\/power-user\/onboarding-simulator"/);
  const ids = [...wizard.matchAll(/\["([^"]+)","[^"]+","[^"]+",(?:true|false)\]/g)]
    .map((match) => match[1]);
  const realIds = [...realSetup.matchAll(/\{id:"([^"]+)",title:/g)]
    .map((match) => match[1]);
  assert.equal(ids.length, 8);
  assert.deepEqual(ids, ["club", "season", "training", "rsvp", "teams", "categories", "games", "pro"]);
  const realOnboardingIds = realIds.filter((id) => ids.includes(id));
  assert.deepEqual(ids, realOnboardingIds);
  assert.match(wizard, /Alle 8 Onboarding-Schritte/);
  assert.doesNotMatch(wizard, /createAdminClient|\.from\(|signUp\(|\.rpc\(|fetch\(/);
});

test("preview wizard never saves progress or redirects into the live admin area", () => {
  const wizard = read("components/admin/SetupWizard.tsx");
  assert.match(wizard, /if\(preview\)return;/);
  assert.match(wizard, /href=\{preview \? "\/power-user\/onboarding-simulator" : "\/admin"\}/);
  assert.match(wizard, /Vorschau abgeschlossen!/);
  assert.match(wizard, /Simulation abschließen/);
  assert.match(wizard, /Simulation erfolgreich abgeschlossen/);
  assert.match(wizard, /Es wurden keine Vereinsdaten gespeichert/);
});

test("simulator retains read-only previews and clearly separates real setup from home model", () => {
  const qa = read("app/power-user/onboarding-simulator/FirstRunQA.tsx");
  const home = read("app/power-user/onboarding-simulator/AdminFirstHomePreview.tsx");
  const sandbox = read("components/club-setup/ClubSetupQASandbox.tsx");
  assert.match(qa, /<WaitingForInviteContent qaPreview/);
  assert.match(qa, /<AdminFirstHomePreview/);
  assert.match(qa, /Echtes Onboarding starten/);
  assert.match(home, /QA-Ablaufmodell/);
  assert.match(home, /Keine Aktionen hier speichern Daten/);
  assert.match(sandbox, /Keine Speicherung/);
  for (const component of [qa, home, sandbox]) {
    assert.doesNotMatch(component, /createAdminClient|\.from\(|signUp\(|\.rpc\(|fetch\(/);
  }
});

test("real waiting-for-invite screen is reused and QA buttons cannot navigate", () => {
  const page = read("app/waiting-for-invite/page.tsx");
  const waiting = read("components/onboarding/WaitingForInviteContent.tsx");
  assert.match(page, /getAuthContext\(\)/);
  assert.match(page, /<WaitingForInviteContent/);
  assert.match(waiting, /qaPreview \?/);
  assert.match(waiting, /type="button" disabled/);
});
