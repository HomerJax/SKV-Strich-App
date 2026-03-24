import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClubAction } from "./actions";

type ClubSetupPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

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

export default async function ClubSetupPage({
  searchParams,
}: ClubSetupPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!player) {
    redirect("/onboarding");
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("club_memberships")
    .select("club_id")
    .eq("user_id", user.id);

  if (membershipsError) {
    throw new Error("Mitgliedschaften konnten nicht geladen werden.");
  }

  const membershipList = memberships ?? [];

  if (membershipList.length === 1) {
    redirect("/");
  }

  if (membershipList.length > 1) {
    redirect("/select-club");
  }

  const errorMessage = getErrorMessage(resolvedSearchParams?.error);

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

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
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
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
                >
                  Team erstellen
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