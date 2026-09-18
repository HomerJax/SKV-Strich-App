"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";

type LoginFormProps = {
  initialEmail?: string;
  initialError?: string;
  initialNext?: string;
};

function getErrorMessage(error: string) {
  switch (error) {
    case "missing-fields":
      return "Bitte gib E-Mail und Passwort ein.";
    case "invalid-credentials":
      return "E-Mail oder Passwort ist nicht korrekt.";
    case "session-not-ready":
      return "Die Anmeldung wurde verarbeitet, aber die Session war noch nicht bereit. Bitte versuche es erneut.";
    default:
      return initialErrorMessage(error);
  }
}

function initialErrorMessage(error: string) {
  return error || "";
}

export default function LoginForm({
  initialEmail = "",
  initialError = "",
  initialNext = "",
}: LoginFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [hasEditedSinceSubmit, setHasEditedSinceSubmit] = useState(false);

  const activeErrorCode = hasEditedSinceSubmit ? "" : initialError || "";

  const errorMessage = useMemo(
    () => getErrorMessage(activeErrorCode),
    [activeErrorCode]
  );

  const signupHref = initialNext
    ? `/signup?next=${encodeURIComponent(initialNext)}`
    : "/signup";

  const forgotPasswordHref = initialNext
    ? `/login/forgot-password?email=${encodeURIComponent(email)}&next=${encodeURIComponent(initialNext)}`
    : `/login/forgot-password?email=${encodeURIComponent(email)}`;

  const isTeamStart = initialNext.includes("club-setup");

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_10%,rgba(34,211,238,.10),transparent_28%),radial-gradient(circle_at_86%_14%,rgba(124,58,237,.12),transparent_30%),#f5f7fb]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-6 sm:px-6 sm:py-10">
        <div className="grid w-full gap-5 lg:grid-cols-[1.02fr_.98fr]">
          <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#070b12] p-6 text-white shadow-[0_30px_90px_rgba(2,6,23,.25)] sm:p-8 lg:min-h-[600px]">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-0 h-60 w-60 rounded-full bg-cyan-400/15 blur-3xl" />

            <div className="relative flex h-full flex-col">
              <div className="flex items-center gap-3">
                <Image
                  src="/icon-light.png"
                  alt="strikr"
                  width={48}
                  height={48}
                  priority
                  className="h-12 w-12 rounded-2xl"
                />
                <div>
                  <div className="text-lg font-black tracking-[-.04em]">strikr</div>
                  <div className="text-[9px] font-black uppercase tracking-[.2em] text-white/35">
                    Training redefined.
                  </div>
                </div>
              </div>

              <div className="my-auto py-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  {isTeamStart ? "Weiter mit deinem Team" : "Willkommen zurück"}
                </div>

                <h1 className="mt-5 max-w-xl text-4xl font-black leading-[.98] tracking-[-.055em] sm:text-5xl">
                  {isTeamStart ? (
                    <>
                      Einloggen.
                      <span className="block bg-gradient-to-r from-white via-cyan-200 to-violet-300 bg-clip-text text-transparent">
                        Team starten.
                      </span>
                    </>
                  ) : (
                    <>
                      Weiter
                      <span className="block bg-gradient-to-r from-white via-cyan-200 to-violet-300 bg-clip-text text-transparent">
                        bei strikr.
                      </span>
                    </>
                  )}
                </h1>

                <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-white/58 sm:text-base">
                  {isTeamStart
                    ? "Nach dem Login landest du direkt im Team-Setup. Kein Umweg, kein Admin-Chaos."
                    : "Melde dich an und steig direkt wieder in deinen Club ein."}
                </p>

                {isTeamStart ? (
                  <div className="mt-8 space-y-3">
                    {[
                      "Club in wenigen Minuten startklar",
                      "Faire Teams direkt konfigurieren",
                      "Mannschaft anschließend per Link reinholen",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3 text-sm font-bold text-white/75">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/20">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        {item}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">
                Jedes Training zählt.
              </div>
            </div>
          </div>

          <div className="flex items-center rounded-[34px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,.10)] sm:p-8">
            <div className="mx-auto w-full max-w-md">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-600">
                {isTeamStart ? "Account vorhanden" : "Login"}
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-neutral-950">
                Einloggen.
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-neutral-500">
                {isTeamStart
                  ? "Danach öffnet sich direkt dein Team-Setup."
                  : "Schön, dass du wieder da bist."}
              </p>

              {errorMessage ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <form
                action="/api/login"
                method="post"
                onSubmit={() => setHasEditedSinceSubmit(false)}
                className="mt-7 space-y-4"
              >
                <input type="hidden" name="next" value={initialNext} />

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[.12em] text-neutral-500">
                    E-Mail
                  </span>
                  <input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setHasEditedSinceSubmit(true);
                    }}
                    required
                    autoComplete="email"
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-base outline-none transition placeholder:text-neutral-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                    placeholder="du@beispiel.de"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-[.12em] text-neutral-500">
                      Passwort
                    </span>
                    <Link
                      href={forgotPasswordHref}
                      className="text-xs font-bold text-neutral-500 hover:text-neutral-900"
                    >
                      Vergessen?
                    </Link>
                  </div>
                  <input
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setHasEditedSinceSubmit(true);
                    }}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-base outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  />
                </label>

                <button
                  type="submit"
                  className="group mt-2 flex w-full items-center justify-between rounded-2xl bg-slate-950 px-5 py-4 text-left text-white shadow-[0_12px_30px_rgba(15,23,42,.16)] transition hover:-translate-y-0.5 hover:bg-slate-900"
                >
                  <span>
                    <span className="block text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">
                      {isTeamStart ? "Weiter zum Setup" : "Weiter"}
                    </span>
                    <span className="mt-0.5 block text-base font-black">Einloggen</span>
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-950 transition group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </form>

              <div className="mt-6 text-center text-sm font-medium text-neutral-500">
                Noch kein Account?{" "}
                <Link
                  href={signupHref}
                  className="font-black text-neutral-900 hover:underline"
                >
                  Jetzt registrieren
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );}
}