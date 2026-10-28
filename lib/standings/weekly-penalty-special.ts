/**
 * Only deliberately recorded, recognisable penalty reasons become Kabinenmomente.
 * A penalty rule configured in the club is not itself proof that an event happened.
 */
export type RecordedPenalty = {
  id: number;
  player_id: number;
  reason: string | null;
  type: string | null;
  value: string | null;
  source_key?: string | null;
};

export type RecognizedPenalty = RecordedPenalty & {
  specialKind: "missed_penalty" | "birthday";
};

export function recognizePenaltySpecial(penalty: RecordedPenalty): RecognizedPenalty | null {
  if (penalty.source_key?.startsWith("test:") || !penalty.reason) return null;
  const reason = penalty.reason.trim().toLocaleLowerCase("de-DE");
  // Do not interpret the mere word "Elfmeter" as a missed shot.
  const penaltyKick = /(?:elfmeter|elfer|strafstoß|11[ -]?meter)/u.test(reason);
  const failure = /(?:verschoss|verschieß|verschies|vergeb|daneben|vorbei|versemmel|verballer)/u.test(reason);
  if (penaltyKick && failure) return { ...penalty, specialKind: "missed_penalty" };
  if (/^(?:🎂\s*)?geburtstag(?:\s*[-–]\s*kiste)?$/u.test(reason)) {
    return { ...penalty, specialKind: "birthday" };
  }
  return null;
}

/** Penalty-kick moments outrank birthdays, newest within the same category. */
export function choosePenaltySpecial<T extends RecordedPenalty>(
  recent: T[],
): (T & RecognizedPenalty) | null {
  const recognized = recent.map(recognizePenaltySpecial).filter(
    (p): p is RecognizedPenalty => !!p,
  );
  return (recognized.find((p) => p.specialKind === "missed_penalty")
    ?? recognized.find((p) => p.specialKind === "birthday")) as (T & RecognizedPenalty) | undefined ?? null;
}

export function isKistePenalty(p: Pick<RecordedPenalty, "type" | "value">): boolean {
  return p.type === "beer" && /\bkiste\b/iu.test(p.value ?? "");
}
