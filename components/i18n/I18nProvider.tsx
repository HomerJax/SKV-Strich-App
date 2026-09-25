"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { AppLocale } from "@/lib/i18n/config";
import {
  translate,
  type MessageKey,
} from "@/lib/i18n/messages";

type I18nContextValue = {
  locale: AppLocale;
  t: (
    key: MessageKey,
    params?: Record<string, string | number | null | undefined>,
  ) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export default function I18nProvider({
  locale,
  children,
}: {
  locale: AppLocale;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return context;
}
