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

test("admin first-run opens the real Power-User-gated club setup in QA mode", () => {
  const qa = read("app/power-user/onboarding-simulator/FirstRunQA.tsx");
  const page = read("app/club-setup/page.tsx");
  const sandbox = read("components/club-setup/ClubSetupQASandbox.tsx");
  const form = read("components/club-setup/ClubSetupClubStep.tsx");
  const shell = read("components/RouteAwareAppShell.tsx");
  assert.match(qa, /setStage\("club-setup"\)/);
  assert.match(qa, /\/club-setup\?qa=1&created=1&step=club/);
  assert.match(page, /if \(qa\) await requirePowerUser\(\)/);
  assert.match(page, /const auth = qa \? null : await getAuthContext\(\)/);
  assert.match(page, /<ClubSetupQASandbox/);
  assert.match(page, /<ClubSetupClubStep/);
  assert.match(form, /action=\{qaPreview \? undefined : "\/api\/admin\/club"\}/);
  assert.match(sandbox, /event\.preventDefault\(\)/);
  assert.match(sandbox, /event\.stopPropagation\(\)/);
  assert.match(sandbox, /onSubmitCapture=\{onSubmit\}/);
  assert.match(shell, /pathname === "\/power-user\/onboarding-simulator"/);
  assert.doesNotMatch(sandbox, /createAdminClient|\.from\(|signUp\(|\.rpc\(|fetch\(/);
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
