import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import {
  localeFromAcceptLanguage,
  normalizeClubLocaleMode,
  type AppLocale,
  type ClubLocaleMode,
} from "./config";
import { translate, type MessageKey } from "./messages";

type LocaleResult = {
  locale: AppLocale;
  clubLocaleMode: ClubLocaleMode;
};

export const getLocaleResult = cache(async (): Promise<LocaleResult> => {
  const headerStore = await headers();
  const publicSeoLocale = headerStore.get("x-strikr-public-locale");
  if (publicSeoLocale === "de" || publicSeoLocale === "en") {
    return { locale: publicSeoLocale, clubLocaleMode: "auto" };
  }

  const cookieStore = await cookies();
  const manualLocale = cookieStore.get("strikr_locale")?.value;
  if (manualLocale === "de" || manualLocale === "en") {
    return { locale: manualLocale, clubLocaleMode: "auto" };
  }

  const browserLocale = localeFromAcceptLanguage(
    headerStore.get("accept-language"),
  );

  // Locale is presentation-only. A stalled auth/database request must not
  // prevent the root layout (including /login) from rendering indefinitely.
  const fallback: LocaleResult = {
    locale: browserLocale,
    clubLocaleMode: "auto",
  };

  async function resolveClubLocale(): Promise<LocaleResult> {
    try {
      const ctx = await getAuthContext();
      if (!ctx.activeClubId) return fallback;

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("club_settings")
        .select("default_locale")
        .eq("club_id", ctx.activeClubId)
        .maybeSingle<{ default_locale: string | null }>();

      if (error) return fallback;

      const clubLocaleMode = normalizeClubLocaleMode(data?.default_locale);
      return clubLocaleMode === "auto"
        ? fallback
        : { locale: clubLocaleMode, clubLocaleMode };
    } catch {
      return fallback;
    }
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      resolveClubLocale(),
      new Promise<LocaleResult>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), 2000);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
});

export async function getServerI18n() {
  const { locale, clubLocaleMode } = await getLocaleResult();

  return {
    locale,
    clubLocaleMode,
    t: (
      key: MessageKey,
      params?: Record<string, string | number | null | undefined>,
    ) => translate(locale, key, params),
  };
}
