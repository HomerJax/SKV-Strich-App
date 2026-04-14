import { Palette, ResultShareLayout } from "./result-share.types";

export function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;

  const value = Number.parseInt(expanded, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function normalizeHex(input: string) {
  const clean = input.trim().replace("#", "");

  if (clean.length === 3) {
    return `#${clean
      .split("")
      .map((char) => char + char)
      .join("")}`.toUpperCase();
  }

  if (clean.length === 6) {
    return `#${clean}`.toUpperCase();
  }

  return "#3B82F6";
}

export function normalizePrimaryColor(input?: string | null) {
  const value = input?.trim().toLowerCase();

  if (!value) return "#3B82F6";
  if (value === "black") return "#020617";
  if (value === "blue") return "#2563EB";
  if (value === "red") return "#DC2626";
  if (value === "green") return "#16A34A";
  if (value.startsWith("#")) return normalizeHex(value);

  return "#3B82F6";
}

export function getLuminance(hex: string) {
  const clean = normalizeHex(hex).replace("#", "");
  const value = Number.parseInt(clean, 16);

  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;

  const convert = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  const rr = convert(r);
  const gg = convert(g);
  const bb = convert(b);

  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
}

export function buildPalette(
  rawPrimary: string | null | undefined,
  layout: ResultShareLayout
): Palette {
  const base = normalizePrimaryColor(rawPrimary);
  const isDarkBase = getLuminance(base) < 0.18;
  const darkLayout = layout !== "poster";

  const accent =
    darkLayout && isDarkBase
      ? "#E2E8F0"
      : layout === "poster" && isDarkBase
        ? "#334155"
        : base;

  if (layout === "poster") {
    return {
      accent,
      accentSoft: hexToRgba(accent, 0.12),
      accentGlow: hexToRgba(accent, 0.18),
      loser: "#475569",
      textPrimary: "#0F172A",
      textSecondary: "#64748B",
      badgeBg: "#FFFFFF",
      panelBg: "rgba(255,255,255,0.72)",
    };
  }

  return {
    accent,
    accentSoft: hexToRgba(accent, 0.16),
    accentGlow: hexToRgba(accent, 0.34),
    loser: "rgba(255,255,255,0.72)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.74)",
    badgeBg: "rgba(255,255,255,0.08)",
    panelBg: "rgba(7,18,47,0.42)",
  };
}