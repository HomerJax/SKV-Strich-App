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

type TrendMood =
  | "heater"
  | "bounce_back"
  | "steady_up"
  | "collapse"
  | "slump"
  | "volatile_positive"
  | "volatile_negative"
  | "streaky"
  | "balanced"
  | "flat";

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

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

function resultLetter(value: number) {
  const normalized = normalizePointValue(value);
  if (normalized >= 3) return "S";
  if (normalized >= 1) return "U";
  return "N";
}

function resultWord(value: number) {
  const normalized = normalizePointValue(value);
  if (normalized >= 3) return "Sieg";
  if (normalized >= 1) return "Unentschieden";
  return "Niederlage";
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

function countStreaks(values: number[]) {
  let currentWins = 0;
  let currentLosses = 0;
  let bestWinStreak = 0;
  let bestLossStreak = 0;

  for (const value of values) {
    if (value >= 3) {
      currentWins += 1;
      currentLosses = 0;
    } else if (value < 1) {
      currentLosses += 1;
      currentWins = 0;
    } else {
      currentWins = 0;
      currentLosses = 0;
    }

    bestWinStreak = Math.max(bestWinStreak, currentWins);
    bestLossStreak = Math.max(bestLossStreak, currentLosses);
  }

  return {
    bestWinStreak,
    bestLossStreak,
  };
}

function buildSequence(points: TrendPoint[]) {
  return normalizedValues(points).map((value) => {
    if (value >= 3) return "W";
    if (value >= 1) return "D";
    return "L";
  });
}

function hasPattern(sequence: string[], pattern: string[]) {
  if (pattern.length === 0 || sequence.length < pattern.length) return false;

  for (let i = 0; i <= sequence.length - pattern.length; i += 1) {
    let match = true;

    for (let j = 0; j < pattern.length; j += 1) {
      if (sequence[i + j] !== pattern[j]) {
        match = false;
        break;
      }
    }

    if (match) return true;
  }

  return false;
}

function getTrendMood(points: TrendPoint[]): TrendMood {
  if (points.length < 3) return "flat";

  const values = normalizedValues(points);
  const sequence = buildSequence(points);
  const { wins, draws, losses } = summary(points);
  const { bestWinStreak, bestLossStreak } = countStreaks(values);

  const firstHalf = values.slice(0, Math.ceil(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = average(firstHalf);
  const secondAvg = average(secondHalf);
  const delta = secondAvg - firstAvg;

  const lastThree = values.slice(-3);
  const lastFour = values.slice(-4);
  const lastThreeWins = lastThree.filter((value) => value >= 3).length;
  const lastFourWins = lastFour.filter((value) => value >= 3).length;
  const lastThreeLosses = lastThree.filter((value) => value < 1).length;

  const rises = values.slice(1).filter((value, index) => value > values[index]).length;
  const drops = values.slice(1).filter((value, index) => value < values[index]).length;

  if (bestWinStreak >= 4 && lastThreeWins >= 2) {
    return "heater";
  }

  if (
    hasPattern(sequence, ["W", "W", "W", "L", "W", "W"]) ||
    hasPattern(sequence, ["W", "W", "L", "W", "W", "W"]) ||
    (delta >= 0.8 && lastFourWins >= 3 && lastThreeLosses <= 1 && wins >= 4)
  ) {
    return "bounce_back";
  }

  if (delta >= 0.7 && lastThreeWins >= 2 && rises >= drops && wins > losses) {
    return "steady_up";
  }

  if (bestLossStreak >= 3 && lastThreeLosses >= 2) {
    return "collapse";
  }

  if (delta <= -0.7 && losses > wins && drops >= rises) {
    return "slump";
  }

  if (wins >= losses + 2 && rises > 0 && drops > 0) {
    return "volatile_positive";
  }

  if (losses >= wins + 2 && rises > 0 && drops > 0) {
    return "volatile_negative";
  }

  if (bestWinStreak >= 2 && bestLossStreak >= 2) {
    return "streaky";
  }

  if (Math.abs(delta) < 0.35 && Math.abs(wins - losses) <= 1 && draws >= 1) {
    return "balanced";
  }

  return "flat";
}

function getTrendCopy(mood: TrendMood, points: TrendPoint[]) {
  const stats = summary(points);

  switch (mood) {
    case "heater":
      return {
        title: "Heißer Lauf",
        subtitle: `Starke Serie: ${stats.wins} Siege insgesamt und zuletzt richtig Druck auf dem Kessel.`,
        badge: "On fire",
        icon: "🔥",
      };
    case "bounce_back":
      return {
        title: "Kurz gewackelt, stark zurückgekommen",
        subtitle:
          "Zwischendurch ein Dämpfer, danach aber wieder klar gefangen. Gute Reaktion statt langer Hänger.",
        badge: "Bounce Back",
        icon: "↺",
      };
    case "steady_up":
      return {
        title: "Stabiler Aufwärtstrend",
        subtitle:
          "Die Kurve zeigt nach oben. Nicht komplett wild, sondern sauber Schritt für Schritt besser.",
        badge: "Steigend",
        icon: "↗",
      };
    case "collapse":
      return {
        title: "Gerade ziemlich zäh",
        subtitle:
          "Im Moment läuft es eher schwer. Da steckt Qualität drin, aber die Punktekurve ist zuletzt klar eingebrochen.",
        badge: "Tiefphase",
        icon: "↘",
      };
    case "slump":
      return {
        title: "Form rutscht ab",
        subtitle:
          "Aktuell eher Abwärtstrend. Weniger Punch, weniger Stabilität, mehr Arbeit gegen den Rhythmus.",
        badge: "Abwärts",
        icon: "↓",
      };
    case "volatile_positive":
      return {
        title: "Gefährlich gut mit Ausreißern",
        subtitle:
          "Nicht komplett sauber, aber insgesamt stark. Zwischen Top-Momenten liegt noch etwas Chaos.",
        badge: "Wild, aber gut",
        icon: "⚡",
      };
    case "volatile_negative":
      return {
        title: "Zu unruhig für Konstanz",
        subtitle:
          "Es blitzt mal auf, kippt aber zu oft wieder weg. Mehr Stabilität würde hier sofort helfen.",
        badge: "Zu wechselhaft",
        icon: "↕",
      };
    case "streaky":
      return {
        title: "Serienspieler-Modus",
        subtitle:
          "Nicht linear, eher in Läufen. Gute Phasen sind da – die Kunst ist, die Dellen kürzer zu halten.",
        badge: "In Wellen",
        icon: "〰",
      };
    case "balanced":
      return {
        title: "Ordentlich, aber noch ohne klaren Ausschlag",
        subtitle:
          "Solide Mischung aus Licht und Arbeit. Noch kein harter Trend, aber auch kein echter Absturz.",
        badge: "Ausgeglichen",
        icon: "→",
      };
    default:
      return {
        title: "Noch kein klarer Trend",
        subtitle:
          "Es sind Ansätze zu sehen, aber noch kein Muster, das sich wirklich festsetzt.",
        badge: "Neutral",
        icon: "→",
      };
  }
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

  const topPadding = 5;
  const bottomPadding = 5;
  const drawableHeight = Math.max(height - topPadding - bottomPadding, 1);
  const stepX = points.length === 1 ? 0 : width / (points.length - 1);

  const circles = points.map((point, index) => {
    const normalizedPoint = normalizePointValue(point.value);
    const x = index * stepX;
    const normalized = maxValue === 0 ? 0 : normalizedPoint / maxValue;
    const y = topPadding + (1 - normalized) * drawableHeight;

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

export default function PlayerTrendCard({
  enabled,
  points,
  className = "",
}: PlayerTrendCardProps) {
  if (!enabled) return null;

  const allPoints = points;

  if (allPoints.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            → Neutral
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-base font-semibold text-slate-950">
            Noch kein klarer Trend
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Sobald Ergebnisse vorhanden sind, erscheint hier dein Verlauf.
          </div>
        </div>
      </div>
    );
  }

  const mood = getTrendMood(allPoints);
  const trendCopy = getTrendCopy(mood, allPoints);
  const stats = summary(allPoints);

  const chartWidth = Math.max(176, allPoints.length * 34);
  const chartHeight = 48;
  const maxValue = 3;

  const { polyline, circles } = buildChart(
    allPoints,
    chartWidth,
    chartHeight,
    maxValue
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap gap-2">
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

      <div className="rounded-3xl border border-slate-200 bg-slate-50/90 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[28px] font-bold leading-none tracking-tight text-slate-950">
              {trendCopy.title}
            </div>

            <div className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {trendCopy.subtitle}
            </div>
          </div>

          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            <span className="mr-1">{trendCopy.icon}</span>
            {trendCopy.badge}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto pb-2">
          <div className="w-max min-w-full">
            <div className="relative h-[70px] min-w-[220px]">
              <div className="pointer-events-none absolute inset-x-2 top-[12px] h-px bg-slate-200" />
              <div className="pointer-events-none absolute inset-x-2 top-[30px] h-px bg-slate-200/65" />
              <div className="pointer-events-none absolute inset-x-2 top-[48px] h-px bg-slate-200/35" />

              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="absolute inset-0 h-[54px] w-full overflow-visible"
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
                    {resultLetter(point.value)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}