// Player-facing wheel contract: no odds, weights, or admin presets in this bundle.
export type PublicWheelSegment = {
  id: string;
  icon: string;
  label: string;
  description: string;
  category: "luck" | "challenge";
};

export const PUBLIC_WHEEL_COLORS = [
  "#0D8896", "#202C4B", "#6954A8", "#146C87", "#385779",
  "#145F62", "#644C93", "#174D73", "#356B87", "#4D4984",
];

export function visibleSegmentMidpoint(segments: PublicWheelSegment[], id: string): number {
  if (!segments.length) return 0;
  const index = segments.findIndex((segment) => segment.id === id);
  return index < 0 ? 0 : (index + 0.5) * (360 / segments.length);
}
