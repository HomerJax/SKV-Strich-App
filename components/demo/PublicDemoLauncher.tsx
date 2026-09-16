"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Play, Sparkles } from "lucide-react";
import { Capacitor } from "@capacitor/core";

export default function PublicDemoLauncher() {
  const pathname = usePathname();

  // The marketing landing has its own demo CTAs. Keep this compact launcher
  // only on login, where it remains useful as a low-friction way to explore.
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  if (pathname !== "/login") {
    return null;
  }

  return (
    <Link
      href="/demo"
      className="fixed bottom-5 right-4 z-[420] inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-extrabold text-amber-950 shadow-[0_14px_35px_rgba(0,0,0,.18)] transition hover:-translate-y-0.5 hover:bg-amber-100 sm:bottom-6 sm:right-6"
    >
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-black text-white">
        <Play className="h-3.5 w-3.5 fill-current" />
        <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-amber-400" />
      </span>
      strikr Demo ansehen
    </Link>
  );
}
