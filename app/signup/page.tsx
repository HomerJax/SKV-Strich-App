import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

type SignupPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
    next?: string;
  }>;
};

function getBaseUrl(
  forwardedProto: string | null,
  forwardedHost: string | null,
  host: string | null
) {
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (host) {
    const isLocalhost =
      host.includes("localhost") || host.startsWith("127.0.0.1");
    return `${isLocalhost ? "http" : "https"}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function getErrorMessage(error: string | undefined) {
  switch (error) {
    case "missing_fields":
      return "Bitte E-Mail und Passwort vollständig eingeben.";
    case "password_too_short":
      return "Das Passwort muss mindestens 8 Zeichen lang sein.";
    case "email_exists":
      return "Für diese E-Mail existiert bereits ein Konto. Bitte logge dich ein oder nutze Passwort vergessen.";
    case "signup_failed":
      return "Die Registrierung konnte gerade nicht abgeschlossen werden. Bitte versuche es erneut.";
    default:
      return "";
  }
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = await searchParams;
  const headerStore = await headers();

  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = headerStore.get("host");
  const baseUrl = getBaseUrl(forwardedProto, forwardedHost, host);

  const error = resolvedSearchParams?.error;
  const success = resolvedSearchParams?.success;
  const nextValue = resolvedSearchParams?.next || "/";

  const errorMessage = getErrorMessage(error);

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[24px] border border-slate-800/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.75)]">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 px-5 py-5 text-center">
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
              Teamtage einfacher organisieren.
            </h1>

            <p className="text-xs leading-5 text-white/75 sm:text-sm">
              Planung, Teams und Ergebnisse — alles an einem Ort.
            </p>
          </div>
        </div>

        <section className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 pt-2">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl shadow-sm">
              <Image
                src="/icon-dark.png"
                alt="strikr Logo"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="text-4xl font-black tracking-tight text-slate-950">
              strikr
            </div>
          </div>

          <div className="w-full rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)]">
            <div className="mb-4 text-center">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
                Registrieren
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Erstelle dein strikr-Konto.
              </p>
            </div>

            {errorMessage ? (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            {success === "check_email" ? (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Konto erstellt. Bitte prüfe deine E-Mails und bestätige zuerst deine Adresse.
              </div>
            ) : null}

            <form method="post" action="/api/signup" className="space-y-3">
              <input type="hidden" name="next" value={nextValue} />
              <input type="hidden" name="baseUrl" value={baseUrl} />

              <div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="E-Mail"
                  className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                />
              </div>

              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="Mindestens 8 Zeichen"
                  className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                />
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Konto erstellen
              </button>

              <div className="pt-1 text-xs text-slate-600">
                Schon ein Konto?{" "}
                <Link
                  href="/"
                  className="underline underline-offset-4 hover:text-slate-950"
                >
                  Zum Login
                </Link>
              </div>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}