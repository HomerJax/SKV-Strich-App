export type BadgeScope = "season" | "career";

export type BadgeCategory =
  | "attendance"
  | "wins"
  | "losses"
  | "special"
  | "career";

export type BadgeDefinition = {
  key: string;
  title: string;
  description: string;
  scope: BadgeScope;
  category: BadgeCategory;
};

export const ALL_BADGE_DEFINITIONS = [
  { key: "season_kickoff", title: "Saisonauftakt", description: "Erster Einsatz der aktuellen Saison.", scope: "season", category: "attendance" },
  { key: "attendance_streak_3", title: "Warmgelaufen", description: "3 Trainings in Folge.", scope: "season", category: "attendance" },
  { key: "attendance_streak_5", title: "Dauerläufer", description: "5 Trainings in Folge.", scope: "season", category: "attendance" },
  { key: "attendance_streak_10", title: "Unkaputtbar", description: "10 Trainings in Folge.", scope: "season", category: "attendance" },
  { key: "attendance_streak_15", title: "Inventar", description: "15 Trainings in Folge.", scope: "season", category: "attendance" },
  { key: "attendance_streak_20", title: "Immer da", description: "20 Trainings in Folge.", scope: "season", category: "attendance" },
  { key: "win_streak_1", title: "Erster Dreier", description: "Erster Sieg der aktuellen Saison.", scope: "season", category: "wins" },
  { key: "win_streak_3", title: "Lauf", description: "3 Siege bei 3 eigenen Einsätzen in Folge.", scope: "season", category: "wins" },
  { key: "win_streak_5", title: "Auf einer Mission", description: "5 Siege bei 5 eigenen Einsätzen in Folge.", scope: "season", category: "wins" },
  { key: "win_streak_7", title: "Nicht zu stoppen", description: "7 Siege bei 7 eigenen Einsätzen in Folge.", scope: "season", category: "wins" },
  { key: "win_streak_10", title: "Seriensieger", description: "10 Siege bei 10 eigenen Einsätzen in Folge.", scope: "season", category: "wins" },
  { key: "loss_streak_3", title: "Pechvogel", description: "3 Niederlagen bei 3 eigenen Einsätzen in Folge.", scope: "season", category: "losses" },
  { key: "loss_streak_5", title: "Unglücksrabe", description: "5 Niederlagen bei 5 eigenen Einsätzen in Folge.", scope: "season", category: "losses" },
  { key: "loss_streak_7", title: "Schwarze Serie", description: "7 Niederlagen bei 7 eigenen Einsätzen in Folge.", scope: "season", category: "losses" },
  { key: "curse_broken", title: "Fluch gebrochen", description: "Nach 3 eigenen Niederlagen in Folge beim nächsten Einsatz wieder gewonnen.", scope: "season", category: "special" },
  { key: "resilient", title: "Leidensfähig", description: "8+ Einsätze und 5+ Niederlagen diese Saison.", scope: "season", category: "special" },
  { key: "lucky_charm", title: "Glücksbringer", description: "10+ Spiele mit Ergebnis und mindestens 70 % Siegquote diese Saison.", scope: "season", category: "special" },
  { key: "comeback", title: "Comeback", description: "Nach 3 verpassten Trainings zurück und direkt gewonnen.", scope: "season", category: "special" },
  { key: "attendance_win_combo_7_5", title: "Vollgas", description: "7 Trainings in Folge dabei und innerhalb dieses Laufs 5 Siege in Folge.", scope: "season", category: "special" },
  { key: "career_appearances_10", title: "10 Einsätze", description: "10 Teilnahmen insgesamt.", scope: "career", category: "career" },
  { key: "career_appearances_25", title: "25 Einsätze", description: "25 Teilnahmen insgesamt.", scope: "career", category: "career" },
  { key: "career_appearances_50", title: "50 Einsätze", description: "50 Teilnahmen insgesamt.", scope: "career", category: "career" },
  { key: "career_appearances_100", title: "100 Einsätze", description: "100 Teilnahmen insgesamt.", scope: "career", category: "career" },
  { key: "career_appearances_250", title: "250 Einsätze", description: "250 Teilnahmen insgesamt.", scope: "career", category: "career" },
  { key: "career_appearances_500", title: "500 Einsätze", description: "500 Teilnahmen insgesamt.", scope: "career", category: "career" },
  { key: "career_wins_1", title: "1. Karrieresieg", description: "Erster Karrieresieg.", scope: "career", category: "career" },
  { key: "career_wins_10", title: "10 Siege", description: "10 Karrieresiege insgesamt.", scope: "career", category: "career" },
  { key: "career_wins_25", title: "25 Siege", description: "25 Karrieresiege insgesamt.", scope: "career", category: "career" },
  { key: "career_wins_50", title: "50 Siege", description: "50 Karrieresiege insgesamt.", scope: "career", category: "career" },
  { key: "career_wins_100", title: "100 Siege", description: "100 Karrieresiege insgesamt.", scope: "career", category: "career" },
  { key: "career_wins_250", title: "250 Siege", description: "250 Karrieresiege insgesamt.", scope: "career", category: "career" },
] as const satisfies readonly BadgeDefinition[];

export type BadgeKey = (typeof ALL_BADGE_DEFINITIONS)[number]["key"];

// Vorerst sind nur die beiden Karriere-Familien live. Die übrigen Definitionen
// bleiben im Code und können später ohne Datenverlust wieder aktiviert werden.
export const BADGE_DEFINITIONS = ALL_BADGE_DEFINITIONS.filter(
  (badge) => badge.scope === "career",
);

export const BADGE_DEFINITION_BY_KEY = new Map<string, BadgeDefinition>(
  BADGE_DEFINITIONS.map((badge) => [badge.key, badge]),
);

export function getBadgeDefinition(key: string) {
  return BADGE_DEFINITION_BY_KEY.get(key) ?? null;
}

export const SEASON_BADGES = BADGE_DEFINITIONS.filter(
  (badge) => badge.scope === "season",
);

export const CAREER_BADGES = BADGE_DEFINITIONS.filter(
  (badge) => badge.scope === "career",
);
