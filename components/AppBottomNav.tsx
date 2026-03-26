"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
};

function NavItem({ href, label, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={[
        "flex min-w-0 flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function AppBottomNav({
  isAdmin = false,
}: AppBottomNavProps) {
  const pathname = usePathname();

  if (!pathname) {
    return null;
  }

  if (
    HIDDEN_ON_PATHS.some(
      (hiddenPath) =>
        pathname === hiddenPath || pathname.startsWith(`${hiddenPath}/`)
    )
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <NavItem href="/" label="Home" active={pathname === "/"} />

        <NavItem
          href="/sessions"
          label="Sessions"
          active={pathname === "/sessions" || pathname.startsWith("/sessions/")}
        />

        <NavItem
          href="/players"
          label="Players"
          active={pathname === "/players" || pathname.startsWith("/players/")}
        />

        {isAdmin ? (
          <NavItem
            href="/admin"
            label="Admin"
            active={pathname === "/admin" || pathname.startsWith("/admin/")}
          />
        ) : null}

        <form action="/api/logout" method="post" className="flex min-w-0 flex-1">
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Logout
          </button>
        </form>
      </div>
    </nav>
  );
}