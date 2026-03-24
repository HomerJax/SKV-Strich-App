"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getPostLoginRoute } from "@/lib/auth/get-post-login-route";

function getErrorMessage(error: string | null) {
  switch (error) {
    case "missing-fields":
      return "Bitte gib E-Mail und Passwort ein.";
    case "invalid-credentials":
      return "E-Mail oder Passwort ist falsch.";
    case "session-not-ready":
      return "Die Anmeldung wurde verarbeitet, aber die Session war noch nicht bereit. Bitte versuche es erneut.";
    default:
      return "";
  }
}

function getInitialEmail() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("email") ?? "";
}

function getInitialError() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("error");
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=31536000; SameSite=Lax`;
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setEmail(getInitialEmail());
    setError(getInitialError() ?? "");
  }, []);

  const errorMessage = useMemo(() => getErrorMessage(error), [error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("missing-fields");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const supabase = createClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (signInError) {
        setError("invalid-credentials");
        setIsSubmitting(false);
        return;
      }

      const session = await waitForSession();

      if (!session?.user) {
        setError("session-not-ready");
        setIsSubmitting(false);
        return;
      }

      const { route, activeClubId } = await getPostLoginRoute();

      if (activeClubId) {
        writeCookie("active_club_id", activeClubId);
      }

      router.replace(route);
      router.refresh();
    } catch {
      setError("invalid-credentials");
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
          <h1 className="text-2xl font-semibold text-neutral-950">Login</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Melde dich bei deinem Account an.
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
                autoComplete="current-password"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Einloggen..." : "Einloggen"}
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