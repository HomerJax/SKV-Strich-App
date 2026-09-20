"use client";

import Link from "next/link";
import { Banknote, LogOut, MessageCircle, PlayCircle, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "@/components/LogoutButton";

type P = {
  profileLabel: string;
  showPlayerStatsLink: boolean;
  profilePhotoSrc?: string | null;
  profilePhotoPositionX?: number | null;
  profilePhotoPositionY?: number | null;
  profilePhotoZoom?: number | null;
  showTeamChatLink?: boolean;
};

function initial(value: string | null) {
  return value?.trim().charAt(0).toUpperCase() || "P";
}

export default function MobileUserMenu({
  profileLabel,
  profilePhotoSrc,
  profilePhotoPositionX = 50,
  profilePhotoPositionY = 50,
  profilePhotoZoom = 1,
  showTeamChatLink = false,
}: P) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, []);

  const item =
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50";
  const cropStyle = {
    objectPosition: `${profilePhotoPositionX ?? 50}% ${profilePhotoPositionY ?? 50}%`,
    transform: `scale(${Number(profilePhotoZoom ?? 1)})`,
    transformOrigin: `${profilePhotoPositionX ?? 50}% ${profilePhotoPositionY ?? 50}%`,
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label="Profilmenü"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm sm:h-11 sm:w-11"
      >
        <span className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-black">
          {profilePhotoSrc ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -top-[12.5%] block h-[125%] overflow-hidden"
            >
              <img
                src={profilePhotoSrc}
                alt=""
                className="block h-full w-full object-cover"
                style={cropStyle}
              />
            </span>
          ) : (
            initial(profileLabel)
          )}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-[300] min-w-[240px] rounded-2xl border bg-white p-1.5 shadow-xl">
          <Link href="/profile" onClick={() => setOpen(false)} className={item}>
            <UserRound className="h-5 w-5" />
            <div>
              <div>{profileLabel}</div>
              <div className="text-[11px] text-slate-500">Spielerpass & Trainingsplanung</div>
            </div>
          </Link>
          <Link href="/mannschaftskasse" onClick={() => setOpen(false)} className={item}>
            <Banknote className="h-5 w-5 text-emerald-700" />
            <div>
              <div>Mannschaftskasse</div>
              <div className="text-[11px] text-slate-500">Posten sehen & melden</div>
            </div>
          </Link>
          {showTeamChatLink ? (
            <Link href="/chat" onClick={() => setOpen(false)} className={item}>
              <MessageCircle className="h-5 w-5 text-blue-700" />
              <div>
                <div>Teamchat</div>
                <div className="text-[11px] text-slate-500">Nachrichten im Team</div>
              </div>
            </Link>
          ) : null}
          <Link href="/demo" onClick={() => setOpen(false)} className={item}>
            <PlayCircle className="h-5 w-5 text-amber-700" />
            <div>
              <div>strikr Demo ansehen</div>
              <div className="text-[11px] text-slate-500">Alle Funktionen ausprobieren</div>
            </div>
          </Link>
          <LogoutButton className={item}>
            <>
              <LogOut className="h-5 w-5" />
              <div>
                <div>Logout</div>
                <div className="text-[11px] text-slate-500">Abmelden</div>
              </div>
            </>
          </LogoutButton>
        </div>
      ) : null}
    </div>
  );
}
