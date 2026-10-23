// Player-facing wheel contract: no odds, weights, or admin presets in this bundle.
export type PublicWheelSegment = {
  id: string;
  icon: string;
  label: string;
  description: string;
  category: "luck" | "challenge";
};

export const PUBLIC_WHEEL_COLORS = [
  "#05A6AE", "#173C56", "#C08737", "#A94D6F", "#375C9C",
  "#138F65", "#A45B24", "#754B9F", "#18758D", "#8E5D4A",
];

export function visibleSegmentMidpoint(segments: PublicWheelSegment[], id: string): number {
  if (!segments.length) return 0;
  const index = segments.findIndex((segment) => segment.id === id);
  return index < 0 ? 0 : (index + 0.5) * (360 / segments.length);
}
