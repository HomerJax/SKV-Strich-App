"use client";

type TrendPoint = {
  id: string;
  label: string;
  value: number;
};

type PlayerTrendCardProps = {
  enabled: boolean;
  points: TrendPoint[];
  className?: string;
};

type TrendState = "up" | "down" | "mixed" | "flat";

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Unterstützt beide Skalen:
 * - alt: Sieg=3, Unentschieden=1, Niederlage=0
 * - neu: Sieg=1, Unentschieden=0, Niederlage=-1
 */
function normalizePointValue(value: number) {
  if (value >= 3) return 3;
  if (value <= -1) return 0;
  if (value === 1) return 3;
  if (value === 0) return 1;
  return value;
}

function normalizedValues(points: TrendPoint[]) {
  return points.map((point) => normalizePointValue(point.value));
}

function getTrendState(points: TrendPoint[]): TrendState {
  if (points.length < 3) return "flat";

  const values = normalizedValues(points);
  const firstPart = values.slice(0, Math.ceil(values.length / 2));
  const secondPart = values.slice(Math.floor(values.length / 2));

  const firstAvg = average(firstPart);
  const secondAvg = average(secondPart);
  const delta = secondAvg - firstAvg;

  const wins = values.filter((v) => v >= 3).length;
  const losses = values.filter((v) => v === 0).length;

  let rises = 0;
  let drops = 0;

  for (let i = 1; i < values.length; i += 1) {
    if (values[i] > values[i - 1]) rises += 1;
    if (values[i] < values[i - 1]) drops += 1;
  }

  const lastTwo = values.slice(-2);
  const lastThree = values.slice(-3);
  const lastTwoAvg = average(lastTwo);
  const lastThreeAvg = average(lastThree);
  const overallAvg = average(values);

  if (
    losses >= 3 &&
    wins <= 1 &&
    !(lastTwoAvg >= 2.5 && delta >= 1.0)
  ) {
    return "mixed";
  }

  if (
    delta >= 1.0 &&
    lastTwoAvg >= 2 &&
    lastThreeAvg >= firstAvg &&
    drops <= rises
  ) {
    return "up";
  }

  if (
    delta <= -1.0 &&
    lastTwoAvg <= 1 &&
    lastThreeAvg <= firstAvg &&
    drops >= rises
  ) {
    return "down";
  }

  if (overallAvg <= 0.8 && wins <= 1) {
    return "mixed";
  }

  if (rises > 0 && drops > 0) {
    return "mixed";
  }

  return "flat";
}

function getTrendCopy(state: TrendState) {
  switch (state) {
    case "up":
      return {
        title: "Du wirst stärker",
        icon: "↗",
        badge: "Aufwärtstrend",
      };
    case "down":
      return {
        title: "Du wirst schwächer",
        icon: "↘",
        badge: "Abwärtstrend",
      };
    case "mixed":
      return {
        title: "Form schwankt",
        icon: "↕",
        badge: "Wechselhaft",
      };
    default:
      return {
        title: "Noch kein klarer Trend",
        icon: "→",
        badge: "Neutral",
      };
  }
}

function pointLabel(value: number) {
  const normalized = normalizePointValue(value);
  if (normalized >= 3) return "S";
  if (normalized >= 1) return "U";
  return "N";
}

function pointClasses(value: number, isLast: boolean) {
  const normalized = normalizePointValue(value);

  if (normalized >= 3) {
    return isLast
      ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
      : "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (normalized >= 1) {
    return isLast
      ? "bg-amber-100 text-amber-800 ring-amber-200"
      : "bg-amber-50 text-amber-700 ring-amber-100";
  }

  return isLast
    ? "bg-rose-100 text-rose-800 ring-rose-200"
    : "bg-rose-50 text-rose-700 ring-rose-100";
}

function resultWord(value: number) {
  const normalized = normalizePointValue(value);
  if (normalized >= 3) return "Sieg";
  if (normalized >= 1) return "Unentschieden";
  return "Niederlage";
}

function buildChart(
  points: TrendPoint[],
  width: number,
  height: number,
  maxValue: number
) {
  if (points.length === 0) {
    return {
      polyline: "",
      circles: [] as Array<{ id: string; x: number; y: number; isLast: boolean }>,
    };
  }

  const stepX = points.length === 1 ? 0 : width / (points.length - 1);

  const circles = points.map((point, index) => {
    const normalizedPoint = normalizePointValue(point.value);
    const x = index * stepX;
    const normalized = maxValue === 0 ? 0 : normalizedPoint / maxValue;
    const y = height - normalized * height;

    return {
      id: point.id,
      x,
      y,
      isLast: index === points.length - 1,
    };
  });

  const polyline = circles.map((point) => `${point.x},${point.y}`).join(" ");

  return { polyline, circles };
}

function summary(points: TrendPoint[]) {
  const values = normalizedValues(points);
  const wins = values.filter((value) => value >= 3).length;
  const draws = values.filter((value) => value >= 1 && value < 3).length;
  const losses = values.filter((value) => value < 1).length;

  return {
    total: points.length,
    wins,
    draws,
    losses,
  };
}

export default function PlayerTrendCard({
  enabled,
  points,
  className = "",
}: PlayerTrendCardProps) {
  if (!enabled) return null;

  const allPoints = points;

  if (allPoints.length === 0) {
    return (
      <section
        className={`rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6 ${className}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950">Meine Form</div>
            <div className="mt-1 text-sm text-slate-600">
              Verlauf über alle bewerteten Sessions
            </div>
          </div>

          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            → Neutral
          </span>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-base font-semibold text-slate-950">
            Noch kein klarer Trend
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Sobald Ergebnisse vorhanden sind, erscheint hier dein Verlauf.
          </div>
        </div>
      </section>
    );
  }

  const trendState = getTrendState(allPoints);
  const trendCopy = getTrendCopy(trendState);
  const stats = summary(allPoints);

  const chartWidth = Math.max(176, allPoints.length * 34);
  const chartHeight = 42;
  const maxValue = 3;

  const { polyline, circles } = buildChart(
    allPoints,
    chartWidth,
    chartHeight,
    maxValue
  );

  return (
    <section
      className={`rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">Meine Form</div>
          <div className="mt-1 text-sm text-slate-600">
            Verlauf über alle {allPoints.length} bewerteten Sessions
          </div>
        </div>

        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          <span className="mr-1">{trendCopy.icon}</span>
          {trendCopy.badge}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {stats.total} Spiele
        </span>
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {stats.wins} Siege
        </span>
        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          {stats.draws} Unentschieden
        </span>
        <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
          {stats.losses} Niederlagen
        </span>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/90 px-4 py-4 sm:px-5">
        <div className="text-[28px] font-bold leading-none tracking-tight text-slate-950">
          {trendCopy.title}
        </div>

        <div className="mt-4 overflow-x-auto pb-2">
          <div className="w-max min-w-full">
            <div className="relative h-[64px] min-w-[220px]">
              <div className="pointer-events-none absolute inset-x-2 top-[10px] h-px bg-slate-200" />
              <div className="pointer-events-none absolute inset-x-2 top-[26px] h-px bg-slate-200/65" />
              <div className="pointer-events-none absolute inset-x-2 top-[42px] h-px bg-slate-200/35" />

              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="absolute inset-0 h-[48px] w-full overflow-visible"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="rgba(100,116,139,0.72)"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {circles.map((point) => (
                  <circle
                    key={point.id}
                    cx={point.x}
                    cy={point.y}
                    r={point.isLast ? "4.5" : "3.5"}
                    fill={point.isLast ? "rgb(15 23 42)" : "rgb(100 116 139)"}
                  />
                ))}
              </svg>

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-[2px]">
                {allPoints.map((point) => (
                  <div
                    key={`${point.id}-label`}
                    className="flex min-w-[26px] flex-1 items-center justify-center text-[10px] font-medium text-slate-500"
                  >
                    {point.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
              {allPoints.map((point, index) => {
                const isLast = index === allPoints.length - 1;

                return (
                  <div
                    key={`${point.id}-chip`}
                    className={`inline-flex h-7 w-7 flex-none items-center justify-center rounded-full text-[10px] font-semibold ring-1 ${pointClasses(
                      point.value,
                      isLast
                    )}`}
                    title={`${point.label}: ${resultWord(point.value)}`}
                  >
                    {pointLabel(point.value)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-start">
          <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {trendCopy.badge}
          </div>
        </div>
      </div>
    </section>
  );
}