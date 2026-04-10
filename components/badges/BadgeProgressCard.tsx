import PlayerBadge from "@/components/badges/PlayerBadge";
import { getBadgeProgress } from "@/lib/badges/helpers";

type BadgeProgressCardProps = {
  mvpCount: number | null | undefined;
  title?: string;
};

export default function BadgeProgressCard({
  mvpCount,
  title = "Dein Badge",
}: BadgeProgressCardProps) {
  const progress = getBadgeProgress(mvpCount);

  return (
    <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-500">{title}</div>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-950">
          Badge-Fortschritt
        </h3>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PlayerBadge mvpCount={progress.currentCount} size="lg" />

        <div className="text-sm text-slate-600">
          <div className="font-semibold text-slate-900">
            {progress.progressLabel}
          </div>
          <div className="mt-1">
            Aktuell: <strong>{progress.currentCount} MVP</strong>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>Fortschritt</span>
          <span>{progress.progressPercent}%</span>
        </div>

        <div className="h-2.5 rounded-full bg-slate-100">
          <div
            className="h-2.5 rounded-full bg-slate-900 transition-all"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}