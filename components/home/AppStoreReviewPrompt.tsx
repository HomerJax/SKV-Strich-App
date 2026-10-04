"use client";

import { Capacitor } from "@capacitor/core";
import Image from "next/image";
import { ExternalLink, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

const APP_STORE_REVIEW_URL =
  "https://apps.apple.com/de/app/id6789918875?action=write-review";

const STATUS_KEY = "strikr-app-store-review-status-2026-10";
const SNOOZE_UNTIL_KEY = "strikr-app-store-review-snooze-until-2026-10";
const HOME_VISITS_KEY = "strikr-app-store-review-home-visits-2026-10";
const WHATS_NEW_KEY = "strikr-whats-new-big-update-2026-09";
const WHATSAPP_PROMO_KEY = "strikr-inside-strikr-whatsapp-dismissed-2026-10";

const MIN_HOME_VISITS = 3;
const SNOOZE_DAYS = 7;

function setPermanentStatus(status: "reviewed" | "dismissed") {
  window.localStorage.setItem(STATUS_KEY, status);
}

export default function AppStoreReviewPrompt() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
      return;
    }

    const status = window.localStorage.getItem(STATUS_KEY);
    if (status === "reviewed" || status === "dismissed") {
      return;
    }

    const nextVisit =
      Math.max(0, Number(window.localStorage.getItem(HOME_VISITS_KEY) ?? "0")) + 1;
    window.localStorage.setItem(HOME_VISITS_KEY, String(nextVisit));

    if (nextVisit < MIN_HOME_VISITS) {
      return;
    }

    const whatsNewSeen = window.localStorage.getItem(WHATS_NEW_KEY) === "seen";
    const whatsappPromoDismissed =
      window.localStorage.getItem(WHATSAPP_PROMO_KEY) === "dismissed";

    if (!whatsNewSeen || !whatsappPromoDismissed) {
      return;
    }

    const snoozeUntil = Number(
      window.localStorage.getItem(SNOOZE_UNTIL_KEY) ?? "0",
    );

    if (Number.isFinite(snoozeUntil) && snoozeUntil > Date.now()) {
      return;
    }

    setOpen(true);
  }, []);

  function handleRateNow() {
    setPermanentStatus("reviewed");
    setOpen(false);
    window.open(APP_STORE_REVIEW_URL, "_blank", "noopener,noreferrer");
  }

  function handleLater() {
    const snoozeUntil = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(SNOOZE_UNTIL_KEY, String(snoozeUntil));
    setOpen(false);
  }

  function handleNever() {
    setPermanentStatus("dismissed");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-[28px] border border-white/70 bg-white p-5 text-center shadow-2xl sm:p-6">
        <button
          type="button"
          onClick={handleLater}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
          aria-label={t("home.reviewPromptClose")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-[22px] bg-slate-950 shadow-[0_14px_35px_rgba(15,23,42,0.18)]">
          <Image
            src="/icon-dark.png"
            alt="strikr"
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-amber-500">
          {t("home.reviewPromptEyebrow")}
        </div>

        <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950">
          {t("home.reviewPromptTitle")}
        </h2>

        <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-slate-600">
          {t("home.reviewPromptText")}
        </p>

        <div className="mt-5 flex justify-center text-amber-400" aria-hidden="true">
          <Star className="h-7 w-7" />
        </div>

        <button
          type="button"
          onClick={handleRateNow}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800"
        >
          {t("home.reviewPromptNow")}
          <ExternalLink className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleLater}
          className="mt-2 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          {t("home.reviewPromptLater")}
        </button>

        <button
          type="button"
          onClick={handleNever}
          className="mt-1 inline-flex w-full items-center justify-center px-5 py-3 text-xs font-semibold text-slate-400 transition hover:text-slate-700"
        >
          {t("home.reviewPromptNever")}
        </button>
      </div>
    </div>
  );
}
