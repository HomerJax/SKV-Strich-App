import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import MvpFinalizeClient from "./MvpFinalizeClient";

export const dynamic = "force-dynamic";

function isMvpForceFinalizeEnabled() {
  return (
    process.env.ENABLE_MVP_FORCE_FINALIZE === "true" ||
    process.env.VERCEL_ENV !== "production"
  );
}

export default async function DevMvpFinalizePage() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect(AUTH_ROUTES.login);
  }

  if (!ctx.isPowerUser) {
    redirect(AUTH_ROUTES.dashboard);
  }

  const enabled = isMvpForceFinalizeEnabled();

  return (
    <main className="min-h-screen bg-neutral-100 text-slate-950">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/power-user"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            ← Power User
          </Link>

          <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-amber-800">
            Staging Tool
          </div>
        </div>

        {!enabled ? (
          <div className="rounded-[28px] border border-red-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
              Deaktiviert
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              MVP Test-Finalisierung ist nicht aktiviert
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Setze im Staging-Vercel-Projekt die Environment Variable{" "}
              <span className="font-mono font-bold">
                ENABLE_MVP_FORCE_FINALIZE=true
              </span>{" "}
              und deploye Staging neu.
            </p>
          </div>
        ) : (
          <MvpFinalizeClient />
        )}
      </section>
    </main>
  );
}
