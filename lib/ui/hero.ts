export const COLOR_MAP: Record<string, string> = {
  black: "#020617",
  blue: "#1d4ed8",
  red: "#dc2626",
  green: "#16a34a",
};

export function getClubHeroStyles(primaryColorKey?: string | null) {
  const selectedColor = primaryColorKey ?? "black";
  const primaryColor = COLOR_MAP[selectedColor] ?? COLOR_MAP.black;

  const heroGradient =
    selectedColor === "black"
      ? "linear-gradient(135deg, #020617 0%, #111827 55%, #374151 100%)"
      : `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 78%)`;

  return {
    selectedColor,
    primaryColor,
    heroGradient,
    borderColor: `${primaryColor}22`,
  };
}