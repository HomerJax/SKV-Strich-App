"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Membership =
  | {
      role: "admin" | "member" | null;
    }
  | null;

function isHiddenPath(pathname: string) {
  const hiddenPaths = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/onboarding",
    "/join",
  ];

  return hiddenPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadRole() {
      try {
        const { data, error } = await supabase.rpc("get_my_membership");

        if (error) {
          throw error;
        }

        let membership: Membership = null;

        if (Array.isArray(data)) {
          membership = (data[0] as Membership | undefined) ?? null;
        } else if (data && typeof data === "object") {
          membership = data as Membership;
        }

        if (!mounted) return;

        setIsAdmin(membership?.role === "admin");
      } catch {
        if (!mounted) return;
        setIsAdmin(false);
      } finally {
        if (!mounted) return;
        setRoleLoaded(true);
      }
    }

    loadRole();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadRole();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const navItems = useMemo(() => {
    const items = [
      { href: "/", label: "Start", icon: "🏠" },
      { href: "/sessions", label: "Trainings", icon: "⚽" },
      { href: "/standings", label: "Tabellen", icon: "📊" },
    ];

    if (isAdmin) {
      items.push({ href: "/admin", label: "Admin", icon: "⚙️" });
    }

    return items;
  }, [isAdmin]);

  if (!pathname || isHiddenPath(pathname)) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-black text-white">
      <div
        className={`mx-auto grid max-w-3xl items-stretch py-2 ${
          isAdmin ? "grid-cols-5" : "grid-cols-4"
        }`}
      >
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-[60px] flex-col items-center justify-center gap-1 px-2 text-center"
            >
              <span
                className={`text-lg transition-opacity ${
                  active ? "opacity-100" : "opacity-60"
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`text-[11px] transition-opacity ${
                  active ? "opacity-100" : "opacity-60"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        <form action="/api/logout" method="post" className="h-full">
          <button
            type="submit"
            className="flex min-h-[60px] w-full flex-col items-center justify-center gap-1 px-2 text-center"
            aria-label="Logout"
          >
            <span
              className={`text-lg transition-opacity ${
                pathname === "/logout" ? "opacity-100" : "opacity-60"
              }`}
            >
              🚪
            </span>
            <span
              className={`text-[11px] transition-opacity ${
                pathname === "/logout" ? "opacity-100" : "opacity-60"
              }`}
            >
              Logout
            </span>
          </button>
        </form>
      </div>

      {!roleLoaded && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0" />
      )}
    </nav>
  );
}