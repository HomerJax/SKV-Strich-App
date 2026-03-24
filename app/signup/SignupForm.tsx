"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type SignupFormProps = {
  initialEmail?: string;
  initialError?: string;
};

function getErrorMessage(error: string) {
  switch (error) {
    case "missing-fields":
      return "Bitte fülle alle Felder aus.";
    case "password-mismatch":
      return "Die Passwörter stimmen nicht überein.";
    case "password-too-short":
      return "Das Passwort muss mindestens 8 Zeichen lang sein.";
    case "email-already-used":
      return "Diese E-Mail-Adresse wird bereits verwendet.";
    case "signup-failed":
      return "Registrierung fehlgeschlagen. Bitte versuche es erneut.";
    case "login-after-signup-failed":
      return "Registrierung erfolgreich, aber die Anmeldung danach ist fehlgeschlagen.";
    case "session-not-ready":
      return "Die Registrierung wurde verarbeitet, aber die Session war noch nicht bereit. Bitte logge dich ein.";
    default:
      return "";
  }
}

async function waitForSession() {
  const supabase = createClient();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      return session;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }

  return null;
}

export default function SignupForm({
  initialEmail = "",
  initialError = "",
}: SignupFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errorMessage = useMemo(() => getErrorMessage(error), [error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;
    const cleanPasswordConfirm = passwordConfirm;

    if (!cleanEmail || !cleanPassword || !cleanPasswordConfirm) {
      setError("missing-fields");
      return;
    }

    if (cleanPassword !== cleanPasswordConfirm) {
      setError("password-mismatch");
      return;
    }

    if (cleanPassword.length < 8) {
      setError("password-too-short");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const supabase = createClient();

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (signUpError) {
        const message = signUpError.message.toLowerCase();

        if (
          message.includes("already registered") ||
          message.includes("already been registered") ||
          message.includes("user already registered")
        ) {
          setError("email-already-used");
        } else {
          setError("signup-failed");
        }

        setIsSubmitting(false);
        return;
      }

      if (!signUpData.user) {
        setError("signup-failed");
        setIsSubmitting(false);
        return;
      }

      try {
        await supabase.rpc("link_existing_player_by_email", {
          user_email: cleanEmail,
        });
      } catch {
        // unkritisch
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (signInError) {
        setError("login-after-signup-failed");
        setIsSubmitting(false);
        return;
      }

      const session = await waitForSession();

      if (!session?.user) {
        setError("session-not-ready");
        setIsSubmitting(false);
        return;
      }

      router.replace("/onboarding");
      router.refresh();
    } catch {
      setError("signup-failed");
      setIsSubmitting(false);
    }
  }

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
            Registrieren
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Erstelle deinen Account und starte danach direkt mit dem Onboarding.
          </p>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
                E-Mail
              </label>
              <input
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                placeholder="du@beispiel.de"
                disabled={isSubmitting}
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
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
                Passwort bestätigen
              </label>
              <input
                name="password_confirm"
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Registrieren..." : "Registrieren"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-600">
            Bereits registriert?{" "}
            <Link
              href="/login"
              className="font-medium text-neutral-900 hover:underline"
            >
              Zum Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}