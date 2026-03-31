import type { ReactNode } from "react";
import { getClubHeroStyles } from "@/lib/ui/hero";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description?: string;
  primaryColorKey?: string | null;
  action?: ReactNode;
};

export default function PageHero({
  eyebrow,
  title,
  description,
  primaryColorKey,
  action,
}: PageHeroProps) {
  const { heroGradient, borderColor } = getClubHeroStyles(primaryColorKey);

  return (
    <div
      className="rounded-[32px] border text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.75)]"
      style={{
        borderColor,
        background: heroGradient,
      }}
    >
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-7">
        <div className="max-w-3xl">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            {eyebrow}
          </div>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {title}
          </h1>

          {description ? (
            <p className="mt-3 text-sm leading-6 text-white/80 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}