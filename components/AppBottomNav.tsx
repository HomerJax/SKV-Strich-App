import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  Home,
  CalendarDays,
  Trophy,
  Shield,
  LogOut,
} from "lucide-react";

const HIDDEN_ON_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/club-setup",
  "/select-club",
];

type AppBottomNavProps = {
  pathname?: string;
};

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

function isHiddenPath(pathname?: string) {
  if (!pathname) return false;

  return HIDDEN_ON_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isActive(pathname: string | undefined, href: string) {
  if (!pathname) return false;

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default async function AppBottomNav({
  pathname,
}: AppBottomNavProps) {
  if (isHiddenPath(pathname)) {
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
          // Bottom nav liest nur.
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: memberships } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id);

  const typedMemberships = (memberships ?? []) as MembershipRow[];

  const activeClubId = cookieStore.get("active_club_id")?.value ?? null;

  let activeMembership: MembershipRow | null = null;

  if (activeClubId) {
    activeMembership =
      typedMemberships.find((membership) => membership.club_id === activeClubId) ??
      null;
  }

  if (!activeMembership && typedMemberships.length === 1) {
    activeMembership = typedMemberships[0];
  }

  const isAdmin = activeMembership?.role === "admin";

  const items = [
    {
      href: "/",
      label: "Home",
      icon: Home,
    },
    {
      href: "/sessions",
      label: "Trainings",
      icon: CalendarDays,
    },
    {
      href: "/standings",
      label: "Tabelle",
      icon: Trophy,
    },
    ...(isAdmin
      ? [
          {
            href: "/admin",
            label: "Admin",
            icon: Shield,
          },
        ]
      : []),
    {
      href: "/logout",
      label: "Logout",
      icon: LogOut,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
                active
                  ? "bg-neutral-100 text-neutral-950"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}