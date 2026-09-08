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

export const BADGE_DEFINITIONS = [
  {
    key: "season_kickoff",
    title: "Saisonauftakt",
    description: "Dein erster Einsatz in einer neuen Badge-Saison.",
    scope: "season",
    category: "attendance",
  },
  {
    key: "attendance_streak_3",
    title: "Warmgelaufen",
    description: "3 Trainings in Folge dabei.",
    scope: "season",
    category: "attendance",
  },
  {
    key: "attendance_streak_5",
    title: "Dauerläufer",
    description: "5 Trainings in Folge dabei.",
    scope: "season",
    category: "attendance",
  },
  {
    key: "attendance_streak_10",
    title: "Unkaputtbar",
    description: "10 Trainings in Folge dabei.",
    scope: "season",
    category: "attendance",
  },
  {
    key: "attendance_streak_15",
    title: "Inventar",
    description: "15 Trainings in Folge dabei.",
    scope: "season",
    category: "attendance",
  },
  {
    key: "attendance_streak_20",
    title: "Immer da",
    description: "20 Trainings in Folge dabei.",
    scope: "season",
    category: "attendance",
  },
  {
    key: "win_streak_1",
    title: "Erster Dreier",
    description: "Den ersten Sieg der Badge-Saison geholt.",
    scope: "season",
    category: "wins",
  },
  {
    key: "win_streak_3",
    title: "Lauf",
    description: "3 Siege in Folge.",
    scope: "season",
    category: "wins",
  },
  {
    key: "win_streak_5",
    title: "Auf einer Mission",
    description: "5 Siege in Folge.",
    scope: "season",
    category: "wins",
  },
  {
    key: "win_streak_7",
    title: "Nicht zu stoppen",
    description: "7 Siege in Folge.",
    scope: "season",
    category: "wins",
  },
  {
    key: "win_streak_10",
    title: "Seriensieger",
    description: "10 Siege in Folge.",
    scope: "season",
    category: "wins",
  },
  {
    key: "loss_streak_3",
    title: "Pechvogel",
    description: "3 Niederlagen in Folge überstanden.",
    scope: "season",
    category: "losses",
  },
  {
    key: "loss_streak_5",
    title: "Unglücksrabe",
    description: "5 Niederlagen in Folge überstanden.",
    scope: "season",
    category: "losses",
  },
  {
    key: "loss_streak_7",
    title: "Schwarze Serie",
    description: "7 Niederlagen in Folge überstanden.",
    scope: "season",
    category: "losses",
  },
  {
    key: "curse_broken",
    title: "Fluch gebrochen",
    description: "Nach mindestens 3 Niederlagen in Folge wieder gewonnen.",
    scope: "season",
    category: "special",
  },
  {
    key: "resilient",
    title: "Leidensfähig",
    description: "Mindestens 8 Einsätze und 5 Niederlagen in einer Saison gesammelt.",
    scope: "season",
    category: "special",
  },
  {
    key: "lucky_charm",
    title: "Glücksbringer",
    description: "Mindestens 10 entschiedene Spiele mit mindestens 70 % Siegquote.",
    scope: "season",
    category: "special",
  },
  {
    key: "comeback",
    title: "Comeback",
    description: "Nach mindestens 3 verpassten Trainings zurückgekehrt und direkt gewonnen.",
    scope: "season",
    category: "special",
  },
  {
    key: "career_appearances_10",
    title: "10 Einsätze",
    description: "10 Einsätze für den Club.",
    scope: "career",
    category: "career",
  },
  {
    key: "career_appearances_25",
    title: "25 Einsätze",
    description: "25 Einsätze für den Club.",
    scope: "career",
    category: "career",
  },
  {
    key: "career_appearances_50",
    title: "50 Einsätze",
    description: "50 Einsätze für den Club.",
    scope: "career",
    category: "career",
  },
  {
    key: "career_appearances_100",
    title: "100 Einsätze",
    description: "100 Einsätze für den Club.",
    scope: "career",
    category: "career",
  },
  {
    key: "career_appearances_250",
    title: "250 Einsätze",
    description: "250 Einsätze für den Club.",
    scope: "career",
    category: "career",
  },
  {
    key: "career_appearances_500",
    title: "500 Einsätze",
    description: "500 Einsätze für den Club.",
    scope: "career",
    category: "career",
  },
  {
    key: "career_wins_1",
    title: "1. Karrieresieg",
    description: "Den ersten gespeicherten Sieg geholt.",
    scope: "career",
    category: "career",
  },
  {
    key: "career_wins_10",
    title: "10 Siege",
    description: "10 Siege für den Club.",
    scope: "career",
    category: "career",
  },
  {
    key: "career_wins_25",
    title: "25 Siege",
    description: "25 Siege für den Club.",
    scope: "career",
    category: "career",
  },
  {
    key: "career_wins_50",
    title: "50 Siege",
    description: "50 Siege für den Club.",
    scope: "career",
    category: "career",
  },
  {
    key: "career_wins_100",
    title: "100 Siege",
    description: "100 Siege für den Club.",
    scope: "career",
    category: "career",
  },
  {
    key: "career_wins_250",
    title: "250 Siege",
    description: "250 Siege für den Club.",
    scope: "career",
    category: "career",
  },
] as const satisfies readonly BadgeDefinition[];

export type BadgeKey = (typeof BADGE_DEFINITIONS)[number]["key"];

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
