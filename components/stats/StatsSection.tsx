"use client";

import { useState } from "react";

type StatsSectionProps = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function StatsSection({
  title,
  subtitle,
  defaultOpen = true,
  icon,
  children,
}: StatsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              {icon}
            </div>
          ) : null}

          <div className="min-w-0">
            <div className="text-base font-bold tracking-tight text-slate-950">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</div>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600 transition",
            open ? "rotate-180" : ""
          )}
          aria-hidden="true"
        >
          ˅
        </div>
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}