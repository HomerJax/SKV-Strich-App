export const RSVP_REASON_MIN_LETTERS = 4;

export function isMeaningfulRsvpReason(value: string) {
  const letters = value.trim().match(/[A-Za-zÄÖÜäöüß]/g) ?? [];

  if (letters.length < RSVP_REASON_MIN_LETTERS) {
    return false;
  }

  const uniqueLetters = new Set(
    letters.map((letter) => letter.toLocaleLowerCase("de-DE")),
  );

  return uniqueLetters.size >= 2;
}

export function getRequiredRsvpReasonError(value: string) {
  return isMeaningfulRsvpReason(value)
    ? null
    : "Bitte gib einen kurzen echten Grund an – mindestens 4 Buchstaben, nicht nur Punkte oder einzelne Zeichen.";
}
