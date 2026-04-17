import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import MobileUserMenu from "@/components/MobileUserMenu";
import ClubSwitcher, {
  type ClubSwitcherClub,
} from "@/components/PowerClubSwitcher";

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
  logo_path: string | null;
  primary_color: string | null;
};

const COLOR_MAP: Record<string, string> = {
  black: "#020617",
  blue: "#1d4ed8",
  red: "#dc2626",
  green: "#16a34a",
};

function getInitial(value: string | null) {
  if (!value) return "P";
  return value.trim().charAt(0).toUpperCase();
}

function getClubLabel(club: ClubRow | null | undefined) {
  const displayName = club?.display_name?.trim();
  const legacyName = club?.name?.trim();
  return displayName || legacyName || "Unbenannter Verein";
}

function dedupeSwitcherClubs(
  clubs: ClubSwitcherClub[],
  activeClubId: string | null,
  activeClubName: string | null,
  activeLogoSrc: string | null
) {
  const byId = new Map<string, ClubSwitcherClub>();

  for (const club of clubs) {
    const existing = byId.get(club.id);
    const isActive = activeClubId !== null && club.id === activeClubId;

    const nextClub: ClubSwitcherClub = {
      id: club.id,
      name: isActive && activeClubName ? activeClubName : club.name,
      logoSrc: isActive ? activeLogoSrc ?? club.logoSrc : club.logoSrc,
    };

    if (!existing) {
      byId.set(club.id, nextClub);
      continue;
    }

    const existingHasNoLogo = !existing.logoSrc && !!nextClub.logoSrc;
    const shouldPreferNextName =
      isActive && activeClubName && existing.name !== activeClubName;

    if (shouldPreferNextName || existingHasNoLogo) {
      byId.set(club.id, {
        id: existing.id,
        name: shouldPreferNextName ? nextClub.name : existing.name,
        logoSrc: existingHasNoLogo ? nextClub.logoSrc : existing.logoSrc,
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "de", { sensitivity: "base" })
  );
}

export default async function AppHeader() {
  const ctx = await getAuthContext();

  const activeClubId =
    ctx.activeClubId ??
    (!ctx.isPowerUser && ctx.memberships.length === 1
      ? ctx.memberships[0].club_id
      : null);

  let clubName: string | null = null;
  let logoSrc: string | null = null;
  let primaryColor = COLOR_MAP.black;
  let showPlayerStatsLink = false;
  let switcherClubs: ClubSwitcherClub[] = [];

  if (ctx.user) {
    const supabase = await createClient();

    const membershipClubIds = Array.from(
      new Set(ctx.memberships.map((membership) => membership.club_id))
    );

    const activeClubPromise = activeClubId
      ? supabase
          .from("clubs")
          .select("id, display_name, name, logo_path, primary_color")
          .eq("id", activeClubId)
          .maybeSingle<ClubRow>()
      : Promise.resolve({ data: null, error: null });

    const flagsPromise = activeClubId
      ? getFeatureFlagsForClub(activeClubId)
      : Promise.resolve({ player_stats_overview: false });

    const visibleClubsPromise = ctx.isPowerUser
      ? supabase
          .from("clubs")
          .select("id, display_name, name, logo_path, primary_color")
          .order("display_name", { ascending: true })
          .returns<ClubRow[]>()
      : membershipClubIds.length > 0
        ? supabase
            .from("clubs")
            .select("id, display_name, name, logo_path, primary_color")
            .in("id", membershipClubIds)
            .order("display_name", { ascending: true })
            .returns<ClubRow[]>()
        : Promise.resolve({ data: [], error: null });

    const [{ data: club }, flags, { data: visibleClubs }] = await Promise.all([
      activeClubPromise,
      flagsPromise,
      visibleClubsPromise,
    ]);

    clubName = club ? getClubLabel(club) : null;
    primaryColor = COLOR_MAP[club?.primary_color ?? "black"] ?? COLOR_MAP.black;
    showPlayerStatsLink = Boolean(flags.player_stats_overview);

    if (club?.logo_path) {
      const { data } = supabase.storage
        .from("club-logos")
        .getPublicUrl(club.logo_path);

      logoSrc = data?.publicUrl ?? null;
    }

    if (visibleClubs?.length) {
      const mappedClubs: ClubSwitcherClub[] = visibleClubs.map((clubRow) => {
        let clubLogoSrc: string | null = null;

        if (clubRow.logo_path) {
          const { data } = supabase.storage
            .from("club-logos")
            .getPublicUrl(clubRow.logo_path);

          clubLogoSrc = data?.publicUrl ?? null;
        }

        return {
          id: clubRow.id,
          name: getClubLabel(clubRow),
          logoSrc: clubLogoSrc,
        };
      });

      switcherClubs = dedupeSwitcherClubs(
        mappedClubs,
        activeClubId,
        clubName,
        logoSrc
      );
    }
  }

  const nickname = ctx.player?.nickname?.trim() || null;
  const firstName = ctx.player?.first_name?.trim() || null;
  const profileLabel = nickname ?? firstName ?? "Spieler";
  const profileInitial = getInitial(profileLabel);

  return (
    <>
      <Script id="strikr-club-primary-color" strategy="afterInteractive">
        {`document.documentElement.style.setProperty('--club-primary', '${primaryColor}');`}
      </Script>

      <header
        style={{ borderTop: `3px solid ${primaryColor}` }}
        className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur"
      >
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="min-w-0 flex items-center gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <Image
                src="/icon-dark.png"
                alt="strikr"
                width={44}
                height={44}
                className="shrink-0 rounded-xl"
                priority
              />

              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-xl font-black tracking-tight text-slate-950">
                    strikr
                  </span>

                  {ctx.user ? (
                    <span className="text-[11px] text-slate-400">v0.3</span>
                  ) : null}
                </div>
              </div>
            </Link>
          </div>

          {ctx.user ? (
            <div className="flex shrink-0 items-center gap-2">
              <MobileUserMenu
                profileLabel={profileLabel}
                showPlayerStatsLink={showPlayerStatsLink}
              />

              <div className="hidden items-center gap-2 sm:flex">
                {showPlayerStatsLink ? (
                  <Link
                    href="/stats"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Meine Stats
                  </Link>
                ) : null}

                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm transition hover:bg-slate-50"
                >
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                    {profileInitial}
                  </div>

                  <div className="min-w-0 text-left leading-tight">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {profileLabel}
                    </div>
                    <div className="truncate text-[11px] text-slate-500">
                      Profil
                    </div>
                  </div>
                </Link>
              </div>

              <ClubSwitcher
                isPowerUser={ctx.isPowerUser}
                activeClubId={activeClubId}
                activeClubName={clubName}
                activeLogoSrc={logoSrc}
                primaryColor={primaryColor}
                clubs={switcherClubs}
                canCreateClub={true}
                createClubHref="/create-club"
              />
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/login"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Team starten
              </Link>
            </div>
          )}
        </div>
      </header>
    </>
  );
}