export type ResultShareColorwayKey =
  | "blue"
  | "pink"
  | "turquoise"
  | "menthol"
  | "purple"
  | "coral";

export type ResultShareColorway = {
  key: ResultShareColorwayKey;
  label: string;
  topBackground: string;
  titleColor: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  floodlightBg: string;
  floodlightGlow: string;
};

export const RESULT_SHARE_COLORWAYS: ResultShareColorway[] = [
  {
    key: "blue",
    label: "Neon Blue",
    topBackground: "linear-gradient(135deg, #002f80 0%, #2563eb 100%)",
    titleColor: "#FFFFFF",
    accent: "#60A5FA",
    accentSoft: "#93C5FD",
    accentGlow: "rgba(96,165,250,0.68)",
    floodlightBg:
      "radial-gradient(circle at 20% 12%, rgba(96,165,250,0.28), transparent 28%), linear-gradient(180deg,#020617 0%,#07111f 100%)",
    floodlightGlow: "rgba(96,165,250,0.42)",
  },
  {
    key: "pink",
    label: "Neon Pink",
    topBackground: "linear-gradient(135deg, #9d174d 0%, #ec4899 100%)",
    titleColor: "#FFFFFF",
    accent: "#F9A8D4",
    accentSoft: "#FBCFE8",
    accentGlow: "rgba(249,168,212,0.68)",
    floodlightBg:
      "radial-gradient(circle at 20% 12%, rgba(236,72,153,0.32), transparent 28%), linear-gradient(180deg,#120014 0%,#24071d 100%)",
    floodlightGlow: "rgba(236,72,153,0.42)",
  },
  {
    key: "turquoise",
    label: "Türkis",
    topBackground: "linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)",
    titleColor: "#FFFFFF",
    accent: "#67E8F9",
    accentSoft: "#A5F3FC",
    accentGlow: "rgba(103,232,249,0.68)",
    floodlightBg:
      "radial-gradient(circle at 20% 12%, rgba(6,182,212,0.32), transparent 28%), linear-gradient(180deg,#031316 0%,#062f35 100%)",
    floodlightGlow: "rgba(6,182,212,0.42)",
  },
  {
    key: "menthol",
    label: "Menthol",
    topBackground: "linear-gradient(135deg, #0f766e 0%, #5eead4 100%)",
    titleColor: "#FFFFFF",
    accent: "#5EEAD4",
    accentSoft: "#99F6E4",
    accentGlow: "rgba(94,234,212,0.68)",
    floodlightBg:
      "radial-gradient(circle at 20% 12%, rgba(94,234,212,0.28), transparent 28%), linear-gradient(180deg,#021412 0%,#073c36 100%)",
    floodlightGlow: "rgba(94,234,212,0.38)",
  },
  {
    key: "purple",
    label: "Electric Purple",
    topBackground: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)",
    titleColor: "#FFFFFF",
    accent: "#C4B5FD",
    accentSoft: "#DDD6FE",
    accentGlow: "rgba(196,181,253,0.68)",
    floodlightBg:
      "radial-gradient(circle at 20% 12%, rgba(124,58,237,0.32), transparent 28%), linear-gradient(180deg,#080313 0%,#1c0b38 100%)",
    floodlightGlow: "rgba(124,58,237,0.42)",
  },
  {
    key: "coral",
    label: "Coral",
    topBackground: "linear-gradient(135deg, #e11d48 0%, #fb7185 100%)",
    titleColor: "#FFFFFF",
    accent: "#FECACA",
    accentSoft: "#FFE4E6",
    accentGlow: "rgba(254,202,202,0.68)",
    floodlightBg:
      "radial-gradient(circle at 20% 12%, rgba(251,113,133,0.30), transparent 28%), linear-gradient(180deg,#160407 0%,#371018 100%)",
    floodlightGlow: "rgba(251,113,133,0.42)",
  },
];

export function pickResultShareColorway(sessionId?: number | null) {
  const safeSessionId =
    typeof sessionId === "number" && Number.isFinite(sessionId)
      ? Math.abs(sessionId)
      : 0;

  return RESULT_SHARE_COLORWAYS[safeSessionId % RESULT_SHARE_COLORWAYS.length];
}