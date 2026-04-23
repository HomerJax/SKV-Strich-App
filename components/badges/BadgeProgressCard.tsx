import PlayerBadge from "@/components/badges/PlayerBadge";
import {
  getBadgeLabel,
  getMvpBadgeLevel,
  getNextBadgeThreshold,
} from "@/lib/mvp-badges";

type BadgeProgressCardProps = {
  mvpCount: number;
  title?: string;
};

const BADGE_STEPS = [
  { label: "Blech", threshold: 1 },
  { label: "Bronze", threshold: 3 },
  { label: "Silber", threshold: 5 },
  { label: "Gold", threshold: 7 },
  { label: "GOAT", threshold: 10 },
] as const;

function getProgressPercent(mvpCount: number, nextThreshold: number | null) {
  if (nextThreshold === null) return 100;
  if (nextThreshold <= 0) return 0;
  return Math.max(0, Math.min(100, (mvpCount / nextThreshold) * 100));
}

export default function BadgeProgressCard({
  mvpCount,
  title = "Badge-Fortschritt",
}: BadgeProgressCardProps) {
  const badgeLevel = getMvpBadgeLevel(mvpCount);
  const badgeLabel =
    badgeLevel === "none" ? "Noch kein Badge" : getBadgeLabel(badgeLevel);

  const nextThreshold = getNextBadgeThreshold(mvpCount);
  const nextMissing =
    nextThreshold !== null ? Math.max(0, nextThreshold - mvpCount) : 0;

  const progressPercent = getProgressPercent(mvpCount, nextThreshold);

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <PlayerBadge
            mvpCount={mvpCount}
            size="lg"
            hideIfNone={false}
            grayscale={badgeLevel === "none"}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-950">{title}</div>
          <div className="mt-1 text-sm text-slate-600">
            {badgeLevel === "none"
              ? "Sobald du deinen ersten MVP holst, schaltest du dein erstes Badge frei."
              : `Aktueller Status: ${badgeLabel}.`}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              MVP gesamt
            </div>
            <div className="text-sm font-bold text-slate-950">{mvpCount}</div>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-950 transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-2 text-sm text-slate-600">
            {nextThreshold === null ? (
              <span className="font-semibold text-slate-900">
                Höchstes Badge erreicht.
              </span>
            ) : (
              <>
                <span className="font-semibold text-slate-900">
                  {nextMissing} MVP
                </span>{" "}
                bis zum nächsten Badge
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Badge-Stufen
        </div>

        <div className="mt-3 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-3">
            {BADGE_STEPS.map((step) => {
              const active = mvpCount >= step.threshold;

              return (
                <div
                  key={step.label}
                  className={[
                    "w-[96px] shrink-0 rounded-2xl border px-3 py-3 text-center shadow-sm",
                    active
                      ? "border-slate-300 bg-white text-slate-950"
                      : "border-slate-200 bg-slate-50 text-slate-500",
                  ].join(" ")}
                >
                  <div className="flex justify-center">
                    <PlayerBadge
                      mvpCount={step.threshold}
                      size="sm"
                      hideIfNone={false}
                      grayscale={!active}
                    />
                  </div>

                  <div className="mt-2 text-sm font-semibold">{step.label}</div>
                  <div className="mt-1 text-xs leading-5">
                    ab {step.threshold} MVP
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}