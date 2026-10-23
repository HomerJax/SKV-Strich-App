export type WheelCategory = "luck" | "challenge";

export type WheelSegment = {
  id: string;
  icon: string;
  label: string;
  description: string;
  weight: number;
  category: WheelCategory;
};

// Categories are playful groups for the admin's chance presets, not money prizes.
export const DEFAULT_WHEEL_SEGMENTS: WheelSegment[] = [
  { id: "lucky", icon: "🍀", label: "Joker", description: "Heute keine Kabinensprüche", weight: 10, category: "luck" },
  { id: "usual", icon: "😎", label: "Bleibt", description: "Keine Zusatzaufgabe", weight: 70, category: "luck" },
  { id: "confession", icon: "🎤", label: "Beichte", description: "Erzähl deine beste Ausrede", weight: 15, category: "challenge" },
  { id: "challenge", icon: "🔥", label: "Challenge", description: "Du übernimmst das Aufwärmen", weight: 5, category: "challenge" },
];

export const WHEEL_SUGGESTIONS: WheelSegment[] = [
  ...DEFAULT_WHEEL_SEGMENTS,
  { id: "song", icon: "🎵", label: "Musikchef", description: "Du bestimmst den nächsten Kabinen-Song", weight: 10, category: "luck" },
  { id: "cones", icon: "🧹", label: "Materialdienst", description: "Du räumst die Hütchen nach dem Training auf", weight: 10, category: "challenge" },
  { id: "applause", icon: "👑", label: "Kabinenheld", description: "Du bekommst eine Jubelrunde von der Mannschaft", weight: 10, category: "luck" },
  { id: "trick", icon: "⚽", label: "Kunststück", description: "Zeig beim nächsten Training einen Balltrick", weight: 10, category: "challenge" },
];

export const WHEEL_COLORS = [
  "#05A6AE", "#173C56", "#C08737", "#A94D6F", "#375C9C",
  "#138F65", "#A45B24", "#754B9F", "#18758D", "#8E5D4A",
];

export const WHEEL_FIELD_COUNTS = [4, 6, 8] as const;

export function parseWheelSegments(input: unknown): WheelSegment[] | null {
  // Read older configured wheels and historical spin snapshots too. The editor
  // restricts new configurations to 4/6/8 without rewriting old results.
  if (!Array.isArray(input) || input.length < 2 || input.length > 10) return null;
  const ids = new Set<string>();
  let total = 0;
  const segments: WheelSegment[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.id !== "string" || !/^[a-z0-9_-]{1,48}$/.test(row.id) || ids.has(row.id)) return null;
    if (typeof row.icon !== "string" || row.icon.trim().length < 1 || [...row.icon.trim()].length > 8) return null;
    if (typeof row.label !== "string" || !row.label.trim() || row.label.trim().length > 28) return null;
    if (typeof row.description !== "string" || row.description.trim().length > 120) return null;
    if (typeof row.weight !== "number" || !Number.isInteger(row.weight) || row.weight < 1 || row.weight > 99) return null;
    const category: WheelCategory = row.category === "luck" || row.category === "challenge"
      ? row.category
      : row.id === "lucky" || row.id === "usual" ? "luck" : "challenge";
    ids.add(row.id);
    total += row.weight;
    segments.push({
      id: row.id,
      icon: row.icon.trim(),
      label: row.label.trim(),
      description: row.description.trim(),
      weight: row.weight,
      category,
    });
  }
  return total === 100 ? segments : null;
}

function distribute(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  return Array.from({ length: count }, (_, index) => base + (index < total % count ? 1 : 0));
}

export function equalizeWheelSegments(segments: WheelSegment[]): WheelSegment[] {
  const weights = distribute(100, segments.length);
  return segments.map((segment, index) => ({ ...segment, weight: weights[index] }));
}

export function resizeWheelSegments(segments: WheelSegment[], size: 4 | 6 | 8): WheelSegment[] {
  const next = segments.slice(0, size).map((segment) => ({ ...segment }));
  // Keep existing custom field descriptions; provide sensible new defaults.
  for (const suggestion of WHEEL_SUGGESTIONS) {
    if (next.length >= size) break;
    if (!next.some((segment) => segment.id === suggestion.id)) next.push({ ...suggestion });
  }
  let extra = 1;
  while (next.length < size) {
    next.push({
      id: `field_${extra++}`, icon: "🎯", label: "Neues Feld",
      description: "Eine lustige Kabinenaufgabe", weight: 1,
      category: next.length % 2 === 0 ? "luck" : "challenge",
    });
  }
  // Field count changes always start with a valid, almost-equal distribution.
  return equalizeWheelSegments(next);
}

export function applyWheelChancePreset(segments: WheelSegment[], luckPercent: 40 | 50 | 60): WheelSegment[] {
  // If the admin marked everything the same, supply a meaningful 50/50 split
  // of classifications for the one-click preset.
  const hasLuck = segments.some((segment) => segment.category === "luck");
  const hasChallenge = segments.some((segment) => segment.category === "challenge");
  const classified = hasLuck && hasChallenge
    ? segments.map((segment) => ({ ...segment }))
    : segments.map((segment, i) => ({
        ...segment, category: (i % 2 === 0 ? "luck" : "challenge") as WheelCategory,
      }));
  const luckCount = classified.filter((segment) => segment.category === "luck").length;
  const challengeCount = classified.length - luckCount;
  const luckWeights = distribute(luckPercent, luckCount);
  const challengeWeights = distribute(100 - luckPercent, challengeCount);
  let luckIndex = 0, challengeIndex = 0;
  return classified.map((segment) => ({
    ...segment,
    weight: segment.category === "luck"
      ? luckWeights[luckIndex++]
      : challengeWeights[challengeIndex++],
  }));
}

export function getWheelSegmentMidpoint(segments: WheelSegment[], id: string): number {
  let degrees = 0;
  for (const segment of segments) {
    const width = segment.weight * 3.6;
    if (segment.id === id) return degrees + width / 2;
    degrees += width;
  }
  return 180;
}

export function pickWheelSegment(segments: WheelSegment[], point: number): WheelSegment {
  let cursor = 0;
  for (const segment of segments) {
    cursor += segment.weight;
    if (point < cursor) return segment;
  }
  return segments[segments.length - 1];
}
