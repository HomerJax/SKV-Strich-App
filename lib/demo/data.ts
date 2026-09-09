export type DemoPosition = "goalkeeper" | "defense" | "attack";
export type DemoCategory = "Ü32" | "AH";

export type DemoPlayer = {
  id: number;
  name: string;
  position: DemoPosition;
  strength: 1 | 2 | 3 | 4 | 5;
  category: DemoCategory;
  balanceGroup?: string;
};

export type DemoStanding = {
  playerId: number;
  appearances: number;
  wins: number;
  points: number;
  streak: number;
};

export const DEMO_CLUB = {
  name: "1. FC Strikr 2026",
  logoPath:
    "club-logos/12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60/1777287993589-strikr-logo.svg",
  primaryColor: "black",
} as const;

export const DEMO_PLAYERS: DemoPlayer[] = [
  { id: 219, name: "Max Strikr", position: "goalkeeper", strength: 4, category: "Ü32" },
  { id: 220, name: "Tobias Louro", position: "defense", strength: 3, category: "AH" },
  { id: 221, name: "Tomek Strikr", position: "attack", strength: 4, category: "Ü32" },
  { id: 222, name: "Pablo Alonso Glez.", position: "attack", strength: 5, category: "Ü32" },
  { id: 223, name: "Marco Polo", position: "defense", strength: 3, category: "AH" },
  { id: 224, name: "Mario Götze", position: "attack", strength: 5, category: "Ü32" },
  { id: 225, name: "Gerd Müller", position: "attack", strength: 4, category: "AH" },
  { id: 307, name: "Dennis Probst", position: "defense", strength: 4, category: "Ü32", balanceGroup: "Defensivanker" },
  { id: 306, name: "Sahim Kuhni", position: "defense", strength: 3, category: "AH" },
  { id: 305, name: "Andi Lebherz", position: "attack", strength: 3, category: "AH" },
  { id: 304, name: "Julian Dauser", position: "defense", strength: 5, category: "Ü32" },
  { id: 303, name: "Robert Scher", position: "goalkeeper", strength: 3, category: "AH" },
  { id: 302, name: "Tim Walczuch", position: "attack", strength: 4, category: "Ü32" },
  { id: 301, name: "Patrick Ploch", position: "defense", strength: 3, category: "AH" },
  { id: 300, name: "Dominik Bochinger", position: "attack", strength: 4, category: "Ü32" },
  { id: 299, name: "Espen Baumann", position: "defense", strength: 2, category: "AH", balanceGroup: "Gehfußballer" },
  { id: 298, name: "Flo Tost", position: "attack", strength: 3, category: "AH" },
  { id: 297, name: "Bastian Janke", position: "defense", strength: 4, category: "Ü32" },
  { id: 296, name: "Markus Ulmer", position: "attack", strength: 3, category: "AH" },
  { id: 295, name: "Tobi Wagner", position: "defense", strength: 4, category: "Ü32" },
  { id: 294, name: "Auge Wagner", position: "defense", strength: 2, category: "AH", balanceGroup: "Gehfußballer" },
  { id: 292, name: "Dennis Scheeff", position: "attack", strength: 4, category: "Ü32" },
  { id: 291, name: "Dani Rottmann", position: "defense", strength: 3, category: "AH" },
  { id: 290, name: "Lenny Linder", position: "attack", strength: 5, category: "Ü32" },
  { id: 288, name: "Micha Kassler", position: "defense", strength: 4, category: "Ü32", balanceGroup: "Defensivanker" },
  { id: 285, name: "Benni Flaadt", position: "attack", strength: 3, category: "AH" },
  { id: 286, name: "Walter Knecht", position: "defense", strength: 2, category: "AH" },
  { id: 287, name: "Däschle Scheeff", position: "attack", strength: 4, category: "Ü32" },
  { id: 289, name: "Manu Rubner", position: "defense", strength: 3, category: "AH" },
];

export const DEFAULT_PRESENT_IDS = [
  219, 221, 222, 224, 307, 304, 303, 302, 300, 297, 295, 292, 288, 287,
];

export const DEMO_STANDINGS: DemoStanding[] = DEMO_PLAYERS.slice(0, 18)
  .map((player, index) => {
    const appearances = 17 + ((index * 7 + player.id) % 13);
    const wins = 8 + ((index * 5 + player.id) % Math.max(8, appearances - 6));
    return {
      playerId: player.id,
      appearances,
      wins: Math.min(wins, appearances),
      points: Math.min(wins, appearances) * 3,
      streak: 1 + ((player.id + index) % 5),
    };
  })
  .sort((a, b) => b.points - a.points || b.wins - a.wins || b.appearances - a.appearances);

export const DEMO_BADGES = [
  { key: "career_appearances_25", title: "Dauerstarter", description: "25 Trainings absolviert", unlocked: true },
  { key: "career_wins_10", title: "Jubelmaschine", description: "10 Karrieresiege", unlocked: true },
  { key: "attendance_streak_5", title: "Dauerläufer", description: "5 Trainings in Folge", unlocked: true },
  { key: "win_streak_3", title: "Lauf", description: "3 Siege in Folge", unlocked: true },
  { key: "curse_broken", title: "Fluch gebrochen", description: "Nach 3 Niederlagen wieder gewonnen", unlocked: true },
  { key: "career_appearances_100", title: "Karriere-Elite", description: "100 Trainings absolvieren", unlocked: false },
  { key: "career_appearances_250", title: "Legendär", description: "250 Trainings absolvieren", unlocked: false },
  { key: "career_appearances_500", title: "GOAT", description: "500 Trainings absolvieren", unlocked: false },
] as const;

export const DEMO_RECENT_SESSIONS = [
  { date: "03.09.2026", label: "Donnerstagstraining", score: "8:6", participants: 18 },
  { date: "27.08.2026", label: "Donnerstagstraining", score: "5:5", participants: 16 },
  { date: "20.08.2026", label: "Donnerstagstraining", score: "7:4", participants: 20 },
] as const;

export function getDemoPlayer(playerId: number) {
  return DEMO_PLAYERS.find((player) => player.id === playerId) ?? null;
}
