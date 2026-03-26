import Image from "next/image";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { getAuthContext } from "@/lib/auth/context";
import { createClubAction } from "./actions";

function getErrorMessage(error?: string | null) {
  switch (error) {
    case "missing-name":
      return "Bitte gib einen Teamnamen ein.";
    case "club-create-failed":
      return "Das Team konnte nicht erstellt werden.";
    case "membership-create-failed":
      return "Die Team-Zuordnung konnte nicht erstellt werden.";
    case "settings-create-failed":
      return "Das Team wurde erstellt, aber die Einstellungen konnten nicht vollständig angelegt werden.";
    case "membership-load-failed":
      return "Dein Account konnte nicht geladen werden.";
    case "player-link-failed":
      return "Das Team wurde erstellt, aber dein Spielerprofil konnte nicht mit dem Team verknüpft werden.";
    default:
      return null;
  }
}

type PageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function ClubSetupPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect("/login");
  }

  if (!ctx.player) {
    redirect("/onboarding");
  }

  if (ctx.memberships.length === 1 && ctx.activeClubId) {
    redirect("/");
  }

  if (ctx.memberships.length > 1) {
    redirect("/select-club");
  }

  const resolvedErrorMessage = getErrorMessage(resolvedSearchParams?.error);

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full rounded-[32px] border border-black/10 bg-white p-8 shadow-sm sm:p-10">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-slate-950 shadow-sm">
                <Image
                  src="/icon-dark.png"
                  alt="strikr Logo"
                  width={56}
                  height={56}
                  className="h-14 w-14 object-contain"
                  priority
                />
              </div>

              <div className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                strikr
              </div>

              <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Noch kein Team vorhanden
              </h1>

              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                Erstelle jetzt dein Team, wenn du direkt loslegen möchtest. Oder
                warte auf eine Einladung, falls du später zu einem bestehenden
                Team hinzugefügt wirst.
              </p>
            </div>

            {resolvedErrorMessage ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {resolvedErrorMessage}
              </div>
            ) : null}

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <section className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5">
                <h2 className="text-lg font-semibold text-neutral-950">
                  Team erstellen
                </h2>

                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Du legst ein neues Team an und wirst automatisch Admin dieses
                  Teams.
                </p>

                <form action={createClubAction} className="mt-5 space-y-4">
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
                      placeholder="z. B. AH Musterstadt"
                      className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-400"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Team erstellen
                  </button>
                </form>
              </section>

              <section className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5">
                <h2 className="text-lg font-semibold text-neutral-950">
                  Auf Einladung warten
                </h2>

                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Falls dich ein Admin später zu einem bestehenden Team hinzufügt,
                  kommst du nach dem nächsten Login oder Seitenaufruf automatisch
                  weiter.
                </p>

                <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-sm leading-6 text-neutral-600">
                  Du musst jetzt nichts weiter einrichten. Sobald eine Einladung
                  für dich aktiv ist, kannst du direkt mit dem passenden Team
                  starten.
                </div>

                <div className="mt-4">
                  <LogoutButton className="inline-flex w-full items-center justify-center rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 disabled:opacity-60">
                    Abmelden
                  </LogoutButton>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}