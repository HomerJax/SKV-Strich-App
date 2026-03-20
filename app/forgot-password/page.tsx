import Link from "next/link";
import { forgotPasswordAction } from "./actions";

type SearchParams = {
  message?: string | string[];
  error?: string | string[];
  email?: string | string[];
};

function getSingle(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? undefined : undefined;
  void resolvedSearchParams;

  const message = getSingle(
    (searchParams as SearchParams | undefined)?.message
  );
  const error = getSingle((searchParams as SearchParams | undefined)?.error);
  const email = getSingle((searchParams as SearchParams | undefined)?.email);

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Passwort vergessen
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link, mit dem
            du dein Passwort neu setzen kannst.
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

        <form action={forgotPasswordAction} className="space-y-4">
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
              required
              autoComplete="email"
              defaultValue={email}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
              placeholder="du@beispiel.de"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Reset-Link senden
          </button>
        </form>

        <div className="mt-6 text-sm text-neutral-600">
          <Link className="font-medium text-neutral-900 underline" href="/login">
            Zurück zum Login
          </Link>
        </div>
      </div>
    </main>
  );
}