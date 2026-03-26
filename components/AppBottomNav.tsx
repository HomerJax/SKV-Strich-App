"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  Trophy,
  Shield,
  LogOut,
} from "lucide-react";

type AppBottomNavProps = {
  isAdmin?: boolean;
};

const HIDDEN_ON_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
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
        "flex flex-1 flex-col items-center justify-center rounded-xl py-2 text-xs font-medium transition",
        active
          ? "bg-slate-900 text-white"
          : "text-slate-500 hover:bg-slate-100",
      ].join(" ")}
    >
      <div className="mb-1 flex h-4 w-4 items-center justify-center">{icon}</div>
      <span>{label}</span>
    </Link>
  );
}

export default function AppBottomNav({
  isAdmin = false,
}: AppBottomNavProps) {
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-1 p-2">
        <NavItem
          href="/"
          label="Home"
          active={pathname === "/"}
          icon={<Home className="h-4 w-4" />}
        />

        <NavItem
          href="/sessions"
          label="Sessions"
          active={
            pathname === "/sessions" || pathname.startsWith("/sessions/")
          }
          icon={<CalendarDays className="h-4 w-4" />}
        />

        <NavItem
          href="/standings"
          label="Tabellen"
          active={
            pathname === "/standings" || pathname.startsWith("/standings/")
          }
          icon={<Trophy className="h-4 w-4" />}
        />

        {isAdmin ? (
          <NavItem
            href="/admin"
            label="Admin"
            active={pathname === "/admin" || pathname.startsWith("/admin/")}
            icon={<Shield className="h-4 w-4" />}
          />
        ) : null}

        <form action="/api/logout" method="post" className="flex flex-1">
          <button
            type="submit"
            className="flex flex-1 flex-col items-center justify-center rounded-xl py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
          >
            <LogOut className="mb-1 h-4 w-4" />
            <span>Logout</span>
          </button>
        </form>
      </div>
    </nav>
  );
}