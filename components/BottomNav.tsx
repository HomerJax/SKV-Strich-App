"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type MembershipRow = {
  role: "admin" | "member" | null;
};

const HIDDEN_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/join",
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

export default function BottomNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      try {
        const { data, error } = await supabase.rpc("get_my_membership");

        if (error) {
          throw error;
        }

        let role: string | null = null;

        if (Array.isArray(data) && data.length > 0) {
          role = (data[0] as MembershipRow)?.role ?? null;
        } else if (data && typeof data === "object" && "role" in data) {
          role = (data as MembershipRow).role ?? null;
        }

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

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const items = useMemo(() => {
    const baseItems = [
      { href: "/", label: "Start", icon: "🏠" },
      { href: "/sessions", label: "Trainings", icon: "⚽" },
      { href: "/standings", label: "Tabellen", icon: "📊" },
    ];

    if (isAdmin) {
      baseItems.push({ href: "/admin", label: "Admin", icon: "⚙️" });
    }

    return baseItems;
  }, [isAdmin]);

  if (!pathname || shouldHideBottomNav(pathname)) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-black text-white">
      <div className="mx-auto flex max-w-3xl items-stretch justify-between px-2 py-2">
        <div className="flex min-w-0 flex-1 items-stretch justify-around">
          {items.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-[62px] min-w-[64px] flex-1 flex-col items-center justify-center gap-1 px-1 text-center"
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
                    active ? "opacity-100" : "opacity-60"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <form action="/api/logout" method="post" className="ml-1 flex-shrink-0">
          <button
            type="submit"
            className="flex min-h-[62px] min-w-[64px] flex-col items-center justify-center gap-1 px-1 text-center"
            aria-label="Logout"
          >
            <span className="text-lg leading-none opacity-60">🚪</span>
            <span className="text-[11px] leading-none opacity-60">Logout</span>
          </button>
        </form>
      </div>
    </nav>
  );
}