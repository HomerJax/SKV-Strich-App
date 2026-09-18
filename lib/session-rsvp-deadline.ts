export const DEFAULT_RSVP_DEADLINE_MINUTES = 60;
export const MAX_RSVP_DEADLINE_MINUTES = 7 * 24 * 60;

function parseSessionDate(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseSessionTime(time: string | null | undefined) {
  const match = String(time ?? "").match(/^([01]\d|2[0-3]):([0-5]\d)/);
  if (!match) return null;

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

function getBerlinParts(epochMs: number) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date(epochMs))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function berlinLocalDateTimeToEpochMs(
  date: string,
  time: string | null | undefined,
) {
  const dateParts = parseSessionDate(date);
  const timeParts = parseSessionTime(time);
  if (!dateParts || !timeParts) return null;

  const desiredUtcShape = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour,
    timeParts.minute,
    0,
  );

  // Determine the Europe/Berlin offset at the requested wall-clock time.
  let candidate = desiredUtcShape;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const berlin = getBerlinParts(candidate);
    const berlinAsUtcShape = Date.UTC(
      berlin.year,
      berlin.month - 1,
      berlin.day,
      berlin.hour,
      berlin.minute,
      berlin.second,
    );
    const offsetMs = berlinAsUtcShape - candidate;
    candidate = desiredUtcShape - offsetMs;
  }

  return candidate;
}

export function normalizeRsvpDeadlineMinutes(
  value: number | null | undefined,
  fallback = DEFAULT_RSVP_DEADLINE_MINUTES,
) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(MAX_RSVP_DEADLINE_MINUTES, Math.round(Number(value))));
}

export function getEffectiveRsvpDeadlineMinutes(
  sessionOverride: number | null | undefined,
  clubDefault: number | null | undefined,
) {
  if (Number.isFinite(sessionOverride)) {
    return normalizeRsvpDeadlineMinutes(sessionOverride);
  }

  return normalizeRsvpDeadlineMinutes(clubDefault);
}

export function getSessionDeadlineEpochMs(params: {
  date: string;
  startTime: string | null | undefined;
  sessionOverrideMinutes?: number | null;
  clubDefaultMinutes?: number | null;
}) {
  const startAt = berlinLocalDateTimeToEpochMs(params.date, params.startTime);
  if (startAt === null) return null;

  const minutesBefore = getEffectiveRsvpDeadlineMinutes(
    params.sessionOverrideMinutes,
    params.clubDefaultMinutes,
  );

  return startAt - minutesBefore * 60_000;
}

export function isSessionRsvpDeadlinePassed(
  deadlineEpochMs: number | null,
  nowEpochMs = Date.now(),
) {
  return deadlineEpochMs !== null && nowEpochMs >= deadlineEpochMs;
}

export function formatDeadlineForDisplay(deadlineEpochMs: number | null) {
  if (deadlineEpochMs === null) return null;

  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(deadlineEpochMs));
}
