"use client";

import Link from "next/link";

export default function SessionDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <div className="rounded-[28px] border border-rose-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-rose-500">
            Session
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            Session konnte nicht vollständig geöffnet werden
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Bitte versuche es direkt noch einmal. Falls es erneut passiert,
            bleibt die Session-Liste weiterhin erreichbar.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Erneut laden
            </button>

            <Link
              href="/sessions"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Zur Session-Liste
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
