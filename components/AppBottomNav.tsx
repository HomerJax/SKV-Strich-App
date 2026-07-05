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
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-semibold leading-none transition",
        active ? "text-white shadow-sm" : "text-slate-500 hover:bg-slate-100",
      ].join(" ")}
      style={
        active
          ? { backgroundColor: "var(--club-primary, #0f172a)" }
          : undefined
      }
    >
      <div className="flex h-5 w-5 items-center justify-center">{icon}</div>
      <span className="truncate">{label}</span>
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
    <nav className="fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200 bg-white/98 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto w-full max-w-6xl px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2">
        <div className="mx-auto flex h-16 w-full max-w-md items-center gap-1 rounded-[24px] bg-white">
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
