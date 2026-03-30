import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";

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

export default async function AppHeader() {
  const ctx = await getAuthContext();

  const fallbackClubId =
    ctx.activeClubId ??
    (ctx.memberships.length === 1 ? ctx.memberships[0].club_id : null);

  let clubName: string | null = null;
  let logoSrc: string | null = null;
  let primaryColor = COLOR_MAP.black;
  let showPlayerStatsLink = false;

  if (ctx.user && fallbackClubId) {
    const supabase = await createClient();

    const [{ data: club }, flags] = await Promise.all([
      supabase
        .from("clubs")
        .select("id, display_name, name, logo_path, primary_color")
        .eq("id", fallbackClubId)
        .maybeSingle<ClubRow>(),
      getFeatureFlagsForClub(fallbackClubId),
    ]);

    clubName = club?.display_name ?? club?.name ?? null;
    primaryColor = COLOR_MAP[club?.primary_color ?? "black"] ?? COLOR_MAP.black;
    showPlayerStatsLink = flags.player_stats_overview;

    if (club?.logo_path) {
      const { data } = supabase.storage
        .from("club-logos")
        .getPublicUrl(club.logo_path);

      logoSrc = data?.publicUrl ?? null;
    }
  }

  const nickname = ctx.player?.nickname?.trim() || null;

  return (
    <>
      <Script id="strikr-club-primary-color" strategy="afterInteractive">
        {`document.documentElement.style.setProperty('--club-primary', '${primaryColor}');`}
      </Script>

      <header
        style={{ borderTop: `3px solid ${primaryColor}` }}
        className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur"
      >
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/icon-dark.png"
                alt="strikr"
                width={44}
                height={44}
                className="rounded-xl"
                priority
              />

              <span className="text-xl font-black tracking-tight text-slate-950">
                strikr
              </span>
            </Link>

            <Link
              href="/about"
              className="mt-3 text-[11px] text-slate-400 transition hover:text-slate-700"
            >
              v0.3
            </Link>
          </div>

          {ctx.user && (
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 sm:flex">
                {showPlayerStatsLink ? (
                  <Link
                    href="/stats"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Meine Stats
                  </Link>
                ) : null}

                <Link href="/profile" className="text-right">
                  <div className="text-sm font-semibold text-slate-900 transition hover:text-slate-600">
                    {nickname ?? "Spieler"}
                  </div>
                </Link>
              </div>

              <div
                className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border bg-white shadow-md"
                style={{ borderColor: `${primaryColor}33` }}
              >
                {logoSrc ? (
                  <Image
                    src={logoSrc}
                    alt={clubName ?? "Club Logo"}
                    fill
                    sizes="48px"
                    className="object-contain p-1.5"
                  />
                ) : (
                  <Image
                    src="/icon-dark.png"
                    alt="strikr"
                    width={28}
                    height={28}
                    className="opacity-70"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}