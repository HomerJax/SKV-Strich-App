import Image from "next/image";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
  updated_at?: string | null;
};

export default async function AppHeader() {
  const ctx = await getAuthContext();

  const fallbackClubId =
    ctx.activeClubId ??
    (ctx.memberships.length === 1 ? ctx.memberships[0].club_id : null);

  let clubName: string | null = null;
  let clubLogoSrc: string | null = null;

  if (ctx.user && fallbackClubId) {
    const supabase = await createClient();

    const { data: club } = await supabase
      .from("clubs")
      .select("id, display_name, logo_path, updated_at")
      .eq("id", fallbackClubId)
      .maybeSingle<ClubRow>();

    clubName = club?.display_name?.trim() || null;

    if (club?.logo_path) {
      const { data: publicUrlData } = supabase.storage
        .from("club-logos")
        .getPublicUrl(club.logo_path);

      const rawUrl = publicUrlData?.publicUrl ?? null;

      clubLogoSrc =
        rawUrl && club.updated_at
          ? `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(club.updated_at)}`
          : rawUrl;
    }
  }

  const nickname = ctx.player?.nickname?.trim() || null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image
            src="/icon-dark.png"
            alt="strikr"
            width={48}
            height={48}
            priority
            className="h-12 w-12 rounded-xl object-contain"
          />

          <div className="min-w-0">
            <div className="truncate text-2xl font-black tracking-tight text-slate-950">
              strikr
            </div>
          </div>
        </Link>

        {ctx.user ? (
          <div className="ml-4 flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <div className="truncate text-sm font-semibold text-slate-900">
                {clubName ?? "Kein Team"}
              </div>

              {nickname ? (
                <div className="truncate text-xs text-slate-500">
                  {nickname}
                </div>
              ) : null}
            </div>

            {clubLogoSrc ? (
              <img
                src={clubLogoSrc}
                alt={clubName ?? "Club Logo"}
                className="h-11 w-11 rounded-2xl border border-slate-200 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Image
                  src="/icon-dark.png"
                  alt="strikr"
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain opacity-70"
                />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}