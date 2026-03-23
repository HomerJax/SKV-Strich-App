import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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

export default async function AdminOverviewPage() {
  const cookieStore = await cookies();
  const activeClubIdFromCookie = cookieStore.get("active_club_id")?.value ?? null;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: membershipsData, error: membershipsError } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const memberships = (membershipsData ?? []) as MembershipRow[];

  if (memberships.length === 0) {
    redirect("/club-setup");
  }

  const validClubIds = new Set(memberships.map((m) => m.club_id));

  const activeClubId =
    memberships.length === 1
      ? memberships[0].club_id
      : activeClubIdFromCookie && validClubIds.has(activeClubIdFromCookie)
        ? activeClubIdFromCookie
        : null;

  if (!activeClubId) {
    redirect("/select-club");
  }

  const membership =
    memberships.find((item) => item.club_id === activeClubId) ?? null;

  if (!membership || membership.role !== "admin") {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto w-full max-w-4xl px-4 py-6">
          <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Kein Zugriff
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Dieser Bereich ist nur für Admins des aktuell ausgewählten Teams
              verfügbar.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Zur Startseite
              </Link>

              {memberships.length > 1 && (
                <Link
                  href="/select-club"
                  className="inline-flex rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"
                >
                  Team wechseln
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  const { data: clubData, error: clubError } = await supabase
    .from("clubs")
    .select("id, display_name, logo_path")
    .eq("id", activeClubId)
    .maybeSingle();

  if (clubError) {
    throw new Error(clubError.message);
  }

  const club = (clubData as ClubRow | null) ?? null;

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
        <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-500">Admin</div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
            Verwaltung
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {club?.display_name?.trim()
              ? `Admin-Bereich für ${club.display_name}.`
              : "Hier verwaltest du Spieler, Einstellungen und Club-Branding."}
          </p>

          {memberships.length > 1 && (
            <div className="mt-4">
              <Link
                href="/select-club"
                className="text-sm font-semibold text-slate-700 underline underline-offset-4"
              >
                Team wechseln
              </Link>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/admin/players"
            className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-500">Mitglieder</div>
            <div className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              Spieler
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Spieler anlegen, bearbeiten und aktiv/inaktiv setzen.
            </p>
          </Link>

          <Link
            href="/admin/settings"
            className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-500">Setup</div>
            <div className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              Einstellungen
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Optionen für Teamgenerator, Kategorien und Club-Logik.
            </p>
          </Link>

          <Link
            href="/admin/club"
            className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-500">Branding</div>
            <div className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              Club
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Vereinsname und Logo für den Header der App verwalten.
            </p>
          </Link>
        </div>

        <div className="flex">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            Zur Startseite
          </Link>
        </div>
      </section>
    </main>
  );
}