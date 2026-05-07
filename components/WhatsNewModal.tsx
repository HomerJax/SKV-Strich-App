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
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="pointer-events-auto w-full max-w-lg rounded-[28px] border border-white/70 bg-white p-6 shadow-2xl">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Neues Release Update
        </div>

        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
          strikr {version}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Das MVP Erlebnis wurde deutlich erweitert – mit neuen Share Cards,
          besseren Notifications und mehr Fokus auf Emotion nach dem Training.
        </p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-base font-semibold text-slate-950">
            Neu in diesem Update
          </div>

          <div className="mt-3 space-y-2">
            {[
              "Neue Premium MVP Share Cards für Gewinner & Team-Ergebnisse",
              "Eigene MVP Notifications für Gewinner und Teilnehmer",
              "Bessere Sharing Experience für WhatsApp & Social Media",
              "Home, Toasts und MVP Flow weiter poliert",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl bg-white px-4 py-3 text-sm leading-5 text-slate-700 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            Ziel bleibt: weniger Verwaltungs-App, mehr Emotion, Rivalität und
            Erinnerungen rund ums Training.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}