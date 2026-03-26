import Image from "next/image";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

type ClubRow = {
  id: string;
  display_name: string | null;
  name: string | null;
  logo_path: string | null;
};

export default async function AppHeader() {
  const ctx = await getAuthContext();

  const fallbackClubId =
    ctx.activeClubId ??
    (ctx.memberships.length === 1 ? ctx.memberships[0].club_id : null);

  let clubName: string | null = null;
  let logoSrc: string | null = null;

  if (ctx.user && fallbackClubId) {
    const supabase = await createClient();

    const { data: club } = await supabase
      .from("clubs")
      .select("id, display_name, name, logo_path")
      .eq("id", fallbackClubId)
      .maybeSingle<ClubRow>();

    clubName = club?.display_name ?? club?.name ?? null;

    if (club?.logo_path) {
      const { data } = supabase.storage
        .from("club-logos")
        .getPublicUrl(club.logo_path);

      logoSrc = data?.publicUrl ?? null;
    }
  }

  const nickname = ctx.player?.nickname?.trim() || null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
        
        {/* LEFT: LOGO */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/icon-dark.png"
            alt="strikr"
            width={44}
            height={44}
            className="rounded-xl"
            priority
          />

          <div className="text-xl font-black tracking-tight text-slate-950">
            strikr
          </div>
        </Link>

        {/* RIGHT: USER + CLUB */}
        {ctx.user && (
          <div className="flex items-center gap-3">
            
            {/* USER INFO */}
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-slate-900">
                {nickname ?? "Spieler"}
              </div>
            </div>

            {/* CLUB LOGO (EDLE VARIANTE) */}
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={clubName ?? "Club Logo"}
                  className="h-full w-full object-contain p-1.5"
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
  );
}