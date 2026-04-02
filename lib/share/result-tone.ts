export function getResultHighlight(
  goalsA: number,
  goalsB: number,
  wasUnderdog = false
) {
  const diff = Math.abs(goalsA - goalsB);

  if (wasUnderdog) return "🔥 Underdog Win";
  if (diff >= 3) return "💪 Dominanter Sieg";
  if (diff === 1) return "😮 Knappe Kiste";
  return "⚡ Klar entschieden";
}

export function getResultStory(
  goalsA: number,
  goalsB: number,
  wasUnderdog = false
) {
  const diff = Math.abs(goalsA - goalsB);

  if (wasUnderdog) return "Überraschungssieg gegen das stärkere Team.";
  if (diff >= 3) return "Klare Sache heute.";
  if (diff === 1) return "Bis zum Schluss spannend.";
  return "Verdient durchgesetzt.";
}