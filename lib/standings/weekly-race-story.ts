import type { WeeklyReport } from "./weekly-report";

/** A story headline is only shown when the week's training results support it. */
export function weeklyRaceStory(
  report: Pick<WeeklyReport, "hasBaseline" | "completedTrainings" | "topGapWins" | "topNames">,
): { headline: string; detail: string } | null {
  if (!report.hasBaseline || report.completedTrainings < 1 ||
      report.topGapWins === null || report.topNames.length < 2) return null;
  const [leader, runnerUp] = report.topNames;
  const gap = report.topGapWins;
  if (gap === 0) return {
    headline: "🔥 Kopf an Kopf an der Spitze!",
    detail: `${leader} und ${runnerUp} sind nach Siegen gleichauf.`,
  };
  if (gap === 1) return {
    headline: "🔥 Heißes Duell an der Spitze!",
    detail: `Nur 1 Sieg trennt ${leader} und ${runnerUp}.`,
  };
  if (gap === 2) return {
    headline: "⚡ Das Rennen bleibt spannend!",
    detail: `Zwischen ${leader} und ${runnerUp} liegen nur 2 Siege.`,
  };
  return {
    headline: "🏆 Die Spitze hat einen Favoriten!",
    detail: `${leader} führt mit ${gap} Siegen Vorsprung vor ${runnerUp}.`,
  };
}

/** Larger typography and portraits when fewer moments fill the story. */
export function weeklyStoryScale(cardCount: number) {
  return cardCount <= 3
    ? { headlinePx: 54, detailPx: 34, labelPx: 28, avatarPx: 140, cardPaddingPx: 44 }
    : { headlinePx: 43, detailPx: 29, labelPx: 24, avatarPx: 112, cardPaddingPx: 32 };
}
