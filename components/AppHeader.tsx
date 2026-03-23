"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const HIDDEN_ON_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
];

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
};

type PlayerRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  name: string | null;
  email: string | null;
};

function getUserLabel(player: PlayerRow | null, email: string | null) {
  const nickname = player?.nickname?.trim();
  if (nickname) return nickname;

  const firstName = player?.first_name?.trim();
  const lastName = player?.last_name?.trim();

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;

  const fallbackName = player?.name?.trim();
  if (fallbackName) return fallbackName;

  return email ?? "Eingeloggt";
}

function getInitials(label: string) {
  const parts = label
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "U";
  }

  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : null;
}

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

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userLabel, setUserLabel] = useState("Eingeloggt");
  const [clubName, setClubName] = useState<string | null>(null);
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHeader() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!session?.user) {
        setUserEmail(null);
        setUserLabel("Eingeloggt");
        setClubName(null);
        setClubLogoUrl(null);
        return;
      }

      const user = session.user;
      setUserEmail(user.email ?? null);

      const activeClubId = readCookie("active_club_id");

      if (!activeClubId) {
        setUserLabel(user.email ?? "Eingeloggt");
        setClubName(null);
        setClubLogoUrl(null);
        return;
      }

      const [{ data: playerData }, { data: clubData }] = await Promise.all([
        supabase
          .from("players")
          .select("id, first_name, last_name, nickname, name, email")
          .eq("club_id", activeClubId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("clubs")
          .select("id, display_name, logo_path")
          .eq("id", activeClubId)
          .maybeSingle(),
      ]);

      if (!isMounted) {
        return;
      }

      const player = (playerData ?? null) as PlayerRow | null;
      const club = (clubData ?? null) as ClubRow | null;

      setUserLabel(getUserLabel(player, user.email ?? null));
      setClubName(club?.display_name ?? null);

      if (club?.logo_path) {
        const { data: signedLogo } = await supabase.storage
          .from("club-logos")
          .createSignedUrl(club.logo_path, 60 * 60);

        if (!isMounted) {
          return;
        }

        setClubLogoUrl(signedLogo?.signedUrl ?? null);
      } else {
        setClubLogoUrl(null);
      }
    }

    loadHeader();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadHeader();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname]);

  if (hidden) {
    return null;
  }

  const initials = getInitials(userLabel);

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

        {userEmail ? (
          <div className="flex items-center gap-2">
            <div className="flex max-w-[180px] items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-neutral-800">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                {initials}
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{userLabel}</div>
                <div className="truncate text-[11px] text-neutral-500">
                  {userEmail}
                </div>
              </div>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
              {clubLogoUrl ? (
                <Image
                  src={clubLogoUrl}
                  alt={clubName ?? "Clublogo"}
                  width={34}
                  height={34}
                  className="h-8 w-8 object-contain"
                  unoptimized
                />
              ) : (
                <Image
                  src="/icon-dark.png"
                  alt="strikr"
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain opacity-70"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <Image
              src="/icon-dark.png"
              alt="strikr"
              width={24}
              height={24}
              className="h-6 w-6 object-contain opacity-70"
            />
          </div>
        )}
      </div>
    </header>
  );
}