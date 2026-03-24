"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

function getErrorMessage(error: string) {
  switch (error) {
    case "missing-fields":
      return "Bitte E-Mail, Passwort und Passwort-Bestätigung vollständig eingeben.";
    case "password-mismatch":
      return "Die Passwörter stimmen nicht überein.";
    case "password-too-short":
      return "Das Passwort muss mindestens 8 Zeichen lang sein.";
    case "email-already-used":
      return "Für diese E-Mail existiert bereits ein Konto. Bitte logge dich ein oder nutze Passwort vergessen.";
    case "signup-failed":
      return "Die Registrierung konnte gerade nicht abgeschlossen werden. Bitte versuche es erneut.";
    case "invalid-credentials":
      return "Das Konto wurde erstellt, aber die automatische Anmeldung ist fehlgeschlagen. Bitte logge dich manuell ein.";
    default:
      return "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.";
  }
}

type SignupFormProps = {
  initialEmail?: string;
};

export default function SignupForm({ initialEmail = "" }: SignupFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errorMessage = useMemo(() => {
    if (!error) return "";
    return getErrorMessage(error);
  }, [error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password || !passwordConfirm) {
      setError("missing-fields");
      return;
    }

    if (password !== passwordConfirm) {
      setError("password-mismatch");
      return;
    }

    if (password.length < 8) {
      setError("password-too-short");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const supabase = createClient();

      const { error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (signUpError) {
        const message = signUpError.message.toLowerCase();

        if (
          message.includes("already registered") ||
          message.includes("already been registered") ||
          message.includes("user already registered")
        ) {
          setError("email-already-used");
          return;
        }

        setError("signup-failed");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        setError("invalid-credentials");
        return;
      }

      window.location.href = "/onboarding";
      return;
    } catch {
      setError("signup-failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[24px] border border-slate-800/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.75)]">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 px-5 py-5 text-center">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-white/10 ring-1 ring-white/15">
              <Image
                src="/icon-dark.png"
                alt="strikr Logo"
                fill
                className="object-contain"
                priority
              />
            </div>

            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Teamtage einfacher organisieren.
            </h1>

            <p className="text-xs leading-5 text-white/75 sm:text-sm">
              Planung, Teams und Ergebnisse — alles an einem Ort.
            </p>
          </div>
        </div>

        <section className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 pt-2">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl shadow-sm">
              <Image
                src="/icon-dark.png"
                alt="strikr Logo"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="text-4xl font-black tracking-tight text-slate-950">
              strikr
            </div>
          </div>

          <div className="w-full rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)]">
            <div className="mb-4 text-center">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
                Registrieren
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Erstelle dein strikr-Konto.
              </p>
            </div>

            {errorMessage ? (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="E-Mail"
                  className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                />
              </div>

              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                />
              </div>

              <div>
                <input
                  id="password_confirm"
                  name="password_confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  placeholder="Passwort wiederholen"
                  className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Konto wird erstellt..." : "Konto erstellen"}
              </button>

              <div className="pt-1 text-xs text-slate-600">
                Schon ein Konto?{" "}
                <Link
                  href="/login"
                  className="underline underline-offset-4 hover:text-slate-950"
                >
                  Zum Login
                </Link>
              </div>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}