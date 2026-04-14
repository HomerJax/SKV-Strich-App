import { ExtendedResultShareData, ShareCopy } from "./result-share.types";

export function buildCopy(data: ExtendedResultShareData): ShareCopy {
  const goalsA = Number(data.goalsA ?? 0);
  const goalsB = Number(data.goalsB ?? 0);
  const isDraw = goalsA === goalsB;
  const goalDiff = Math.abs(goalsA - goalsB);

  if (isDraw) {
    return {
      kicker: "Remis",
      headline: "Eng bis zum Schluss.",
      subline: "Kein Sieger, aber definitiv ein Abend mit Geschichte.",
    };
  }

  if (data.winnerWasShorthanded && data.upsetWin) {
    return {
      kicker: "Unterzahl",
      headline: "Einer weniger. Trotzdem gewonnen.",
      subline:
        "Nicht favorisiert, reduziert und am Ende trotzdem das Siegerfoto.",
    };
  }

  if (data.winnerWasShorthanded) {
    return {
      kicker: "Unterzahl",
      headline: "Dezimiert. Durchgezogen.",
      subline: "Weniger Leute, aber am Ende mehr Spiel auf dem Platz.",
    };
  }

  if (data.upsetWin) {
    return {
      kicker: "Upset",
      headline: "Auf dem Papier schwächer. Auf dem Platz besser.",
      subline: "Nicht als Favorit rein. Aber als Sieger raus.",
    };
  }

  if (data.dramaticFinish || goalDiff === 1) {
    return {
      kicker: "Late Push",
      headline: "Lange offen. Dann zugemacht.",
      subline: "Kein Spaziergang. Eher einer dieser Abende, die man gern teilt.",
    };
  }

  if (goalDiff >= 4) {
    return {
      kicker: "Klarer Abend",
      headline: "Heute ohne große Diskussion.",
      subline: "Von Anfang an da. Und am Ende ziemlich deutlich vorne.",
    };
  }

  return {
    kicker: "Session",
    headline: "Sauber gewonnen.",
    subline: "Flutlicht, Treffer, Siegerbild. Kann man so mitnehmen.",
  };
}