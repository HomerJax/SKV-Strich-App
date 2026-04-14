"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { updatePasswordAction, type ResetPasswordState } from "./actions";

type ResetPasswordFormProps = {
  initialError?: string;
  initialNext?: string;
};

const INITIAL_STATE: ResetPasswordState = {
  error: "",
};

function getErrorMessage(error: string) {
  switch (error) {
    case "missing-password":
      return "Bitte gib ein neues Passwort ein.";
    case "password-too-short":
      return "Dein neues Passwort sollte mindestens 8 Zeichen lang sein.";
    case "password-mismatch":
      return "Die Passwörter stimmen nicht überein.";
    case "update-failed":
      return "Das Passwort konnte nicht aktualisiert werden.";
    default:
      return error || "";
  }
}

export default function ResetPasswordForm({
  initialError = "",
  initialNext = "",
}: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [hasEditedSinceSubmit, setHasEditedSinceSubmit] = useState(false);

  const [state, formAction, isPending] = useActionState(
    updatePasswordAction,
    INITIAL_STATE
  );

  const activeError = hasEditedSinceSubmit ? "" : state.error || initialError;
  const errorMessage = useMemo(() => getErrorMessage(activeError), [activeError]);

  const loginHref = initialNext
    ? `/login?next=${encodeURIComponent(initialNext)}`
    : "/login";

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
            Neues Passwort setzen
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Vergib jetzt ein neues Passwort für deinen Account.
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
                Neues Passwort
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
                autoComplete="new-password"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                disabled={isPending}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
                Passwort wiederholen
              </label>
              <input
                name="password_confirm"
                type="password"
                value={passwordConfirm}
                onChange={(event) => {
                  setPasswordConfirm(event.target.value);
                  setHasEditedSinceSubmit(true);
                }}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                disabled={isPending}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Speichert..." : "Passwort speichern"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-600">
            <Link
              href={loginHref}
              className="font-medium text-neutral-900 hover:underline"
            >
              Zurück zum Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}