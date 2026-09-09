"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import AchievementBadgeVisual from "@/components/badges/AchievementBadgeVisual";

type ProgressItem = {
  badgeKey: string;
  title: string;
  description: string;
  scope: "career" | "season";
  metric: "appearances" | "wins" | "attendance_streak" | "win_streak";
  current: number;
  target: number;
  remaining: number;
  progressPercent: number;
  unit: "Teilnahmen" | "Siege" | "Trainings";
};

type ProgressResponse = {
  enabled?: boolean;
  earnedCount?: number;
  items?: ProgressItem[];
};

function missingLabel(item: ProgressItem) {
  if (item.remaining <= 0) return "Fast geschafft";

  const unit =
    item.unit === "Siege" && item.remaining === 1
      ? "Sieg"
      : item.unit === "Teilnahmen" && item.remaining === 1
        ? "Teilnahme"
        : item.unit === "Trainings" && item.remaining === 1
          ? "Training"
          : item.unit;

  return `Noch ${item.remaining} ${unit}`;
}

export default function HomeAchievementTeaser() {
  const pathname = usePathname();
  const [data, setData] = useState<ProgressResponse | null>(null);

  useEffect(() => {
    if (pathname !== "/home") return;

    const controller = new AbortController();

    fetch("/api/badges/progress", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload) setData(payload as ProgressResponse);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [pathname]);

  if (pathname !== "/home" || !data?.enabled || !data.items?.length) {
    return null;
  }

  const primary = data.items[0];
  const secondary = data.items[1] ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-3 sm:px-6 lg:px-8">
      <Link
        href="/badges"
        className="group relative block overflow-hidden rounded-[26px] border border-slate-800/70 bg-[linear-gradient(135deg,#111827_0%,#0f172a_50%,#111827_100%)] p-3.5 text-white shadow-[0_16px_42px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(15,23,42,0.24)] sm:p-4"
      >
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-44 rounded-full bg-sky-300/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.055] shadow-inner">
            <AchievementBadgeVisual badgeKey={primary.badgeKey} size="lg" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-300/90">
              <Sparkles className="h-3 w-3" />
              Nächstes Achievement
            </div>

            <div className="mt-1 flex min-w-0 items-baseline gap-2">
              <h2 className="truncate text-sm font-black tracking-tight sm:text-base">
                {primary.title}
              </h2>
              <span className="shrink-0 text-[10px] font-bold text-white/45">
                {primary.current}/{primary.target}
              </span>
            </div>

            <div className="mt-1 text-xs font-semibold text-white/60">
              {missingLabel(primary)} bis zum Badge
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 transition-all"
                style={{ width: `${Math.max(5, primary.progressPercent)}%` }}
              />
            </div>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition group-hover:bg-white group-hover:text-slate-950">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>

        {secondary ? (
          <div className="relative mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-2.5 text-[10px] font-semibold text-white/45">
            <span className="truncate">
              Danach im Blick: <span className="font-black text-white/70">{secondary.title}</span>
            </span>
            <span className="shrink-0">{missingLabel(secondary)}</span>
          </div>
        ) : null}
      </Link>
    </div>
  );
}
