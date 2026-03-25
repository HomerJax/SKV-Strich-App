"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

const HIDDEN_ON_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
];

export default function AppHeader() {
  const pathname = usePathname();

  const hidden = useMemo(() => {
    if (!pathname) {
      return false;
    }

    return HIDDEN_ON_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
  }, [pathname]);

  if (hidden) {
    return null;
  }

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

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <Image
            src="/icon-dark.png"
            alt="strikr"
            width={24}
            height={24}
            className="h-6 w-6 object-contain opacity-70"
          />
        </div>
      </div>
    </header>
  );
}