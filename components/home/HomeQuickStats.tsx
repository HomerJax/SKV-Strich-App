"use client";

import Link from "next/link";
import { CalendarDays, Medal, Star, TrendingUp, Trophy } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

type Stats = {
  attendanceCount: number;
  winRate: number | null;
  attendanceRank: number | null;
  badgeCount: number;
};

function MiniStatCard({
  icon,
  value,
  label,
  tone,
  loading = false,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  tone: "blue" | "emerald" | "violet" | "amber";
  loading?: boolean;
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    amber: "bg-amber-50 text-amber-500 ring-amber-100",
  }[tone];

  return (
    <div className="min-w-0 rounded-[22px] border border-slate-200 bg-white px-2 py-3 text-center shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-xl ring-1 ${toneClass}`}>
        {icon}
      </div>
      <div className="mt-2 truncate text-base font-semibold tracking-[-0.03em] text-slate-950">
        {loading ? <span className="mx-auto block h-5 w-7 animate-pulse rounded bg-slate-100" /> : value}
      </div>
      <div className="whitespace-nowrap text-[9px] font-medium leading-tight text-slate-500">
        {label}
      </div>
    </div>
  );
}

export default function HomeQuickStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/home/quick-stats", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload) setStats(payload as Stats);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return (
    <>
      <div className="mt-4 grid grid-cols-4 gap-2.5">
        <MiniStatCard
          icon={<CalendarDays className="h-4 w-4" />}
          value={String(stats?.attendanceCount ?? 0)}
          label={t("home.attendance")}
          tone="blue"
          loading={!stats}
        />
        <MiniStatCard
          icon={<TrendingUp className="h-4 w-4" />}
          value={stats?.winRate == null ? "–" : `${stats.winRate}%`}
          label={t("home.winRate")}
          tone="emerald"
          loading={!stats}
        />
        <MiniStatCard
          icon={<Medal className="h-4 w-4" />}
          value={stats?.attendanceRank ? `#${stats.attendanceRank}` : "–"}
          label={t("home.standings")}
          tone="violet"
          loading={!stats}
        />
        <MiniStatCard
          icon={<Star className="h-4 w-4" />}
          value={String(stats?.badgeCount ?? 0)}
          label={t("home.badges")}
          tone="amber"
          loading={!stats}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href="/stats"
          className="flex min-h-[54px] items-center justify-between rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-50 via-cyan-50 to-white px-4 text-sm font-semibold text-slate-950 shadow-[0_12px_28px_rgba(37,99,235,0.08)] transition hover:from-blue-100 hover:via-cyan-50 hover:to-white"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <TrendingUp className="h-4 w-4" />
            </span>
            <span>{t("home.myProgress")}</span>
          </span>
          <span className="text-blue-700" aria-hidden="true">→</span>
        </Link>

        <Link
          href="/standings"
          className="flex min-h-[54px] items-center justify-between rounded-[24px] border border-amber-100 bg-gradient-to-br from-amber-50 via-orange-50 to-white px-4 text-sm font-semibold text-slate-950 shadow-[0_12px_28px_rgba(245,158,11,0.08)] transition hover:from-amber-100 hover:via-orange-50 hover:to-white"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Trophy className="h-4 w-4" />
            </span>
            <span>{t("home.standings")}</span>
          </span>
          <span className="text-amber-600" aria-hidden="true">→</span>
        </Link>
      </div>
    </>
  );
}
