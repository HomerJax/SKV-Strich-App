import Image from "next/image";
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

export default async function HomePage() {
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

  const { data: memberships } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id);

  const typedMemberships = (memberships ?? []) as MembershipRow[];

  if (typedMemberships.length === 0) {
    redirect("/club-setup");
  }

  const activeClubIdFromCookie = cookieStore.get("active_club_id")?.value ?? null;

  let activeClubId: string | null = null;

  if (
    activeClubIdFromCookie &&
    typedMemberships.some((membership) => membership.club_id === activeClubIdFromCookie)
  ) {
    activeClubId = activeClubIdFromCookie;
  } else if (typedMemberships.length === 1) {
    activeClubId = typedMemberships[0].club_id;
  } else {
    redirect("/select-club");
  }

  const { data: club } = await supabase
    .from("clubs")
    .select("id, display_name, logo_path")
    .eq("id", activeClubId)
    .maybeSingle();

  const typedClub = (club ?? null) as ClubRow | null;

  let clubLogoUrl: string | null = null;

  if (typedClub?.logo_path) {
    const { data: signedLogo } = await supabase.storage
      .from("club-logos")
      .createSignedUrl(typedClub.logo_path, 60 * 60);

    clubLogoUrl = signedLogo?.signedUrl ?? null;
  }

  return (
    <main className="min-h-screen bg-neutral-100 pb-24">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] border border-slate-800/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(135deg,#0b1220_0%,#0f172a_45%,#111827_100%)] shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
          <div className="flex flex-col items-center gap-5 px-6 py-8 text-center sm:px-8 sm:py-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2 shadow-sm">
                {clubLogoUrl ? (
                  <Image
                    src={clubLogoUrl}
                    alt={typedClub?.display_name ?? "Clublogo"}
                    width={48}
                    height={48}
                    className="h-10 w-10 object-contain"
                  />
                ) : (
                  <Image
                    src="/icon-dark.png"
                    alt="strikr"
                    width={40}
                    height={40}
                    className="h-8 w-8 object-contain"
                  />
                )}
              </div>

              <span className="text-sm font-semibold text-white sm:text-base">
                {typedClub?.display_name ?? "Dein Team"}
              </span>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <Image
                src="/icon-dark.png"
                alt="strikr"
                width={28}
                height={28}
                className="h-7 w-7 object-contain invert"
              />
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Teamtage einfacher organisieren.
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base">
                Planung, Teams und Ergebnisse — alles an einem Ort.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-800/10 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-slate-500">Start</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Starte mit einer Trainingssession
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Erstelle eine neue Session oder springe direkt in eure Trainings und
            Tabellen.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sessions/new"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Trainingssession starten
            </Link>

            <Link
              href="/sessions"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Sessions ansehen
            </Link>

            <Link
              href="/standings"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Tabelle ansehen
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}