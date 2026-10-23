/**
 * Native-only return-to-home policy. Browser navigation remains unchanged.
 * No native binary update is required: both mobile apps load the live web UI.
 */
export const RETURN_HOME_AFTER_MS = 15 * 60 * 1000;
export const BACKGROUND_AT_KEY = "strikr:native-background-at";
export const PUSH_INTENT_AT_KEY = "strikr:native-push-intent-at";
export const ACTIVE_TOURNAMENT_KEY = "strikr:active-tournament";
const MAX_TIMER_AGE_MS = 18 * 60 * 60 * 1000;
const MAX_TOURNAMENT_AGE_MS = 12 * 60 * 60 * 1000;

function sessionIdFromKey(key: string) {
  const id = Number(key.substring("strikr:game-timer:".length));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function getLiveSessionPath(storage: Storage, now = Date.now()): string | null {
  const active: Array<{ id: number; at: number }> = [];
  try {
    const marker = storage.getItem(ACTIVE_TOURNAMENT_KEY);
    if (marker) {
      try {
        const tournament = JSON.parse(marker) as { sessionId?: number; savedAt?: number };
        if (
          Number.isSafeInteger(tournament.sessionId) && (tournament.sessionId ?? 0) > 0 &&
          typeof tournament.savedAt === "number" &&
          now >= tournament.savedAt && now - tournament.savedAt < MAX_TOURNAMENT_AGE_MS
        ) {
          active.push({ id: tournament.sessionId!, at: tournament.savedAt });
        }
      } catch { /* ignore an invalid marker */ }
    }

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith("strikr:game-timer:")) continue;
      const id = sessionIdFromKey(key);
      if (id === null) continue;
      try {
        const timer = JSON.parse(storage.getItem(key) ?? "null") as {
          phase?: string; savedAt?: number; targetAt?: number | null;
        } | null;
        if (!timer || typeof timer.savedAt !== "number") continue;
        const age = now - timer.savedAt;
        if (age < 0 || age > MAX_TIMER_AGE_MS) continue;
        const running = timer.phase === "running" &&
          typeof timer.targetAt === "number" &&
          timer.targetAt > now - 10 * 60 * 1000;
        const paused = timer.phase === "halftime" && age < 3 * 60 * 60 * 1000;
        if (running || paused) active.push({ id, at: timer.savedAt });
      } catch { /* individual invalid timers must not block valid ones */ }
    }
  } catch { /* optional storage */ }
  active.sort((a, b) => b.at - a.at);
  return active[0] ? `/sessions/${active[0].id}` : null;
}

export function isSensitiveNativePath(path: string) {
  return [
    "/login", "/signup", "/auth", "/join", "/forgot-password",
    "/reset-password", "/select-club", "/checkout", "/billing",
    "/onboarding", "/sessions/new", "/mannschaftskasse/gluecksrad",
  ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function markNativePushIntent() {
  try {
    window.sessionStorage.setItem(PUSH_INTENT_AT_KEY, String(Date.now()));
  } catch { /* optional storage */ }
}

export function hasRecentNativePushIntent(now = Date.now()) {
  try {
    const at = Number(window.sessionStorage.getItem(PUSH_INTENT_AT_KEY));
    return at > 0 && now >= at && now - at < 10_000;
  } catch {
    return false;
  }
}
