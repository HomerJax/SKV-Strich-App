import Image from "next/image";
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

type ClubOption = {
  id: string;
  display_name: string;
  logo_url: string | null;
  role: "admin" | "member";
};

export default async function SelectClubPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/select-club");
  }

  const { data: membershipData, error: membershipError } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const memberships = (membershipData ?? []) as MembershipRow[];

  if (memberships.length === 0) {
    redirect("/club-setup");
  }

  if (memberships.length === 1) {
    redirect("/");
  }

  const clubIds = memberships.map((m) => m.club_id);

  const { data: clubsData, error: clubsError } = await supabase
    .from("clubs")
    .select("id, display_name, logo_path")
    .in("id", clubIds);

  if (clubsError) {
    throw new Error(clubsError.message);
  }

  const clubs = (clubsData ?? []) as ClubRow[];

  const clubsById = new Map<string, ClubRow>();
  clubs.forEach((club) => clubsById.set(club.id, club));

  const clubOptions: ClubOption[] = memberships.map((membership) => {
    const club = clubsById.get(membership.club_id);

    let logoUrl: string | null = null;

    if (club?.logo_path) {
      const { data } = supabase.storage
        .from("club-logos")
        .getPublicUrl(club.logo_path);

      logoUrl = data.publicUrl || null;
    }

    return {
      id: membership.club_id,
      display_name: club?.display_name || "Dein Team",
      logo_url: logoUrl,
      role: membership.role,
    };
  });

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[24px] border border-slate-800/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.75)]">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-5 py-6 text-center">
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
              Wähle dein Team.
            </h1>

            <p className="text-xs leading-5 text-white/75 sm:text-sm">
              Du bist mehreren Clubs zugeordnet. Wähle aus, mit welchem Team du
              jetzt arbeiten möchtest.
            </p>
          </div>
        </div>

        <section className="mx-auto w-full max-w-3xl">
          <div className="grid gap-3 sm:grid-cols-2">
            {clubOptions.map((club) => (
              <form
                key={club.id}
                method="post"
                action="/api/select-club"
                className="rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)]"
              >
                <input type="hidden" name="club_id" value={club.id} />

                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5">
                    {club.logo_url ? (
                      <Image
                        src={club.logo_url}
                        alt={`${club.display_name} Logo`}
                        width={64}
                        height={64}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="h-full w-full rounded-xl bg-slate-100" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-bold tracking-tight text-slate-950">
                      {club.display_name}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Rolle: {club.role === "admin" ? "Admin" : "Mitglied"}
                    </div>
                  </div>
                </div>

                <button className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Mit diesem Team öffnen
                </button>
              </form>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}