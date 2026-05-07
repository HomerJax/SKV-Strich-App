"use client";

import { useSyncExternalStore } from "react";

type Props = {
  version: string;
};

const CHANGE_EVENT = "strikr-whats-new-change";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => callback();

  window.addEventListener("storage", handler);
  window.addEventListener(CHANGE_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(CHANGE_EVENT, handler);
  };
}

export default function WhatsNewModal({ version }: Props) {
  const open = useSyncExternalStore(
    subscribe,
    () => {
      if (typeof window === "undefined") return false;
      const storageKey = `strikr-whats-new-${version}`;
      return window.localStorage.getItem(storageKey) !== "seen";
    },
    () => false
  );

  function handleClose() {
    if (typeof window === "undefined") return;

    const storageKey = `strikr-whats-new-${version}`;
    window.localStorage.setItem(storageKey, "seen");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="pointer-events-auto relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-[24px] border border-white/70 bg-white p-5 shadow-2xl sm:p-6">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg font-bold leading-none text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
          aria-label="Update schließen"
        >
          ×
        </button>

        <div className="pr-10 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Release Update
        </div>

        <h2 className="mt-1 pr-10 text-2xl font-black tracking-tight text-slate-950">
          strikr {version}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Mehr MVP, mehr Sharing, mehr Emotion nach dem Training.
        </p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
          <div className="text-sm font-bold text-slate-950">
            Neu in diesem Update
          </div>

          <div className="mt-3 space-y-2">
            {[
              "Neue Premium MVP Share Cards",
              "Eigene MVP Notifications",
              "Besseres Teilen per WhatsApp & Social Media",
              "Home, Toasts und MVP Flow weiter poliert",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl bg-white px-3.5 py-2.5 text-[13px] font-medium leading-5 text-slate-700 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>

          <p className="mt-3 text-[13px] leading-5 text-slate-500">
            Ziel: weniger Verwaltungs-App, mehr Emotion und Erinnerungen rund
            ums Training.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}