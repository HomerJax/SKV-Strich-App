"use client";

import { useSyncExternalStore } from "react";

type Props = {
  version: string;
};

const CHANGE_EVENT = "strikr-whats-new-change";
const STORAGE_KEY = "strikr-whats-new-big-update-2026-09";

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
      return window.localStorage.getItem(STORAGE_KEY) !== "seen";
    },
    () => false
  );

  function handleClose() {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(STORAGE_KEY, "seen");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  if (!open) return null;

  const updates = [
    ["📱 strikr jetzt als App", "Für iPhone und Android."],
    ["🏆 Neue Karriere-Badges", "Für Einsätze und Siege. Badge antippen = Fullscreen."],
    ["👑 Hall of Fame", "Auf Home und in deinen persönlichen Stats."],
    ["👥 Spieler ansehen & vergleichen", "Spieler in der Tabelle antippen, Hall of Fame öffnen und Vergleich starten."],
    ["🔔 Push- & In-App-Notifications", "strikr informiert dich jetzt direkt über wichtige Neuigkeiten."],
  ];

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
          Großes Update
        </div>

        <h2 className="mt-1 pr-10 text-2xl font-black tracking-tight text-slate-950">
          strikr {version}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          App. Badges. Hall of Fame. Spieler-Vergleich. Notifications.
        </p>

        <div className="mt-4 space-y-2.5">
          {updates.map(([title, text]) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="text-sm font-black text-slate-950">{title}</div>
              <div className="mt-1 text-[13px] font-medium leading-5 text-slate-600">
                {text}
              </div>
            </div>
          ))}
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
