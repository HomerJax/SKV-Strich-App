export const SUPPORTED_LOCALES = ["de", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export type ClubLocaleMode = "auto" | AppLocale;

export const DEFAULT_LOCALE: AppLocale = "en";

export function normalizeLocale(value: string | null | undefined): AppLocale | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "de" || normalized.startsWith("de-")) return "de";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  return null;
}

export function normalizeClubLocaleMode(
  value: string | null | undefined,
): ClubLocaleMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "de" || normalized === "en") return normalized;
  return "auto";
}

export function localeFromAcceptLanguage(
  acceptLanguage: string | null | undefined,
): AppLocale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const candidates = acceptLanguage
    .split(",")
    .map((part) => part.trim().split(";")[0])
    .filter(Boolean);

  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
}
