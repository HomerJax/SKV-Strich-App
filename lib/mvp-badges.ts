export type MvpBadgeLevel =
  | "none"
  | "copper"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum";

export function getMvpBadgeLevel(mvpCount: number): MvpBadgeLevel {
  if (mvpCount >= 10) return "platinum";
  if (mvpCount >= 7) return "gold";
  if (mvpCount >= 5) return "silver";
  if (mvpCount >= 3) return "bronze";
  if (mvpCount >= 1) return "copper";
  return "none";
}

export function getBadgeLabel(level: MvpBadgeLevel) {
  switch (level) {
    case "copper":
      return "Kupfer";
    case "bronze":
      return "Bronze";
    case "silver":
      return "Silber";
    case "gold":
      return "Gold";
    case "platinum":
      return "Platin";
    default:
      return null;
  }
}

export function getNextBadgeThreshold(mvpCount: number) {
  if (mvpCount < 1) return 1;
  if (mvpCount < 3) return 3;
  if (mvpCount < 5) return 5;
  if (mvpCount < 7) return 7;
  if (mvpCount < 10) return 10;
  return null;
}