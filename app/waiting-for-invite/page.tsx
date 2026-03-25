import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export default async function WaitingForInvitePage() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect(AUTH_ROUTES.login);
  }

  if (!ctx.player) {
    redirect(AUTH_ROUTES.onboarding);
  }

  if (ctx.memberships.length > 0) {
    if (ctx.activeClubId) {
      redirect(AUTH_ROUTES.dashboard);
    }

    redirect(AUTH_ROUTES.selectClub);
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full rounded-[32px] border border-black/10 bg-white p-8 shadow-sm sm:p-10">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-slate-950 shadow-sm">
              <Image
                src="/icon-dark.png"
                alt="strikr Logo"
                width={42}
                height={42}
                className="h-10 w-10 object-contain"
                priority
              />
            </div>

            <div className="mt-5">
              <div className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                strikr
              </div>
              <div className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Noch keinem Team zugeordnet
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              Dein Profil ist bereits angelegt. Du kannst jetzt entweder auf eine
              Einladung warten oder direkt dein eigenes Team erstellen.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
              Sobald dich ein Admin eingeladen hat, kommst du nach dem nächsten
              Login oder Seitenaufruf automatisch weiter.
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/club-setup"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Eigenes Team erstellen
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Später erneut anmelden
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}