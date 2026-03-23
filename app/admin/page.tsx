import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
};

export default async function AdminPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // read only
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const activeClubId = cookieStore.get("active_club_id")?.value ?? null;

  const { data: memberships } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id);

  const typedMemberships = (memberships ?? []) as MembershipRow[];

  if (typedMemberships.length === 0) {
    redirect("/club-setup");
  }

  let activeMembership: MembershipRow | null = null;

  if (activeClubId) {
    activeMembership =
      typedMemberships.find((membership) => membership.club_id === activeClubId) ??
      null;
  }

  if (!activeMembership && typedMemberships.length === 1) {
    activeMembership = typedMemberships[0];
  }

  if (!activeMembership) {
    redirect("/select-club");
  }

  if (activeMembership.role !== "admin") {
    redirect("/");
  }

  const { data: club } = await supabase
    .from("clubs")
    .select("id, display_name, logo_path")
    .eq("id", activeMembership.club_id)
    .maybeSingle();

  const typedClub = (club ?? null) as ClubRow | null;

  return (
    <main className="min-h-screen bg-neutral-100 pb-24">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[24px] border border-slate-800/10 bg-white shadow-sm">
          <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Adminbereich
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {typedClub?.display_name ?? "Team verwalten"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Verwalte Spieler, Einstellungen und Club-Branding für den aktuell
                aktiven Club.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              Rolle im aktiven Club: Admin
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/admin/players"
            className="rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-900">Spieler</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Spieler verwalten, Rollen prüfen und Gastspieler sinnvoll im Teamkontext
              pflegen.
            </p>
          </Link>

          <Link
            href="/admin/settings"
            className="rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-900">Einstellungen</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Saisonlogik, Kategorien, Positionslabels und Teamgenerator-Optionen
              für diesen Club anpassen.
            </p>
          </Link>

          <Link
            href="/admin/club"
            className="rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-900">Club & Branding</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Clubname, Logo und visuelle Darstellung des aktuell aktiven Clubs
              verwalten.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}