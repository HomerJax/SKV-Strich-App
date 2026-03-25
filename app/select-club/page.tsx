import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export default async function SelectClubPage() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect(AUTH_ROUTES.login);
  }

  if (!ctx.player) {
    redirect(AUTH_ROUTES.onboarding);
  }

  if (!ctx.memberships.length) {
    redirect(AUTH_ROUTES.waitingForInvite);
  }

  if (ctx.memberships.length === 1) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto w-full max-w-md px-4 py-6">
        <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
            Team auswählen
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Du bist Mitglied in mehreren Teams. Wähle aus, mit welchem Team du
            arbeiten möchtest.
          </p>

          <div className="mt-5 space-y-2">
            {ctx.memberships.map((membership) => (
              <form
                key={membership.club_id}
                method="post"
                action={AUTH_ROUTES.selectClub}
              >
                <input
                  type="hidden"
                  name="club_id"
                  value={membership.club_id}
                />

                <button
                  type="submit"
                  className="flex w-full items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
                >
                  <span>Team</span>

                  <span className="text-xs text-slate-500">
                    {membership.role}
                  </span>
                </button>
              </form>
            ))}
          </div>

          <div className="mt-6">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              ← Zurück
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}