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

test("Power-User simulator renders the actual admin setup rather than separate example fields", () => {
  const qa = read("app/power-user/onboarding-simulator/FirstRunQA.tsx");
  const route = read("app/power-user/onboarding-simulator/wizard/page.tsx");
  const realSetup = read("app/admin/setup/page.tsx");
  const shell = read("components/RouteAwareAppShell.tsx");
  assert.match(qa, /setStage\("club-setup"\)/);
  assert.match(qa, /href="\/power-user\/onboarding-simulator\/wizard"/);
  assert.match(qa, /Echte Einrichtung simulieren/);
  assert.match(route, /await requirePowerUser\(\)/);
  assert.match(route, /import AdminSetupPage from "@\/app\/admin\/setup\/page"/);
  assert.match(route, /<AdminSetupPage searchParams=\{Promise.resolve\(\{ qa: "1" \}\)\}/);
  assert.doesNotMatch(route, /const definitions|<SetupWizard|Beispielfelder/);
  const ids = [...realSetup.matchAll(/\{id:"([^"]+)",title:/g)].map(match => match[1]);
  assert.deepEqual(ids, ["club", "season", "training", "rsvp", "teams", "categories", "games", "pro"]);
  assert.match(realSetup, /preview=\{qaMode\}/);
  assert.match(realSetup, /qaMode\?null:progress.data/);
  assert.match(realSetup, /<ClubSetupClubStep/);
  assert.match(realSetup, /qaInWizard=\{qaMode\}/);
  assert.ok(shell.includes('pathname.startsWith("/power-user/onboarding-simulator/")'));
});

test("simulator blocks all form writes and shares exact real setup panels", () => {
  const wizard = read("components/admin/SetupWizard.tsx");
  const club = read("components/club-setup/ClubSetupClubStep.tsx");
  assert.doesNotMatch(wizard, /SetupWizardPreview/);
  assert.match(wizard, /inlinePanels\[current.id\]/);
  assert.match(wizard, /onSubmitCapture=\{preview\?/);
  assert.match(wizard, /event.preventDefault\(\)/);
  assert.match(wizard, /event.stopPropagation\(\)/);
  assert.match(wizard, /if\(preview\)return;/);
  assert.match(club, /qaPreview \|\| qaMode \|\| qaInWizard \? undefined :/);
  assert.match(wizard, /Simulation erfolgreich abgeschlossen/);
  assert.match(wizard, /Es wurden keine Vereinsdaten gespeichert/);
});

test("simulator retains read-only previews and clearly separates real setup from home model", () => {
  const qa = read("app/power-user/onboarding-simulator/FirstRunQA.tsx");
  const home = read("app/power-user/onboarding-simulator/AdminFirstHomePreview.tsx");
  const sandbox = read("components/club-setup/ClubSetupQASandbox.tsx");
  assert.match(qa, /<WaitingForInviteContent qaPreview/);
  assert.match(qa, /<AdminFirstHomePreview/);
  assert.match(qa, /Echte Einrichtung simulieren/);
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

test("onboarding season has a default continue path and only optional PRO editing", () => {
  const season = read("components/admin/settings/SeasonSettingsCard.tsx");
  const wizard = read("components/admin/SetupWizard.tsx");
  const setup = read("app/admin/setup/page.tsx");
  assert.match(wizard, /Standardsaison übernehmen und weiter/);
  assert.match(season, /Saison-Einstellungen ändern \(PRO\)/);
  assert.match(season, /name="intent" value="update"/);
  assert.match(season, /qaPreview \? \[/);
  assert.match(season, /min-w-0 max-w-full/);
  assert.match(season, /if \(variant === "onboarding"\)/);
  assert.match(setup, /variant="onboarding" qaPreview=\{qaMode\}/);
});

test("category onboarding explains its effects, uses real forms and offers explicit continue", () => {
  const categories = read("components/admin/settings/CategorySettingsSection.tsx");
  const wizard = read("components/admin/SetupWizard.tsx");
  const setup = read("app/admin/setup/page.tsx");
  assert.match(categories, /Spieler sinnvoll in Gruppen einteilen/);
  assert.match(categories, /Beispiel: Acht Spieler, zwei Teams/);
  assert.match(categories, /2 Erfahrene/);
  assert.match(categories, /2 Einsteiger/);
  assert.match(categories, /Stärkere Gruppe/);
  assert.match(categories, /Dieser Schritt ist optional/);
  assert.match(categories, /action=\{addCategoryAction\}/);
  assert.match(categories, /action=\{updateCategoryAction\}/);
  assert.match(wizard, /Weiter zum Spielmodus/);
  assert.match(setup, /categories=\{qaMode\?\[\]:\(categories.data\?\?\[\]\)\}/);
});

test("weekly training uses selected season and Thursday 19:00 as editable preset", () => {
  const helper = read("lib/onboarding/training-template.ts");
  const form = read("components/admin/TrainingSeriesOnboardingForm.tsx");
  const setup = read("app/admin/setup/page.tsx");
  const seasons = read("components/admin/settings/SeasonSettingsCard.tsx");
  assert.match(helper, /getWeeklyTrainingTemplate\(season: OnboardingSeasonRange, weekday = 4\)/);
  assert.match(helper, /weekday - base.getUTCDay\(\) \+ 7/);
  assert.match(helper, /51 \* 7/);
  assert.match(helper, /startTime: "19:00"/);
  assert.match(form, /1 × pro Woche/);
  assert.match(form, /Erstes Training/);
  assert.match(form, /Trainingsserie anlegen und weiter/);
  assert.match(form, /value=\{weekday\}/);
  assert.match(form, /value=\{startDate\}/);
  assert.match(form, /min=\{activeSeasonStart\}/);
  assert.match(setup, /selectOnboardingSeason\(seasons.data\?\?\[\]\)/);
  assert.match(setup, /qaMode\?\{name:"strikr Standardsaison",\.\.\.getQaSeasonRange\(\)\}/);
  assert.match(setup, /<TrainingSeriesOnboardingForm/);
  assert.match(setup, /step=rsvp&saved=1/);
  assert.match(setup, /end_date.is.null,end_date.gte/);
  assert.match(seasons, /getQaSeasonRange\(\)/);
  assert.doesNotMatch(setup, /training:<form action=\{addWizardSeries\}/);
});

test("simulated edited season dates flow into the same training defaults without a write", () => {
  const wizard = read("components/admin/SetupWizard.tsx");
  const training = read("components/admin/TrainingSeriesOnboardingForm.tsx");
  const context = read("components/admin/OnboardingQaSeasonContext.tsx");
  assert.match(wizard, /new FormData\(form\)/);
  assert.match(wizard, /setQaSeason\(\{name:/);
  assert.match(wizard, /OnboardingQaSeasonContext.Provider/);
  assert.match(training, /useContext\(OnboardingQaSeasonContext\)/);
  assert.match(training, /qaSeason\?\.start_date \?\? seasonStart/);
  assert.match(training, /qaSeason \? qaSeason.end_date : seasonEnd/);
  assert.match(context, /createContext/);
});
