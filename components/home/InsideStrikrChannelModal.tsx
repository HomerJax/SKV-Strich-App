"use client";

import Image from "next/image";
import { ExternalLink, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

const CHANNEL_URL = "https://whatsapp.com/channel/0029VbDksXIHVvTj4RgJs43v";
const STORAGE_KEY = "strikr-inside-strikr-whatsapp-dismissed-2026-10";
const UPDATE_STORAGE_KEY = "strikr-whats-new-big-update-2026-09";
const CHANGE_EVENT = "strikr-inside-strikr-whatsapp-change";
const WHATS_NEW_CHANGE_EVENT = "strikr-whats-new-change";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener(WHATS_NEW_CHANGE_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener(WHATS_NEW_CHANGE_EVENT, handler);
  };
}

function markDismissed() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, "dismissed");
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export default function InsideStrikrChannelModal() {
  const { t } = useI18n();

  const open = useSyncExternalStore(
    subscribe,
    () => {
      if (typeof window === "undefined") return false;

      const dismissed = window.localStorage.getItem(STORAGE_KEY) === "dismissed";
      const whatsNewAlreadySeen =
        window.localStorage.getItem(UPDATE_STORAGE_KEY) === "seen";

      return !dismissed && whatsNewAlreadySeen;
    },
    () => false,
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.17),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-7 pt-5 sm:px-8 sm:pb-10 sm:pt-8">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={markDismissed}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-950"
            aria-label={t("home.insideStrikrClose")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[34px] bg-slate-950 shadow-[0_22px_70px_rgba(15,23,42,0.22)] ring-1 ring-black/5">
            <Image
              src="/brand/inside-strikr-channel.png"
              alt="Inside strikr – der strikr Kabinentalk"
              width={128}
              height={128}
              className="h-full w-full object-cover"
              priority
            />
          </div>

          <div className="mt-7 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-600">
            {t("home.insideStrikrEyebrow")}
          </div>

          <h2 className="mt-2 max-w-md text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
            {t("home.insideStrikrTitle")}
          </h2>

          <p className="mt-4 max-w-md text-[15px] font-medium leading-7 text-slate-600">
            {t("home.insideStrikrText")}
          </p>

          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={markDismissed}
            className="mt-8 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-4 text-sm font-black text-white shadow-[0_14px_35px_rgba(37,211,102,0.25)] transition hover:brightness-95"
          >
            {t("home.insideStrikrOpen")}
            <ExternalLink className="h-4 w-4" />
          </a>

          <button
            type="button"
            onClick={markDismissed}
            className="mt-3 inline-flex w-full max-w-sm items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold text-slate-500 transition hover:bg-white/70 hover:text-slate-800"
          >
            {t("home.insideStrikrDismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
