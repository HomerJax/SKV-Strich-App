"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type MobileUserMenuProps = {
  profileLabel: string;
  showPlayerStatsLink: boolean;
};

function getInitial(value: string | null) {
  if (!value) return "P";
  return value.trim().charAt(0).toUpperCase();
}

export default function MobileUserMenu({
  profileLabel,
  showPlayerStatsLink,
}: MobileUserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative sm:hidden">
      <button
        type="button"
        aria-label="Profil und Stats"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-50 min-w-[190px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
              {getInitial(profileLabel)}
            </div>
            <div className="min-w-0">
              <div className="truncate">{profileLabel}</div>
              <div className="text-[11px] font-medium text-slate-500">
                Profil
              </div>
            </div>
          </Link>

          {showPlayerStatsLink ? (
            <Link
              href="/stats"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M3 3v18h18" />
                  <path d="M7 14l4-4 3 3 5-7" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="truncate">Meine Stats</div>
                <div className="text-[11px] font-medium text-slate-500">
                  Übersicht
                </div>
              </div>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}