import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { AUTH_ROUTES } from "@/lib/auth/routes";

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
};

export default async function SelectClubPage() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect(AUTH_ROUTES.login);
  }

  if (!ctx.player && !ctx.isPowerUser) {
    redirect(AUTH_ROUTES.onboarding);
  }

  const supabase = await createClient();

  if (!ctx.isPowerUser && !ctx.memberships.length) {
    redirect(AUTH_ROUTES.waitingForInvite);
  }

  if (!ctx.isPowerUser && ctx.memberships.length === 1 && ctx.activeClubId) {
    redirect(AUTH_ROUTES.dashboard);
  }

  const clubIds = ctx.isPowerUser
    ? null
    : ctx.memberships.map((membership) => membership.club_id);

  const clubsQuery = supabase
    .from("clubs")
    .select("id, display_name, name")
    .order("display_name", { ascending: true });

  const { data: clubs, error: clubsError } = ctx.isPowerUser
    ? await clubsQuery
    : await clubsQuery.in("id", clubIds ?? []);

  if (clubsError) {
    throw new Error(`Teams konnten nicht geladen werden: ${clubsError.message}`);
  }

  const clubRows = (clubs ?? []) as ClubRow[];

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto w-full max-w-md px-4 py-6">
        <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
            Team auswählen
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            {ctx.isPowerUser
              ? "Power User: Wähle den Verein, den du öffnen möchtest."
              : "Du bist Mitglied in mehreren Teams. Wähle aus, mit welchem Team du arbeiten möchtest."}
          </p>

          <div className="mt-5 space-y-2">
            {clubRows.map((club) => {
              const membership =
                ctx.memberships.find((item) => item.club_id === club.id) ?? null;

              return (
                <form
                  key={club.id}
                  method="post"
                  action="/api/select-club"
                >
                  <input type="hidden" name="club_id" value={club.id} />

                  <button
                    type="submit"
                    className="flex w-full items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
                  >
                    <span>{club.display_name ?? club.name ?? club.id}</span>

                    <span className="text-xs text-slate-500">
                      {ctx.isPowerUser
                        ? "Power User"
                        : membership?.role ?? "Mitglied"}
                    </span>
                  </button>
                </form>
              );
            })}
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