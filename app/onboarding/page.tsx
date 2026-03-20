import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type SearchParams = {
  next?: string | string[];
  error?: string | string[];
  message?: string | string[];
};

function getSingle(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const next = getSingle(resolvedSearchParams?.next);
  const error = getSingle(resolvedSearchParams?.error);
  const message = getSingle(resolvedSearchParams?.message);

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = next
      ? `/login?next=${encodeURIComponent(`/onboarding?next=${next}`)}`
      : "/login?next=%2Fonboarding";

    redirect(loginUrl);
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

        {message ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <form method="post" action="/api/onboarding" className="space-y-4">
          <input type="hidden" name="next" value={next} />

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
            Onboarding abschließen
          </button>
        </form>
      </div>
    </main>
  );
}