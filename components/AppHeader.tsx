import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const HIDDEN_ON_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/join",
];

type AppHeaderProps = {
  pathname?: string;
};

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type ClubRow = {
  display_name: string | null;
  logo_path: string | null;
};

export default async function AppHeader({ pathname }: AppHeaderProps) {
  const hidden = pathname
    ? HIDDEN_ON_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
      )
    : false;

  if (hidden) {
    return null;
  }

  const cookieStore = await cookies();

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

  let clubLogoUrl: string | null = null;

  if (user) {
    const { data: membershipData } = await supabase
      .from("club_memberships")
      .select("club_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const membership = (membershipData as MembershipRow | null) ?? null;

    if (membership) {
      const { data: clubData } = await supabase
        .from("clubs")
        .select("display_name, logo_path")
        .eq("id", membership.club_id)
        .maybeSingle();

      const club = (clubData as ClubRow | null) ?? null;

      if (club?.logo_path) {
        const { data: publicUrlData } = supabase.storage
          .from("club-logos")
          .getPublicUrl(club.logo_path);

        clubLogoUrl = publicUrlData.publicUrl || null;
      }
    }
  }

  return (
    <header className="w-full border-b border-black/10 bg-white px-3 py-3">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <Image
            src="/icon-dark.png"
            alt="strikr"
            width={36}
            height={36}
            className="h-9 w-9 rounded-md"
          />
          <span className="text-xl font-bold tracking-tight text-slate-950">
            strikr
          </span>
        </Link>

        <div className="flex shrink-0 items-center justify-end">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white p-1 shadow-sm sm:h-12 sm:w-12">
            {clubLogoUrl ? (
              <Image
                src={clubLogoUrl}
                alt="Club Logo"
                width={48}
                height={48}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="h-full w-full rounded-md bg-neutral-100" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}