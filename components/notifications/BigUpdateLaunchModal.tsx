"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

export const BIG_UPDATE_STORAGE_KEY = "strikr-big-update-fullscreen-2026-09-11-v2";
export const BIG_UPDATE_SEEN_EVENT = "strikr-big-update-seen";

export default function BigUpdateLaunchModal() {
  const { t } = useI18n();
  const updates = [
    ["📱", t("updateModal.appTitle"), t("updateModal.appText")],
    ["🏆", t("updateModal.badgesTitle"), t("updateModal.badgesText")],
    ["👑", t("updateModal.hofTitle"), t("updateModal.hofText")],
    ["👥", t("updateModal.compareTitle"), t("updateModal.compareText")],
    ["🔔", t("updateModal.notificationsTitle"), t("updateModal.notificationsText")],
  ];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Den alten kleinen "What's new"-Dialog dauerhaft ablösen.
    window.localStorage.setItem("strikr-whats-new-big-update-2026-09", "seen");
    setOpen(window.localStorage.getItem(BIG_UPDATE_STORAGE_KEY) !== "seen");
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function finish() {
    window.localStorage.setItem(BIG_UPDATE_STORAGE_KEY, "seen");
    window.dispatchEvent(new Event(BIG_UPDATE_SEEN_EVENT));
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex h-[100dvh] flex-col overflow-hidden bg-slate-950 text-white">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-8">
        <div className="shrink-0 text-lg font-black tracking-tight">strikr</div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-8">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">{t("updateModal.kicker")}</div>
          <h1 className="mt-3 text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-6xl">{t("updateModal.hero")}</h1>
          <p className="mt-4 max-w-xl text-base font-medium leading-7 text-white/60 sm:text-lg">
            {t("updateModal.intro")}
          </p>

          <div className="mt-7 space-y-3">
            {updates.map(([icon, title, text]) => (
              <div key={title} className="flex gap-4 rounded-[22px] border border-white/10 bg-white/[0.055] px-4 py-4 sm:px-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-xl">{icon}</div>
                <div className="min-w-0">
                  <div className="text-sm font-black sm:text-base">{title}</div>
                  <div className="mt-1 text-[13px] font-medium leading-5 text-white/55 sm:text-sm">{text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 bg-slate-950 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={finish}
            className="min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-black text-slate-950"
          >
            {t("updateModal.continueBadges")}
          </button>
        </div>
      </div>
    </div>
  );
}
