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
