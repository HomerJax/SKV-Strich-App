"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  requestPasswordResetAction,
  type ForgotPasswordState,
} from "./actions";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";

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

function getErrorMessage(error: string, t: (key: MessageKey) => string) {
  switch (error) {
    case "missing-email": return t("passwordForgot.errorEmail");
    case "reset-failed": return t("passwordForgot.errorSend");
    default: return error || "";
  }
}

function getSuccessMessage(success: string, t: (key: MessageKey) => string) {
  switch (success) {
    case "reset-sent": return t("passwordForgot.success");
    default: return success || "";
  }
}

export default function ForgotPasswordForm({
  initialEmail = "",
  initialError = "",
  initialSuccess = "",
  initialNext = "",
}: ForgotPasswordFormProps) {
  const { t } = useI18n();
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

  const errorMessage = useMemo(() => getErrorMessage(activeError, t), [activeError, t]);
  const successMessage = useMemo(
    () => getSuccessMessage(activeSuccess, t),
    [activeSuccess, t]
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
            {t("passwordForgot.title")}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            {t("passwordForgot.description")}
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
                {t("passwordForgot.email")}
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
              {isPending ? t("passwordForgot.sending") : t("passwordForgot.send")}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-600">
            <Link
              href={backToLoginHref}
              className="font-medium text-neutral-900 hover:underline"
            >
              {t("passwordForgot.back")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}