"use client";

import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import { completeOnboarding, type OnboardingState } from "./actions";

const initialState: OnboardingState = {
  error: "",
};

type OnboardingFormProps = {
  initialNext?: string;
};

export default function OnboardingForm({
  initialNext = "",
}: OnboardingFormProps) {
  const [state, formAction, pending] = useActionState(
    completeOnboarding,
    initialState
  );

  const defaultIntention =
    initialNext && initialNext.startsWith("/join?")
      ? "wait-for-invite"
      : "create-team";

  const [intention, setIntention] = useState<
    "create-team" | "wait-for-invite"
  >(defaultIntention);

  const introText = useMemo(() => {
    if (initialNext && initialNext.startsWith("/join?")) {
      return "Lege zuerst dein Profil an. Danach führen wir dich direkt zurück zu deiner Einladung.";
    }

    return "Lege zuerst dein Profil an und entscheide danach, wie du starten möchtest.";
  }, [initialNext]);

  const helperText = useMemo(() => {
    if (initialNext && initialNext.startsWith("/join?")) {
      return "Nach dem Speichern geht es automatisch mit deiner Einladung weiter.";
    }

    return "Nach dem Speichern wirst du direkt in den passenden nächsten Schritt weitergeleitet.";
  }, [initialNext]);

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full rounded-[32px] border border-black/10 bg-white p-8 shadow-sm sm:p-10">
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-slate-950 shadow-sm">
                <Image
                  src="/icon-dark.png"
                  alt="strikr Logo"
                  width={42}
                  height={42}
                  className="h-10 w-10 object-contain"
                  priority
                />
              </div>

              <div className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                strikr
              </div>

              <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Willkommen — richte dein Profil ein
              </h1>

              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                {introText}
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {helperText}
            </div>

            <form action={formAction} className="mt-8 space-y-6">
              <input type="hidden" name="next" value={initialNext} />
              <input type="hidden" name="intention" value={intention} />

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-800">
                    Vorname
                  </span>
                  <input
                    name="firstName"
                    type="text"
                    required
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-500"
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
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-500"
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
                  placeholder="optional, z. B. Homi"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-500"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setIntention("create-team")}
                  className={`rounded-[24px] border p-5 text-left transition ${
                    intention === "create-team"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-300 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="text-base font-semibold text-slate-950">
                    Ich möchte ein Team erstellen
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    Du legst direkt dein eigenes Team an und kannst sofort
                    loslegen.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIntention("wait-for-invite")}
                  className={`rounded-[24px] border p-5 text-left transition ${
                    intention === "wait-for-invite"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-300 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="text-base font-semibold text-slate-950">
                    Ich warte auf eine Einladung
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    Dein Profil wird angelegt und du kannst danach direkt deiner
                    Einladung folgen.
                  </div>
                </button>
              </div>

              {intention === "create-team" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-800">
                    Teamname
                  </span>
                  <input
                    name="clubName"
                    type="text"
                    required
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-500"
                  />
                  <span className="mt-2 block text-xs text-slate-500">
                    Name, Logo und weitere Details kannst du später jederzeit
                    anpassen.
                  </span>
                </label>
              ) : null}

              {state.error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {state.error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Wird gespeichert..." : "Weiter"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}