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
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4">
      <div className="pointer-events-auto w-full max-w-lg rounded-[28px] border border-black/10 bg-white p-6 shadow-2xl">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Neu in {version}
        </div>

        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
          Was ist neu in Strikr?
        </h2>

        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
          <div>
            <span className="font-semibold text-slate-950">Profilbereich:</span>{" "}
            Oben auf deinen Namen klicken, um direkt ins Profil zu kommen.
          </div>

          <div>
            <span className="font-semibold text-slate-950">
              Passwort ändern:
            </span>{" "}
            Direkt im Profil möglich.
          </div>

          <div>
            <span className="font-semibold text-slate-950">
              Club-Branding:
            </span>{" "}
            Im Adminbereich können Logo und Hauptfarbe gepflegt werden.
          </div>

          <div>
            <span className="font-semibold text-slate-950">Version:</span> Die
            aktuelle App-Version wird jetzt im Header angezeigt.
          </div>
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