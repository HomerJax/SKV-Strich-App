import { Palette, ResultShareLayout } from "./result-share.types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();

  if (normalized.length !== 6) {
    return { r: 34, g: 197, b: 94 };
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return { r: 34, g: 197, b: 94 };
  }

  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (value: number) =>
    clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mix(hexA: string, hexB: string, amount: number) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const ratio = clamp(amount, 0, 1);

  return rgbToHex(
    a.r + (b.r - a.r) * ratio,
    a.g + (b.g - a.g) * ratio,
    a.b + (b.b - a.b) * ratio
  );
}

function normalizePrimaryColor(rawPrimary?: string | null) {
  if (!rawPrimary) {
    return "#22C55E";
  }

  const trimmed = rawPrimary.trim();

  if (!trimmed) {
    return "#22C55E";
  }

  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const valid = /^#[0-9A-Fa-f]{6}$/.test(withHash);

  return valid ? withHash.toUpperCase() : "#22C55E";
}

function getLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);

  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  const sr = channel(r);
  const sg = channel(g);
  const sb = channel(b);

  return 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
}

export function buildPalette(
  rawPrimary?: string | null,
  layout?: ResultShareLayout
): Palette {
  const base = normalizePrimaryColor(rawPrimary);
  const isDarkBase = getLuminance(base) < 0.18;

  const darkLayout =
    layout === "sticker" || layout === "floodlight" || !layout;

  const accent =
    darkLayout && isDarkBase ? mix(base, "#FFFFFF", 0.18) : base;

  const accentSoft = darkLayout
    ? mix(accent, "#FFFFFF", 0.78)
    : mix(accent, "#FFFFFF", 0.86);

  const accentGlow = darkLayout
    ? mix(accent, "#FFFFFF", 0.5)
    : mix(accent, "#FFFFFF", 0.65);

  const loser = darkLayout
    ? "rgba(255,255,255,0.56)"
    : "rgba(15,23,42,0.36)";

  const textPrimary = darkLayout ? "#FFFFFF" : "#0F172A";
  const textSecondary = darkLayout
    ? "rgba(255,255,255,0.72)"
    : "rgba(15,23,42,0.68)";

  const badgeBg = darkLayout
    ? "rgba(255,255,255,0.08)"
    : "rgba(255,255,255,0.78)";

  const panelBg = darkLayout
    ? "rgba(3,8,16,0.78)"
    : "rgba(255,255,255,0.72)";

  return {
    accent,
    accentSoft,
    accentGlow,
    loser,
    textPrimary,
    textSecondary,
    badgeBg,
    panelBg,
  };
}