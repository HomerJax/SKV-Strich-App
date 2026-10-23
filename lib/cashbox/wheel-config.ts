export type WheelSegment = {
  id: string;
  icon: string;
  label: string;
  description: string;
  weight: number;
};

export const DEFAULT_WHEEL_SEGMENTS: WheelSegment[] = [
  { id: "lucky", icon: "🍀", label: "Joker", description: "Heute keine Kabinensprüche", weight: 10 },
  { id: "usual", icon: "😎", label: "Bleibt", description: "Keine Zusatzaufgabe", weight: 70 },
  { id: "confession", icon: "🎤", label: "Beichte", description: "Erzähl deine beste Ausrede", weight: 15 },
  { id: "challenge", icon: "🔥", label: "Challenge", description: "Du übernimmst das Aufwärmen", weight: 5 },
];

export const WHEEL_COLORS = [
  "#05A6AE", "#173C56", "#C08737", "#A94D6F", "#375C9C",
  "#138F65", "#A45B24", "#754B9F", "#18758D", "#8E5D4A",
];

export function parseWheelSegments(input: unknown): WheelSegment[] | null {
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
    ids.add(row.id);
    total += row.weight;
    segments.push({
      id: row.id,
      icon: row.icon.trim(),
      label: row.label.trim(),
      description: row.description.trim(),
      weight: row.weight,
    });
  }
  return total === 100 ? segments : null;
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
