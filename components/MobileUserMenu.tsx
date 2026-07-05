"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "@/components/LogoutButton";

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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Profilmenü"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700">
          {getInitial(profileLabel)}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-[300] min-w-[210px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <UserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate">{profileLabel}</div>
              <div className="text-[11px] font-medium text-slate-500">
                Profil
              </div>
            </div>
          </Link>

          <LogoutButton className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
            <>
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <LogOut className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate">Logout</div>
                <div className="text-[11px] font-medium text-slate-500">
                  Abmelden
                </div>
              </div>
            </>
          </LogoutButton>
        </div>
      ) : null}
    </div>
  );
}
