"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Home, Shield, Trophy } from "lucide-react";

type AppBottomNavProps = {
  isAdmin?: boolean;
};

const HIDDEN_ON_PATHS = [
  "/",
  "/datenschutz",
  "/impressum",
  "/join",
  "/login",
  "/login/forgot-password",
  "/login/reset-password",
  "/signup",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
];

type NavItemProps = {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
};

function NavItem({ href, label, active, icon }: NavItemProps) {
  return (
    <Link
      href={href}
      className={[
        "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[22px] px-1 py-2 text-[11px] font-semibold leading-none transition",
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
      ].join(" ")}
    >
      <div className="flex h-5 w-5 items-center justify-center">{icon}</div>
      <span className="truncate">{label}</span>

      {active ? (
        <span className="absolute -bottom-1 h-1 w-6 rounded-full bg-blue-600" />
      ) : null}
    </Link>
  );
}

export default function AppBottomNav({ isAdmin = false }: AppBottomNavProps) {
  const pathname = usePathname();

  if (!pathname) return null;

  if (
    HIDDEN_ON_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )
  ) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[350] w-full max-w-full border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(15,23,42,0.10)] [transform:translateZ(0)]">
      <div className="mx-auto w-full max-w-md bg-white px-2 py-1.5">
        <div className="flex h-16 items-center gap-1">
          <NavItem
            href="/home"
            label="Home"
            active={pathname === "/" || pathname === "/home"}
            icon={<Home className="h-5 w-5" />}
          />

          <NavItem
            href="/sessions"
            label="Sessions"
            active={
              pathname === "/sessions" || pathname.startsWith("/sessions/")
            }
            icon={<CalendarDays className="h-5 w-5" />}
          />

          <NavItem
            href="/stats"
            label="Meine Stats"
            active={pathname === "/stats" || pathname.startsWith("/stats/")}
            icon={<BarChart3 className="h-5 w-5" />}
          />

          <NavItem
            href="/standings"
            label="Tabelle"
            active={
              pathname === "/standings" || pathname.startsWith("/standings/")
            }
            icon={<Trophy className="h-5 w-5" />}
          />

          {isAdmin ? (
            <NavItem
              href="/admin"
              label="Admin"
              active={pathname === "/admin" || pathname.startsWith("/admin/")}
              icon={<Shield className="h-5 w-5" />}
            />
          ) : null}
        </div>
      </div>
    </nav>
  );
}
