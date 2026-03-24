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
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-12">
      <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
        <h1 className="text-3xl font-semibold text-white">
          Willkommen bei strikr
        </h1>

        <p className="mt-3 text-sm leading-6 text-white/70">
          Richte zuerst dein Profil ein und entscheide danach, wie du starten
          möchtest.
        </p>

        <form action={formAction} className="mt-8 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-white">Vorname</span>
              <input
                name="firstName"
                type="text"
                required
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white">Nachname</span>
              <input
                name="lastName"
                type="text"
                required
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm text-white">Spitzname</span>
            <input
              name="nickname"
              type="text"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
            />
          </label>

          <input type="hidden" name="intention" value={intention} />

          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setIntention("create-team")}
              className={`rounded-2xl border p-4 text-left transition ${
                intention === "create-team"
                  ? "border-green-400 bg-green-400/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="font-medium text-white">Ich möchte ein Team erstellen</div>
              <div className="mt-2 text-sm text-white/70">
                Du legst direkt dein eigenes Team an und kannst sofort loslegen.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIntention("wait-for-invite")}
              className={`rounded-2xl border p-4 text-left transition ${
                intention === "wait-for-invite"
                  ? "border-green-400 bg-green-400/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="font-medium text-white">Ich warte auf eine Einladung</div>
              <div className="mt-2 text-sm text-white/70">
                Dein Profil wird angelegt und du kannst später einem Team
                beitreten.
              </div>
            </button>
          </div>

          {intention === "create-team" && (
            <label className="block">
              <span className="mb-2 block text-sm text-white">Teamname</span>
              <input
                name="clubName"
                type="text"
                required
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              />
            </label>
          )}

          {state.error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {state.error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-green-400 px-4 py-3 font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Wird gespeichert..." : "Weiter"}
          </button>
        </form>
      </div>
    </main>
  );
}