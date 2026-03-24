"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type MembershipRow = {
  club_id: string;
};

function getErrorMessage(error?: string | null) {
  switch (error) {
    case "missing-name":
      return "Bitte gib einen Teamnamen ein.";
    case "missing-user":
      return "Deine Anmeldung ist nicht mehr gültig. Bitte logge dich erneut ein.";
    case "club-create-failed":
      return "Das Team konnte nicht erstellt werden.";
    case "membership-create-failed":
      return "Die Team-Zuordnung konnte nicht erstellt werden.";
    case "settings-create-failed":
      return "Das Team wurde erstellt, aber die Einstellungen konnten nicht vollständig angelegt werden.";
    case "membership-load-failed":
      return "Dein Account konnte nicht geladen werden.";
    default:
      return null;
  }
}

function getErrorFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("error");
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

export default function ClubSetupPage() {
  const hasNavigatedRef = useRef(false);

  const [displayName, setDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    setErrorMessage(getErrorMessage(getErrorFromUrl()));
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const auth = await resolveBrowserAuth();

      if (!isMounted) {
        return;
      }

      if (!auth.user) {
        setAuthReady(false);
        setErrorMessage(
          "Deine Anmeldung konnte nicht geladen werden. Bitte logge dich erneut ein."
        );
        setIsCheckingAuth(false);
        return;
      }

      const { data: memberships, error } = await supabase
        .from("club_memberships")
        .select("club_id")
        .eq("user_id", auth.user.id);

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Dein Account konnte nicht geladen werden.");
        setErrorDetail(error.message ?? null);
        setAuthReady(true);
        setIsCheckingAuth(false);
        return;
      }

      const typedMemberships = (memberships ?? []) as MembershipRow[];

      if (typedMemberships.length === 1) {
        document.cookie = `active_club_id=${typedMemberships[0].club_id}; Path=/; Max-Age=31536000; SameSite=Lax`;

        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          window.location.href = "/";
        }
        return;
      }

      if (typedMemberships.length > 1) {
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          window.location.href = "/select-club";
        }
        return;
      }

      setAuthReady(true);
      setIsCheckingAuth(false);
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanDisplayName = displayName.trim();

    if (!cleanDisplayName) {
      setErrorMessage("Bitte gib einen Teamnamen ein.");
      setErrorDetail(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setErrorDetail(null);

    try {
      const auth = await resolveBrowserAuth();

      if (!auth.user || !auth.accessToken) {
        setErrorMessage(
          "Deine Anmeldung ist nicht mehr gültig. Bitte logge dich erneut ein."
        );
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/club-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          display_name: cleanDisplayName,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            detail?: string | null;
            club_id?: string;
            redirect_to?: string;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        setErrorMessage(
          getErrorMessage(payload?.error) ?? "Das Team konnte nicht erstellt werden."
        );
        setErrorDetail(payload?.detail ?? null);
        setIsSubmitting(false);
        return;
      }

      if (payload.club_id) {
        document.cookie = `active_club_id=${payload.club_id}; Path=/; Max-Age=31536000; SameSite=Lax`;
      }

      hasNavigatedRef.current = true;
      window.location.href = payload?.redirect_to || "/";
    } catch (error) {
      setErrorMessage("Das Team konnte nicht erstellt werden.");
      setErrorDetail(error instanceof Error ? error.message : null);
      setIsSubmitting(false);
    }
  }

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="w-full rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <p className="text-sm text-neutral-600">Lade Team-Setup...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!authReady) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="w-full rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage ??
                "Deine Anmeldung konnte nicht geladen werden. Bitte logge dich erneut ein."}
            </div>

            {errorDetail ? (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                {errorDetail}
              </div>
            ) : null}

            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Zum Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <div className="mb-3 inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-700">
              strikr
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
              Du hast aktuell noch kein Team
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-600">
              Erstelle jetzt dein Team, wenn du loslegen möchtest. Oder warte auf
              eine Einladung, falls du später zu einem bestehenden Team hinzugefügt
              wirst.
            </p>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {errorDetail ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              {errorDetail}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <h2 className="text-lg font-semibold text-neutral-950">
                Team erstellen
              </h2>

              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Du legst ein neues Team an und wirst automatisch Admin dieses
                Teams.
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="display_name"
                    className="mb-2 block text-sm font-medium text-neutral-800"
                  >
                    Teamname
                  </label>

                  <input
                    id="display_name"
                    name="display_name"
                    type="text"
                    required
                    maxLength={80}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="z. B. AH Musterstadt"
                    className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-400"
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Team wird erstellt..." : "Team erstellen"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <h2 className="text-lg font-semibold text-neutral-950">
                Auf Einladung warten
              </h2>

              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Falls dich ein Admin später zu einem bestehenden Team hinzufügt,
                kannst du dich einfach erneut einloggen und direkt weitermachen.
              </p>

              <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-sm leading-6 text-neutral-600">
                Aktuell gibt es noch kein separates Invite-System. Diese Seite sorgt
                aber schon jetzt dafür, dass User ohne Team nicht in einen unklaren
                Zustand laufen.
              </div>

              <div className="mt-4">
                <Link
                  href="/logout"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
                >
                  Abmelden
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}