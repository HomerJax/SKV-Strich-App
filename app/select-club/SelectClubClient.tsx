"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type SelectClubOption = {
  id: string;
  display_name: string;
  logo_url: string | null;
  role: "admin" | "member";
};

type SelectClubClientProps = {
  clubOptions: SelectClubOption[];
};

export default function SelectClubClient({
  clubOptions,
}: SelectClubClientProps) {
  const router = useRouter();
  const [submittingClubId, setSubmittingClubId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSelectClub(clubId: string) {
    if (submittingClubId) return;

    setSubmittingClubId(clubId);
    setErrorMessage("");

    try {
      const response = await fetch("/api/select-club", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          club_id: clubId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            redirect_to?: string;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        setErrorMessage("Dieses Team konnte nicht ausgewählt werden.");
        setSubmittingClubId(null);
        return;
      }

      router.replace(payload.redirect_to || "/");
      router.refresh();
    } catch {
      setErrorMessage("Dieses Team konnte nicht ausgewählt werden.");
      setSubmittingClubId(null);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[24px] border border-slate-800/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.75)]">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-5 py-6 text-center">
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
              Wähle dein Team.
            </h1>

            <p className="text-xs leading-5 text-white/75 sm:text-sm">
              Du bist mehreren Clubs zugeordnet. Wähle aus, mit welchem Team du
              jetzt arbeiten möchtest.
            </p>
          </div>
        </div>

        {errorMessage ? (
          <div className="mx-auto w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="mx-auto w-full max-w-3xl">
          <div className="grid gap-3 sm:grid-cols-2">
            {clubOptions.map((club) => (
              <div
                key={club.id}
                className="rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5">
                    {club.logo_url ? (
                      <Image
                        src={club.logo_url}
                        alt={`${club.display_name} Logo`}
                        width={64}
                        height={64}
                        className="h-full w-full object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="h-full w-full rounded-xl bg-slate-100" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-bold tracking-tight text-slate-950">
                      {club.display_name}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Rolle: {club.role === "admin" ? "Admin" : "Mitglied"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectClub(club.id)}
                  disabled={submittingClubId === club.id}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submittingClubId === club.id
                    ? "Wird geöffnet..."
                    : "Mit diesem Team öffnen"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}