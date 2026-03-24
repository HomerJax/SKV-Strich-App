"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function getUrlParam(name: string) {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.search);
  return params.get(name) ?? "";
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : null;
}

async function resolveBrowserAuth() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user && session.access_token) {
    return {
      user: session.user,
      accessToken: session.access_token,
    };
  }

  await supabase.auth.refreshSession();

  const {
    data: { session: refreshedSession },
  } = await supabase.auth.getSession();

  if (refreshedSession?.user && refreshedSession.access_token) {
    return {
      user: refreshedSession.user,
      accessToken: refreshedSession.access_token,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      accessToken: null,
    };
  }

  const {
    data: { session: finalSession },
  } = await supabase.auth.getSession();

  return {
    user,
    accessToken: finalSession?.access_token ?? null,
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const hasNavigatedRef = useRef(false);

  const [nextPath, setNextPath] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const next = getUrlParam("next");
    const error = getUrlParam("error");
    const message = getUrlParam("message");

    setNextPath(next);
    setErrorMessage(error);
    setSuccessMessage(message);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const auth = await resolveBrowserAuth();

      if (!isMounted) {
        return;
      }

      if (!auth.user) {
        setErrorMessage(
          "Deine Anmeldung konnte nicht geladen werden. Bitte logge dich erneut ein."
        );
        setIsLoading(false);
        return;
      }

      const activeClubId = readCookie("active_club_id");

      if (!activeClubId) {
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          router.replace("/club-setup");
        }
        return;
      }

      const { data: player, error } = await supabase
        .from("players")
        .select("id, first_name, last_name, nickname")
        .eq("club_id", activeClubId)
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Dein Spielerprofil konnte nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      if (player?.id) {
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          router.replace(nextPath || "/");
        }
        return;
      }

      setAuthReady(true);
      setIsLoading(false);
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [router, nextPath]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanNickname = nickname.trim();

    if (!cleanFirstName || !cleanLastName) {
      setErrorMessage("Bitte gib Vorname und Nachname ein.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const auth = await resolveBrowserAuth();

      if (!auth.user || !auth.accessToken) {
        setErrorMessage(
          "Deine Anmeldung ist nicht mehr gültig. Bitte logge dich erneut ein."
        );
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          first_name: cleanFirstName,
          last_name: cleanLastName,
          nickname: cleanNickname,
          next: nextPath,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            detail?: string | null;
            redirect_to?: string;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        setErrorMessage(
          payload?.error || "Onboarding konnte nicht gespeichert werden."
        );
        setIsSubmitting(false);
        return;
      }

      hasNavigatedRef.current = true;
      window.location.href = payload?.redirect_to || nextPath || "/";
    } catch {
      setErrorMessage("Onboarding konnte nicht gespeichert werden.");
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl items-center px-4 py-10">
        <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-neutral-600">Onboarding wird geladen...</p>
        </div>
      </main>
    );
  }

  if (!authReady) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl items-center px-4 py-10">
        <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage || "Deine Anmeldung konnte nicht geladen werden."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Profil vervollständigen
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Bitte ergänze deine Daten, damit dein Spielerprofil in{" "}
            <span className="font-semibold">strikr</span> vervollständigt werden
            kann.
          </p>
        </div>

        {successMessage ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="first_name"
              className="mb-1.5 block text-sm font-medium text-neutral-900"
            >
              Vorname
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              required
              maxLength={80}
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
              placeholder="Max"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="last_name"
              className="mb-1.5 block text-sm font-medium text-neutral-900"
            >
              Nachname
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              required
              maxLength={80}
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
              placeholder="Mustermann"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="nickname"
              className="mb-1.5 block text-sm font-medium text-neutral-900"
            >
              Spitzname <span className="text-neutral-400">(optional)</span>
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              maxLength={80}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
              placeholder="z. B. Messi, Benni, Keeper"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Speichert..." : "Onboarding abschließen"}
          </button>
        </form>
      </div>
    </main>
  );
}