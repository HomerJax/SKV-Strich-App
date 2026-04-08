export type RecentResult = {
  sessionId: number;
  date: string | null;
  outcome: "win" | "loss" | "draw";
  scoreLabel: string;
  myTeamLabel: "Team 1" | "Team 2";
};

export function formatGermanDate(date: string | null) {
  if (!date) return "Unbekanntes Datum";
  return new Date(date).toLocaleDateString("de-DE");
}

export function outcomeLabel(outcome: RecentResult["outcome"]) {
  if (outcome === "win") return "Sieg";
  if (outcome === "loss") return "Niederlage";
  return "Unentschieden";
}

export function outcomeClasses(outcome: RecentResult["outcome"]) {
  if (outcome === "win") return "bg-emerald-100 text-emerald-800";
  if (outcome === "loss") return "bg-rose-100 text-rose-800";
  return "bg-amber-100 text-amber-800";
}

export function percentage(part: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export function formatRatio(value: number) {
  if (!Number.isFinite(value)) return "0,00";
  return value.toFixed(2).replace(".", ",");
}

export function trendValueForOutcome(outcome: RecentResult["outcome"]) {
  if (outcome === "win") return 1;
  return 0;
}

export function formatImpactValue(value: number) {
  if (!Number.isFinite(value)) return "0,00";
  return value.toFixed(2).replace(".", ",");
}

export function getImpactValue(params: {
  myTeamScore: number;
  opponentScore: number;
  goalsFor: number;
  goalsAgainst: number;
}) {
  const { myTeamScore, opponentScore, goalsFor, goalsAgainst } = params;

  const isWin = goalsFor > goalsAgainst;
  if (goalsFor === goalsAgainst) return 0;

  const diff = myTeamScore - opponentScore;

  if (Math.abs(diff) < 0.0001) {
    return isWin ? 1 : 0;
  }

  const isFavorite = diff > 0;

  if (isWin && isFavorite) return 1;
  if (isWin && !isFavorite) return 2;
  if (!isWin && isFavorite) return -1;

  return 0;
}

export function getImpactMeta(impactPerMatch: number) {
  if (impactPerMatch >= 1.25) {
    return {
      title: "Sehr starker Impact",
      text: "Deine Teams performen mit dir sehr häufig besser als erwartet.",
      badgeClasses: "bg-emerald-100 text-emerald-800",
      boxClasses: "border-emerald-200 bg-emerald-50 text-emerald-900",
    };
  }

  if (impactPerMatch >= 0.75) {
    return {
      title: "Starker Impact",
      text: "Mit dir im Team werden regelmäßig starke Ergebnisse erreicht.",
      badgeClasses: "bg-sky-100 text-sky-800",
      boxClasses: "border-sky-200 bg-sky-50 text-sky-900",
    };
  }

  if (impactPerMatch >= 0.25) {
    return {
      title: "Solider Impact",
      text: "Deine Teams holen mit dir ordentliche Ergebnisse und bleiben im positiven Bereich.",
      badgeClasses: "bg-amber-100 text-amber-800",
      boxClasses: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }

  return {
    title: "Noch Luft nach oben",
    text: "Aktuell performen deine Teams mit dir noch nicht konstant über Erwartung.",
    badgeClasses: "bg-rose-100 text-rose-800",
    boxClasses: "border-rose-200 bg-rose-50 text-rose-900",
  };
}

function getPartsInBerlin(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    timeKey: `${map.hour}:${map.minute}`,
  };
}

function addOneDay(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  if (!year || !month || !day) {
    return dateString;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + 1);

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export function isMvpRevealClosed(sessionDate: string) {
  const revealDate = addOneDay(sessionDate);
  const now = getPartsInBerlin(new Date());

  return (
    now.dateKey > revealDate ||
    (now.dateKey === revealDate && now.timeKey >= "10:00")
  );
}