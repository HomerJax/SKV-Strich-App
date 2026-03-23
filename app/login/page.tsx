"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function getInitialErrorMessage(error?: string | null) {
  switch (error) {
    case "missing-fields":
      return "Bitte gib E-Mail und Passwort ein.";
    case "invalid-credentials":
      return "E-Mail oder Passwort ist falsch.";
    case "membership-load-failed":
      return "Dein Account konnte nicht geladen werden.";
    default:
      return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialEmail = searchParams.get("email") ?? "";
  const initialError = useMemo(
    () => getInitialErrorMessage(searchParams.get("error")),
    [searchParams]
  );

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail || !password.trim()) {
      setErrorMessage("Bitte gib E-Mail und Passwort ein.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        setErrorMessage("E-Mail oder Passwort ist falsch.");
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("Dein Account konnte nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      const { data: memberships, error: membershipError } = await supabase
        .from("club_memberships")
        .select("club_id")
        .eq("user_id", user.id);

      if (membershipError) {
        setErrorMessage("Dein Account konnte nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      const clubIds = Array.from(
        new Set(
          (memberships ?? [])
            .map((entry) => entry.club_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      if (clubIds.length === 0) {
        router.replace("/club-setup");
        router.refresh();
        return;
      }

      if (clubIds.length === 1) {
        document.cookie = `active_club_id=${clubIds[0]}; Path=/; Max-Age=31536000; SameSite=Lax`;
        router.replace("/");
        router.refresh();
        return;
      }

      router.replace("/select-club");
      router.refresh();
    } catch {
      setErrorMessage("Beim Login ist etwas schiefgelaufen. Bitte versuche es erneut.");
      setIsLoading(false);
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
                disabled={isLoading}
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
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Einloggen..." : "Einloggen"}
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