import type { ReactNode } from "react";
import ResultShareCard from "./ResultShareCard";
import type { ExtendedResultShareData } from "./result-share.types";

const PILOT_ID = "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60";

export function isStorySharePilotClub(clubId: string | null | undefined): boolean {
  return clubId === PILOT_ID;
}

/**
 * Instagram Story 1080×1920 without redesigning or scaling the existing 1080×1350 share card.
 * Original artwork is pixel-perfect in the center, with only 285px of plain matching
 * background above and below. These areas are kept free of text for Instagram UI.
 */
export function StorySizeCanvas({
  children,
  background = "#020617",
}: {
  children: ReactNode;
  background?: string;
}) {
  return (
    <div style={{
      display: "flex",
      width: 1080,
      height: 1920,
      flexDirection: "column",
      background,
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", width: 1080, height: 285, flexShrink: 0 }} />
      <div style={{ display: "flex", width: 1080, height: 1350, flexShrink: 0 }}>
        {children}
      </div>
      <div style={{ display: "flex", width: 1080, height: 285, flexShrink: 0 }} />
    </div>
  );
}

export function ResultStoryShareCard({ data }: { data: ExtendedResultShareData }) {
  return (
    <StorySizeCanvas background="#020617">
      <ResultShareCard data={data} />
    </StorySizeCanvas>
  );
}
