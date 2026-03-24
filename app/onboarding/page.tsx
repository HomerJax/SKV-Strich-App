import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveOnboardingAction } from "./actions";

type OnboardingPageProps = {
  searchParams?: Promise<{
    error?: string;
    detail?: string;
  }>;
};

function getErrorMessage(error: string | undefined, detail: string | undefined) {
  switch (error) {
    case "missing-fields":
      return "Bitte gib Vorname und Nachname ein.";
    case "save-failed":
      return detail
        ? `Onboarding konnte nicht gespeichert werden: ${detail}`
        : "Onboarding konnte nicht gespeichert werden.";
    default:
      return "";
  }
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: existingPlayer, error: playerError } = await supabase
    .from("players")
    .select("id, first_name, last_name, nickname")
    .eq("user_id", user.id)
    .maybeSingle();

  if (playerError) {
    throw new Error("Spielerprofil konnte nicht geladen werden.");
  }

  if (existingPlayer?.id) {
    const { data: memberships } = await supabase
      .from("club_memberships")
      .select("club_id")
      .eq("user_id", user.id);

    if ((memberships ?? []).length === 0) {
      redirect("/club-setup");
    }

    redirect("/");
  }

  const errorMessage = getErrorMessage(
    resolvedSearchParams?.error,
    resolvedSearchParams?.detail
  );

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

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}

        <form action={saveOnboardingAction} className="space-y-4">
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
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
              placeholder="Max"
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
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
              placeholder="Mustermann"
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
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
              placeholder="z. B. Messi, Benni, Keeper"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Weiter zum Team-Setup
          </button>
        </form>
      </div>
    </main>
  );
}