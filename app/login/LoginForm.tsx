"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LoginFormProps = {
  initialEmail?: string;
  initialError?: string;
};

function getErrorMessage(error: string | null) {
  switch (error) {
    case "missing-fields":
      return "Bitte gib E-Mail und Passwort ein.";
    case "invalid-credentials":
      return "E-Mail oder Passwort ist falsch.";
    case "session-not-ready":
      return "Die Anmeldung konnte nicht sauber abgeschlossen werden. Bitte versuche es erneut.";
    default:
      return "";
  }
}

export default function LoginForm({
  initialEmail = "",
  initialError = "",
}: LoginFormProps) {
  const [email, setEmail] = useState(initialEmail);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const errorMessage = useMemo(
    () => getErrorMessage(initialError),
    [initialError]
  );

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
          <h1 className="text-2xl font-semibold text-neutral-950">Login</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Melde dich bei deinem Account an.
          </p>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <form action="/api/login" method="post" className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
                E-Mail
              </label>
              <input
                name="email"
                type="email"
                defaultValue={email}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                placeholder="du@beispiel.de"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
                Passwort
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Einloggen
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link
              href="/forgot-password"
              className="text-neutral-600 hover:underline"
            >
              Passwort vergessen?
            </Link>
          </div>

          <div className="mt-6 text-center text-sm text-neutral-600">
            Noch kein Konto?{" "}
            <Link
              href="/signup"
              className="font-medium text-neutral-900 hover:underline"
            >
              Registrieren
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}