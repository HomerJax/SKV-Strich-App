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
  assert.match(onboarding, /event\.preventDefault\(\)/);
});

test("scenario coverage and reset, no production data writes from the QA surface", () => {
  const qa = read("app/power-user/onboarding-simulator/FirstRunQA.tsx");
  for (const scenario of ["admin", "invited", "waiting", "second-club"]) assert.match(qa, new RegExp(scenario));
  assert.match(qa, /setRunId\(\(id\) => id \+ 1\)/);
  assert.doesNotMatch(qa, /createAdminClient|\.from\(|signUp\(|fetch\(|\.rpc\(/);
});

test("full admin first-run continues safely through club settings and first home", () => {
  const qa = read("app/power-user/onboarding-simulator/FirstRunQA.tsx");
  const setup = read("app/power-user/onboarding-simulator/AdminSetupPreview.tsx");
  const home = read("app/power-user/onboarding-simulator/AdminFirstHomePreview.tsx");
  const form = read("components/club-setup/ClubSetupClubStep.tsx");
  const shell = read("components/RouteAwareAppShell.tsx");
  assert.match(qa, /<AdminSetupPreview/);
  assert.match(qa, /<AdminFirstHomePreview/);
  assert.match(qa, /setStage\("club-setup"\)/);
  assert.match(setup, /<ClubSetupClubStep/);
  assert.match(setup, /qaPreview=\{\{ onComplete:/);
  assert.match(form, /action=\{qaPreview \? undefined : "\/api\/admin\/club"\}/);
  assert.match(form, /event\.preventDefault\(\)/);
  assert.match(home, /QA-Ablaufmodell/);
  assert.match(shell, /pathname === "\/power-user\/onboarding-simulator"/);
  for (const component of [qa, setup, home]) {
    assert.doesNotMatch(component, /createAdminClient|\.from\(|signUp\(|\.rpc\(/);
  }
});
