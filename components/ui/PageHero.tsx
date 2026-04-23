"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { getClubHeroStyles } from "@/lib/ui/hero";

type PageHeroProps = {
  primaryColorKey?: string | null;
  eyebrow?: string;
  title: string;
  description?: string | null;
  backLabel?: string;
  backHref?: string;
  onBack?: () => void;
  topRightSlot?: ReactNode;
  centerSlot?: ReactNode;
  actionsSlot?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
  align?: "left" | "center";
};

function BackControl({
  backLabel,
  backHref,
  onBack,
}: {
  backLabel?: string;
  backHref?: string;
  onBack?: () => void;
}) {
  if (backHref) {
    return (
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/72 transition hover:text-white"
      >
        <span aria-hidden="true">←</span>
        <span>{backLabel ?? "Zurück"}</span>
      </Link>
    );
  }

  if (onBack) {
    return (
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/72 transition hover:text-white"
      >
        <span aria-hidden="true">←</span>
        <span>{backLabel ?? "Zurück"}</span>
      </button>
    );
  }

  return <div />;
}

export default function PageHero({
  primaryColorKey,
  eyebrow,
  title,
  description,
  backLabel,
  backHref,
  onBack,
  topRightSlot,
  centerSlot,
  actionsSlot,
  children,
  compact = true,
  align = "left",
}: PageHeroProps) {
  const { heroGradient, borderColor } = getClubHeroStyles(primaryColorKey);

  const hasTopRow = Boolean(backHref || onBack || topRightSlot);
  const isCentered = align === "center";

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div
        className="text-white"
        style={{
          borderTop: `2px solid ${borderColor}`,
          background: heroGradient,
        }}
      >
        <div className={compact ? "px-4 py-3" : "px-4 py-4 sm:px-5 sm:py-5"}>
          {hasTopRow ? (
            <div className="flex items-start justify-between gap-3">
              <BackControl
                backLabel={backLabel}
                backHref={backHref}
                onBack={onBack}
              />
              {topRightSlot ? <div className="shrink-0">{topRightSlot}</div> : null}
            </div>
          ) : null}

          {centerSlot ? (
            <div
              className={`${hasTopRow ? "mt-3" : ""} flex items-center justify-center`}
            >
              {centerSlot}
            </div>
          ) : null}

          <div
            className={[
              hasTopRow || centerSlot ? "mt-2 min-w-0" : "min-w-0",
              isCentered ? "text-center" : "",
            ].join(" ")}
          >
            {eyebrow ? (
              <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/56">
                {eyebrow}
              </div>
            ) : null}

            <h1 className="mt-1 text-[15px] font-extrabold leading-none tracking-tight text-white sm:text-[17px]">
              {title}
            </h1>

            {description?.trim() ? (
              <p className="mt-1 text-[11px] leading-4 text-white/68">
                {description}
              </p>
            ) : null}
          </div>

          {actionsSlot ? (
            <div
              className={[
                "mt-2 flex flex-wrap gap-2",
                isCentered ? "justify-center" : "items-center",
              ].join(" ")}
            >
              {actionsSlot}
            </div>
          ) : null}

          {children ? <div className="mt-2">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}