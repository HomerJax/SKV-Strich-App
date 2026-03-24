import Link from "next/link";
import { requireAppAccess } from "@/lib/auth/gate";

export default async function WaitingForInvitePage() {
  await requireAppAccess({
    allowWaitingForInvite: true,
  });

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white">
              ⚽
            </div>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950">
              Du bist noch keinem Team zugeordnet
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Dein Profil ist bereits angelegt. Du kannst jetzt entweder auf eine
              Einladung warten oder selbst direkt ein Team erstellen.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/club-setup"
                className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Team erstellen
              </Link>

              <Link
                href="/logout"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Logout
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}