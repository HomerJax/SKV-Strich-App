import Link from "next/link";
import Image from "next/image";

type SearchParams = {
  next?: string | string[];
  error?: string | string[];
  message?: string | string[];
  email?: string | string[];
};

function getSingle(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const next = getSingle(resolvedSearchParams?.next);
  const error = getSingle(resolvedSearchParams?.error);
  const message = getSingle(resolvedSearchParams?.message);
  const email = getSingle(resolvedSearchParams?.email);

  const signupHref = next
    ? `/signup?next=${encodeURIComponent(next)}`
    : "/signup";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center px-4 py-10">
      <div className="mb-10 flex flex-col items-center">
        <Image
          src="/logo.png"
          alt="strikr"
          width={90}
          height={90}
          priority
          className="mb-3"
        />

        <div className="text-5xl font-semibold tracking-tight text-neutral-900">
          strikr
        </div>
      </div>

      <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Login</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Melde dich bei deinem Account an.
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

        <form method="post" action="/api/login" className="space-y-4">
          <input type="hidden" name="next" value={next} />

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-neutral-900"
            >
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={email}
              autoComplete="email"
              required
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
              placeholder="du@beispiel.de"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-neutral-900"
            >
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
              placeholder="••••••••"
            />
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-neutral-900 underline"
            >
              Passwort vergessen?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Einloggen
          </button>
        </form>

        <div className="mt-6 text-sm text-neutral-600">
          Noch kein Konto?{" "}
          <Link className="font-medium text-neutral-900 underline" href={signupHref}>
            Registrieren
          </Link>
        </div>
      </div>
    </main>
  );
}