"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function LanguagePreferenceCard() {
  const { locale, t } = useI18n();

  const setLocale = (value: "auto" | "de" | "en") => {
    if (value === "auto") {
      document.cookie = "strikr_locale=; path=/; max-age=0; samesite=lax";
    } else {
      document.cookie = `strikr_locale=${value}; path=/; max-age=31536000; samesite=lax`;
    }
    window.location.reload();
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
          <Languages className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-950">{t("settings.language.title")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("settings.language.hint")}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {(["auto", "de", "en"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setLocale(value)}
            className={`rounded-xl border px-3 py-2.5 text-sm font-black transition ${
              value !== "auto" && value === locale
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {value === "auto"
              ? t("languageSwitch.auto")
              : value === "de"
                ? t("settings.language.de")
                : t("settings.language.en")}
          </button>
        ))}
      </div>
    </section>
  );
}
