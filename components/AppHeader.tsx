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
];

type AppHeaderProps = {
  pathname?: string;
};

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
};

type PlayerRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  name: string | null;
  email: string | null;
};

function getUserLabel(player: PlayerRow | null, email: string | null) {
  const nickname = player?.nickname?.trim();
  if (nickname) return nickname;

  const firstName = player?.first_name?.trim();
  const lastName = player?.last_name?.trim();

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;

  const fallbackName = player?.name?.trim();
  if (fallbackName) return fallbackName;

  return email ?? "Eingeloggt";
}

function getInitials(label: string) {
  const parts = label
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "U";
  }

  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

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
        setAll() {
          // read only
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let club: ClubRow | null = null;
  let player: PlayerRow | null = null;
  let clubLogoUrl: string | null = null;

  if (user) {
    const activeClubId = cookieStore.get("active_club_id")?.value ?? null;

    const { data: memberships } = await supabase
      .from("club_memberships")
      .select("club_id, role")
      .eq("user_id", user.id);

    const typedMemberships = (memberships ?? []) as MembershipRow[];

    let resolvedClubId: string | null = activeClubId;

    if (!resolvedClubId && typedMemberships.length === 1) {
      resolvedClubId = typedMemberships[0].club_id;
    }

    if (resolvedClubId) {
      const [{ data: clubData }, { data: playerData }] = await Promise.all([
        supabase
          .from("clubs")
          .select("id, display_name, logo_path")
          .eq("id", resolvedClubId)
          .maybeSingle(),
        supabase
          .from("players")
          .select("id, first_name, last_name, nickname, name, email")
          .eq("club_id", resolvedClubId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      club = (clubData ?? null) as ClubRow | null;
      player = (playerData ?? null) as PlayerRow | null;

      if (club?.logo_path) {
        const { data: signedLogo } = await supabase.storage
          .from("club-logos")
          .createSignedUrl(club.logo_path, 60 * 60);

        clubLogoUrl = signedLogo?.signedUrl ?? null;
      }
    }
  }

  const userLabel = getUserLabel(player, user?.email ?? null);
  const initials = getInitials(userLabel);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/icon-dark.png"
            alt="strikr"
            width={40}
            height={40}
            priority
            className="h-10 w-10 rounded-xl object-contain"
          />
          <span className="text-xl font-semibold tracking-tight text-neutral-950">
            strikr
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-2">
            <div className="flex max-w-[180px] items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-neutral-800">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                {initials}
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{userLabel}</div>
                {user.email ? (
                  <div className="truncate text-[11px] text-neutral-500">
                    {user.email}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
              {clubLogoUrl ? (
                <Image
                  src={clubLogoUrl}
                  alt={club?.display_name ?? "Clublogo"}
                  width={34}
                  height={34}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <Image
                  src="/icon-dark.png"
                  alt="strikr"
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain opacity-70"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
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
    </header>
  );
}