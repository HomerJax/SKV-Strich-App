"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", icon: "🏠", label: "Start" },
  { href: "/sessions", icon: "⚽", label: "Trainings" },
  { href: "/standings", icon: "📊", label: "Tabellen" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-black/30 bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-around px-6 py-2 text-[11px]">
        {TABS.map(({ href, icon, label }) => {
          const isActive =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href + "/"));

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 transition ${
                isActive
                  ? "text-white"
                  : "text-gray-300 hover:text-gray-200"
              }`}
            >
              <span
                className={`text-lg px-2 py-1 rounded-lg ${
                  isActive ? "bg-white/10 shadow-inner" : ""
                }`}
              >
                {icon}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
