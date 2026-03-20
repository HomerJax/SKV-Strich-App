import Link from "next/link";
import { resetPasswordAction } from "./actions";

type SearchParams = {
  error?: string | string[];
  message?: string | string[];
};

function getSingle(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const error = getSingle(resolvedSearchParams?.error);
  const message = getSingle(resolvedSearchParams?.message);

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Neues Passwort setzen
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Lege jetzt ein neues Passwort für dein Konto fest.
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

        <form action={resetPasswordAction} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-neutral-900"
            >
              Neues Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
              placeholder="Mindestens 8 Zeichen"
            />
          </div>

          <div>
            <label
              htmlFor="password_confirm"
              className="mb-1.5 block text-sm font-medium text-neutral-900"
            >
              Passwort wiederholen
            </label>
            <input
              id="password_confirm"
              name="password_confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
              placeholder="Passwort erneut eingeben"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Passwort speichern
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