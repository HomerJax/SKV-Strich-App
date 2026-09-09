"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

function findQuickInfoSection() {
  const sections = Array.from(document.querySelectorAll("section"));

  return (
    sections.find((section) => {
      const labels = Array.from(section.querySelectorAll("div"));
      return labels.some(
        (label) => label.textContent?.trim() === "Meine Kurzinfo",
      );
    }) ?? null
  );
}

export default function HomeAchievementTeaser() {
  const pathname = usePathname();
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pathname !== "/home") return;

    let cancelled = false;
    let host: HTMLDivElement | null = null;
    let tries = 0;

    const mountIntoQuickInfo = () => {
      if (cancelled) return;

      const section = findQuickInfoSection();
      if (section) {
        host = document.createElement("div");
        host.dataset.homeAchievementSlot = "true";
        host.className = "mt-3";
        section.appendChild(host);
        setPortalHost(host);
        return;
      }

      tries += 1;
      if (tries < 20) {
        window.setTimeout(mountIntoQuickInfo, 50);
      }
    };

    mountIntoQuickInfo();

    return () => {
      cancelled = true;
      setPortalHost(null);
      host?.remove();
    };
  }, [pathname]);

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

  if (
    pathname !== "/home" ||
    !portalHost ||
    !data?.enabled ||
    !data.items?.length
  ) {
    return null;
  }

  const primary = data.items[0];
  const secondary = data.items[1] ?? null;

  return createPortal(
    <Link
      href="/badges"
      className="group block overflow-hidden rounded-[24px] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-slate-50 p-3 shadow-[0_10px_26px_rgba(245,158,11,0.08)] transition hover:border-amber-200 hover:shadow-[0_14px_30px_rgba(245,158,11,0.12)]"
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-amber-100 bg-white shadow-sm">
          <AchievementBadgeVisual badgeKey={primary.badgeKey} size="lg" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-600">
            <Sparkles className="h-3 w-3" />
            Nächstes Achievement
          </div>

          <div className="mt-1 flex min-w-0 items-baseline gap-2">
            <div className="truncate text-sm font-black tracking-tight text-slate-950">
              {primary.title}
            </div>
            <span className="shrink-0 text-[10px] font-bold text-slate-400">
              {primary.current}/{primary.target}
            </span>
          </div>

          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
            {missingLabel(primary)} bis zum Badge
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 transition-all"
              style={{ width: `${Math.max(5, primary.progressPercent)}%` }}
            />
          </div>
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition group-hover:bg-amber-500">
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>

      {secondary ? (
        <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-slate-200/70 pt-2 text-[10px] font-semibold text-slate-400">
          <span className="truncate">
            Danach: <span className="font-black text-slate-600">{secondary.title}</span>
          </span>
          <span className="shrink-0">{missingLabel(secondary)}</span>
        </div>
      ) : null}
    </Link>,
    portalHost,
  );
}
