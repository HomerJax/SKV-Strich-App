import PlayerBadge, { getPlayerBadgeTier } from "@/components/badges/PlayerBadge";

type BadgeProgressCardProps = {
  mvpCount: number | null | undefined;
  title?: string;
  className?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const NEXT_THRESHOLDS = [1, 3, 5, 7, 10] as const;

function getNextThreshold(mvpCount: number) {
  return NEXT_THRESHOLDS.find((threshold) => mvpCount < threshold) ?? null;
}

export default function BadgeProgressCard({
  mvpCount,
  title = "Badge-Fortschritt",
  className,
}: BadgeProgressCardProps) {
  const safeCount = Math.max(0, mvpCount ?? 0);
  const tier = getPlayerBadgeTier(safeCount);
  const nextThreshold = getNextThreshold(safeCount);

  const progressText = nextThreshold
    ? `${nextThreshold - safeCount} MVP bis zum nächsten Badge`
    : "Maximales Badge erreicht";

  const progressPercent = nextThreshold
    ? Math.max(8, Math.min(100, (safeCount / nextThreshold) * 100))
    : 100;

  return (
    <section
      className={cn(
        "rounded-[24px] border border-black/10 bg-white p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <PlayerBadge
          mvpCount={safeCount}
          size="lg"
          showLabel={false}
          showDescription={false}
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {title}
          </div>

          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-950">
            {tier ? `${tier.label} Badge` : "Noch kein Badge"}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {tier
              ? tier.description
              : "Sobald du deinen ersten MVP holst, schaltest du dein erstes Badge frei."}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-slate-500">MVP gesamt</span>
            <span className="font-bold text-slate-950">{safeCount}</span>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-950 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-2 text-xs text-slate-500">{progressText}</div>
        </div>
      </div>
    </section>
  );
}