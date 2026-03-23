"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type MembershipRow = {
  club_id: string;
};

function getErrorMessage(error?: string | null) {
  switch (error) {
    case "missing-name":
      return "Bitte gib einen Teamnamen ein.";
    case "missing-user":
      return "Der Benutzer konnte nicht erkannt werden.";
    case "club-create-failed":
      return "Das Team konnte nicht erstellt werden.";
    case "membership-create-failed":
      return "Die Team-Zuordnung konnte nicht erstellt werden.";
    case "settings-create-failed":
      return "Das Team wurde erstellt, aber die Einstellungen konnten nicht vollständig angelegt werden.";
    default:
      return null;
  }
}

export default function ClubSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [displayName, setDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    getErrorMessage(searchParams.get("error"))
  );
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data: memberships, error } = await supabase
        .from("club_memberships")
        .select("club_id")
        .eq("user_id", session.user.id);

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Dein Account konnte nicht geladen werden.");
        setIsCheckingAuth(false);
        return;
      }

      const typedMemberships = (memberships ?? []) as MembershipRow[];

      if (typedMemberships.length === 1) {
        document.cookie = `active_club_id=${typedMemberships[0].club_id}; Path=/; Max-Age=31536000; SameSite=Lax`;
        router.replace("/");
        return;
      }

      if (typedMemberships.length > 1) {
        router.replace("/select-club");
        return;
      }

      setIsCheckingAuth(false);
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanDisplayName = displayName.trim();

    if (!cleanDisplayName) {
      setErrorMessage("Bitte gib einen Teamnamen ein.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      const user = session?.user;

      if (!accessToken || !user) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/club-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          display_name: cleanDisplayName,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            club_id?: string;
            redirect_to?: string;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        setErrorMessage(getErrorMessage(payload?.error) ?? "Das Team konnte nicht erstellt werden.");
        setIsSubmitting(false);
        return;
      }

      if (payload.club_id) {
        document.cookie = `active_club_id=${payload.club_id}; Path=/; Max-Age=31536000; SameSite=Lax`;
      }

      router.replace(payload?.redirect_to || "/");
      router.refresh();
    } catch {
      setErrorMessage("Das Team konnte nicht erstellt werden.");
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
              eine Einladung, falls du später zu einem bestehenden Team
              hinzugefügt wirst.
            </p>
          </div>

          {errorMessage ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
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
                Aktuell gibt es noch kein separates Invite-System. Diese Seite
                sorgt aber schon jetzt dafür, dass User ohne Team nicht in einen
                unklaren Zustand laufen.
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