"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  requestPasswordResetAction,
  type ForgotPasswordState,
} from "./actions";

type ForgotPasswordFormProps = {
  initialEmail?: string;
  initialError?: string;
  initialSuccess?: string;
  initialNext?: string;
};

const INITIAL_STATE: ForgotPasswordState = {
  error: "",
  success: "",
};

function getErrorMessage(error: string) {
  switch (error) {
    case "missing-email":
      return "Bitte gib deine E-Mail-Adresse ein.";
    case "reset-failed":
      return "Die E-Mail zum Zurücksetzen konnte nicht versendet werden.";
    default:
      return error || "";
  }
}

function getSuccessMessage(success: string) {
  switch (success) {
    case "reset-sent":
      return "Wir haben dir eine E-Mail zum Zurücksetzen deines Passworts geschickt.";
    default:
      return success || "";
  }
}

export default function ForgotPasswordForm({
  initialEmail = "",
  initialError = "",
  initialSuccess = "",
  initialNext = "",
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [hasEditedSinceSubmit, setHasEditedSinceSubmit] = useState(false);

  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    INITIAL_STATE
  );

  const activeError = hasEditedSinceSubmit ? "" : state.error || initialError;
  const activeSuccess = hasEditedSinceSubmit
    ? ""
    : state.success || initialSuccess;

  const errorMessage = useMemo(() => getErrorMessage(activeError), [activeError]);
  const successMessage = useMemo(
    () => getSuccessMessage(activeSuccess),
    [activeSuccess]
  );

  const backToLoginHref = initialNext
    ? `/login?email=${encodeURIComponent(email)}&next=${encodeURIComponent(initialNext)}`
    : `/login?email=${encodeURIComponent(email)}`;

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
            Passwort vergessen
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Gib deine E-Mail ein. Wir senden dir einen Link, mit dem du dein
            Passwort neu setzen kannst.
          </p>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {successMessage}
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

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Senden..." : "Reset-Link senden"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-600">
            <Link
              href={backToLoginHref}
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