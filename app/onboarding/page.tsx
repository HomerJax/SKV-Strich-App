"use client";

import { useActionState, useState } from "react";
import { completeOnboarding, type OnboardingState } from "./actions";

const initialState: OnboardingState = {
  error: "",
};

export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState(
    completeOnboarding,
    initialState
  );
  const [intention, setIntention] = useState<"create-team" | "wait-for-invite">(
    "create-team"
  );

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
            Willkommen bei strikr
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Richte zuerst dein Profil ein und entscheide danach, wie du starten
            möchtest.
          </p>

          <form action={formAction} className="mt-8 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-800">
                  Vorname
                </span>
                <input
                  name="firstName"
                  type="text"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-slate-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-800">
                  Nachname
                </span>
                <input
                  name="lastName"
                  type="text"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-slate-500"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-800">
                Spitzname
              </span>
              <input
                name="nickname"
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-slate-500"
              />
            </label>

            <input type="hidden" name="intention" value={intention} />

            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setIntention("create-team")}
                className={`rounded-2xl border p-5 text-left transition ${
                  intention === "create-team"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="text-base font-semibold text-slate-950">
                  Ich möchte ein Team erstellen
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-600">
                  Du legst direkt dein eigenes Team an und kannst sofort loslegen.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIntention("wait-for-invite")}
                className={`rounded-2xl border p-5 text-left transition ${
                  intention === "wait-for-invite"
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="text-base font-semibold text-slate-950">
                  Ich warte auf eine Einladung
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-600">
                  Dein Profil wird angelegt und du kannst später einem Team
                  beitreten.
                </div>
              </button>
            </div>

            {intention === "create-team" && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-800">
                  Teamname
                </span>
                <input
                  name="clubName"
                  type="text"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-slate-500"
                />
              </label>
            )}

            {state.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Wird gespeichert..." : "Weiter"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}