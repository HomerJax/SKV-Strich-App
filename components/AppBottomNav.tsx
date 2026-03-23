"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type MembershipRow = {
  role: "admin" | "member" | null;
};

type NavItem =
  | {
      type: "link";
      href: string;
      label: string;
      icon: string;
    }
  | {
      type: "logout";
      label: string;
      icon: string;
    };

const HIDDEN_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/join",
  "/club-setup",
  "/select-club",
];

function shouldHideBottomNav(pathname: string) {
  return HIDDEN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[$()*+./?[\\\]^{|}-]/g, "\\$&")}=([^;]*)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

export default function AppBottomNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      try {
        const activeClubId = getCookie("active_club_id");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user?.id || !activeClubId) {
          if (!cancelled) setIsAdmin(false);
          return;
        }

        const { data, error } = await supabase
          .from("club_memberships")
          .select("role")
          .eq("user_id", user.id)
          .eq("club_id", activeClubId)
          .maybeSingle();

        if (error) throw error;

        const role = (data as MembershipRow | null)?.role ?? null;

        if (!cancelled) {
          setIsAdmin(role === "admin");
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    }

    loadRole();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadRole();
    });

    const onFocus = () => loadRole();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { type: "link", href: "/", label: "Home", icon: "⌂" },
      { type: "link", href: "/sessions", label: "Trainings", icon: "▣" },
      { type: "link", href: "/standings", label: "Tabelle", icon: "⌘" },
    ];

    if (isAdmin) {
      items.push({
        type: "link",
        href: "/admin",
        label: "Admin",
        icon: "⚙",
      });
    }

    items.push({
      type: "logout",
      label: "Logout",
      icon: "⇥",
    });

    return items;
  }, [isAdmin]);

  if (!pathname || shouldHideBottomNav(pathname)) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div
        className="mx-auto grid max-w-3xl"
        style={{
          gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))`,
        }}
      >
        {navItems.map((item) => {
          if (item.type === "logout") {
            return (
              <form
                key="logout"
                action="/api/logout"
                method="post"
                className="m-0"
              >
                <button
                  type="submit"
                  className="flex min-h-[72px] w-full flex-col items-center justify-center gap-1 px-2 text-center text-slate-700"
                  aria-label="Logout"
                >
                  <span className="text-lg leading-none opacity-80">
                    {item.icon}
                  </span>
                  <span className="text-[11px] leading-none opacity-80">
                    {item.label}
                  </span>
                </button>
              </form>
            );
          }

          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-[72px] flex-col items-center justify-center gap-1 px-2 text-center text-slate-700"
            >
              <span
                className={`text-lg leading-none ${
                  active ? "opacity-100" : "opacity-60"
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`text-[11px] leading-none ${
                  active ? "font-medium opacity-100" : "opacity-60"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}