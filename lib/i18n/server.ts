import { cache } from "react";
import { headers } from "next/headers";
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
  const browserLocale = localeFromAcceptLanguage(
    headerStore.get("accept-language"),
  );

  let clubLocaleMode: ClubLocaleMode = "auto";

  try {
    const ctx = await getAuthContext();

    if (ctx.activeClubId) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("club_settings")
        .select("default_locale")
        .eq("club_id", ctx.activeClubId)
        .maybeSingle<{ default_locale: string | null }>();

      clubLocaleMode = normalizeClubLocaleMode(data?.default_locale);

      if (clubLocaleMode !== "auto") {
        return {
          locale: clubLocaleMode,
          clubLocaleMode,
        };
      }
    }
  } catch {
    // Public/unauthenticated routes should still resolve from browser language.
  }

  return {
    locale: browserLocale,
    clubLocaleMode,
  };
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
