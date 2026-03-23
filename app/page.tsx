import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
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

function getBaseUrl(
  forwardedProto: string | null,
  forwardedHost: string | null,
  host: string | null
) {
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (host) {
    const isLocalhost =
      host.includes("localhost") || host.startsWith("127.0.0.1");
    return `${isLocalhost ? "http" : "https"}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const activeClubIdFromCookie = cookieStore.get("active_club_id")?.value ?? null;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no-op
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = headerStore.get("host");
  const baseUrl = getBaseUrl(forwardedProto, forwardedHost, host);

  let clubName = "Dein Team";
  let clubLogoUrl: string | null = null;
  let hasMultipleClubs = false;

  if (user?.id && user.email) {
    const { error: autoLinkError } = await supabase.rpc(
      "link_existing_player_by_email",
      {
        p_user_id: user.id,
        p_email: user.email,
      }
    );

    if (autoLinkError) {
      console.error("Auto-link on home failed", autoLinkError);
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

    hasMultipleClubs = memberships.length > 1;

    const validClubIds = new Set(memberships.map((m) => m.club_id));

    let activeClubId =
      memberships.length === 1
        ? memberships[0].club_id
        : activeClubIdFromCookie && validClubIds.has(activeClubIdFromCookie)
          ? activeClubIdFromCookie
          : null;

    if (!activeClubId) {
      redirect("/select-club");
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

    if (club) {
      clubName = club.display_name || "Dein Team";

      if (club.logo_path) {
        const { data: publicUrlData } = supabase.storage
          .from("club-logos")
          .getPublicUrl(club.logo_path);

        clubLogoUrl = publicUrlData.publicUrl || null;
      }
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[24px] border border-slate-800/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.75)]">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-5 py-6 text-center">
            {user && (
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-3 py-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
                  {clubLogoUrl ? (
                    <Image
                      src={clubLogoUrl}
                      alt={`${clubName} Logo`}
                      width={48}
                      height={48}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="h-full w-full rounded-md bg-slate-200" />
                  )}
                </div>
                <span className="max-w-[200px] truncate text-sm font-semibold text-white sm:max-w-none sm:text-base">
                  {clubName}
                </span>
              </div>
            )}

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
              Teamtage einfacher organisieren.
            </h1>

            <p className="text-xs leading-5 text-white/75 sm:text-sm">
              Planung, Teams und Ergebnisse — alles an einem Ort.
            </p>
          </div>
        </div>

        {!user ? (
          <section className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 pt-2">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl shadow-sm">
                <Image
                  src="/icon-dark.png"
                  alt="strikr Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              <div className="text-4xl font-black tracking-tight text-slate-950">
                strikr
              </div>
            </div>

            <div className="w-full rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)]">
              <div className="mb-4 text-center">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
                  Login
                </h2>
              </div>

              <form method="post" action="/api/login" className="space-y-3">
                <input type="hidden" name="next" value={baseUrl} />

                <input
                  name="email"
                  type="email"
                  required
                  placeholder="E-Mail"
                  className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm"
                />

                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Passwort"
                  className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm"
                />

                <button className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
                  Einloggen
                </button>

                <div className="flex justify-between text-xs">
                  <Link href="/forgot-password">Passwort vergessen</Link>
                  <Link href="/signup">Registrieren</Link>
                </div>
              </form>
            </div>
          </section>
        ) : (
          <section className="mx-auto flex w-full max-w-2xl flex-col gap-3 pt-2">
            <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-500">
                    Start
                  </div>

                  <h2 className="mt-1 text-2xl font-extrabold text-slate-950">
                    Starte mit einer Trainingssession
                  </h2>

                  <p className="mt-2 text-sm text-slate-600">
                    Erstelle eine neue Session oder springe direkt in eure
                    Trainings und Tabellen.
                  </p>
                </div>

                <div className="relative h-12 w-12 rounded-2xl bg-neutral-100">
                  <Image
                    src="/icon-dark.png"
                    alt="strikr Logo"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/sessions/new"
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Trainingssession starten
                </Link>

                <Link
                  href="/sessions"
                  className="rounded-xl border px-4 py-2.5 text-center text-sm font-semibold"
                >
                  Sessions ansehen
                </Link>

                <Link
                  href="/standings"
                  className="rounded-xl border px-4 py-2.5 text-center text-sm font-semibold"
                >
                  Tabelle ansehen
                </Link>
              </div>

              {hasMultipleClubs && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <Link
                    href="/select-club"
                    className="text-sm font-semibold text-slate-700 underline underline-offset-4"
                  >
                    Team wechseln
                  </Link>
                </div>
              )}
            </div>

            <a
              href="mailto:mb1607@gmx.de?subject=strikr%20Feedback"
              className="rounded-[24px] border border-black/10 bg-white p-5 text-sm shadow"
            >
              Feedback oder Probleme? → Mail senden
            </a>
          </section>
        )}
      </section>
    </main>
  );
}