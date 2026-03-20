"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDDEN_ON_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/join",
];

function shouldHide(pathname: string) {
  return HIDDEN_ON_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function itemClass(active: boolean) {
  return [
    "flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition",
    active ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-800",
  ].join(" ");
}

export default function AppBottomNav() {
  const pathname = usePathname();

  if (shouldHide(pathname)) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-300 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
      <div className="mx-auto grid h-16 max-w-3xl grid-cols-4">
        <Link href="/" className={itemClass(pathname === "/")}>
          <span className="text-base leading-none">⌂</span>
          <span>Home</span>
        </Link>

        <Link
          href="/sessions"
          className={itemClass(pathname.startsWith("/sessions"))}
        >
          <span className="text-base leading-none">◫</span>
          <span>Sessions</span>
        </Link>

        <Link
          href="/players"
          className={itemClass(pathname.startsWith("/players"))}
        >
          <span className="text-base leading-none">◌</span>
          <span>Spieler</span>
        </Link>

        <Link
          href="/standings"
          className={itemClass(pathname.startsWith("/standings"))}
        >
          <span className="text-base leading-none">⌘</span>
          <span>Tabelle</span>
        </Link>
      </div>
    </nav>
  );
}