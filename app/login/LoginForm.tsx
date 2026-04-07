"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { loginAction, type LoginState } from "./actions";

type LoginFormProps = {
  initialEmail?: string;
  initialError?: string;
  initialNext?: string;
};

function getErrorMessage(error: string) {
  switch (error) {
    case "missing-fields":
      return "Bitte gib E-Mail und Passwort ein.";
    case "invalid-credentials":
      return "E-Mail oder Passwort ist nicht korrekt.";
    case "session-not-ready":
      return "Die Anmeldung wurde verarbeitet, aber die Session war noch nicht bereit. Bitte versuche es erneut.";
    default:
      return initialErrorMessage(error);
  }
}

function initialErrorMessage(error: string) {
  return error || "";
}

const INITIAL_STATE: LoginState = {
  error: "",
};

export default function LoginForm({
  initialEmail = "",
  initialError = "",
  initialNext = "",
}: LoginFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [hasEditedSinceSubmit, setHasEditedSinceSubmit] = useState(false);

  const [state, formAction, isPending] = useActionState(
    loginAction,
    INITIAL_STATE
  );

  const activeErrorCode = hasEditedSinceSubmit
    ? ""
    : state.error || initialError || "";

  const errorMessage = useMemo(
    () => getErrorMessage(activeErrorCode),
    [activeErrorCode]
  );

  const signupHref = initialNext
    ? `/signup?next=${encodeURIComponent(initialNext)}`
    : "/signup";

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="mb-10 flex flex-col items-center gap-4">
          <Image
            src="/icon-dark.png"
            alt="strikr"
            width={84}
            height={84}
            priority
            className="h-20 w-20 object-contain"
          />
          <span className="text-4xl font-black tracking-tight text-neutral-950 sm:text-5xl">
            strikr
          </span>
        </div>

        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-neutral-950">
            Einloggen
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Melde dich an und kehre danach direkt zu deiner Einladung zurück.
          </p>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <form
            action={formAction}
            onSubmit={() => setHasEditedSinceSubmit(false)}
            className="mt-6 space-y-4"
          >
            <input type="hidden" name="next" value={initialNext} />

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
                E-Mail
              </label>
              <input
                name="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setHasEditedSinceSubmit(true);
                }}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                placeholder="du@beispiel.de"
                disabled={isPending}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
                Passwort
              </label>
              <input
                name="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setHasEditedSinceSubmit(true);
                }}
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                disabled={isPending}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Einloggen..." : "Einloggen"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-600">
            Noch kein Account?{" "}
            <Link
              href={signupHref}
              className="font-medium text-neutral-900 hover:underline"
            >
              Jetzt registrieren
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}