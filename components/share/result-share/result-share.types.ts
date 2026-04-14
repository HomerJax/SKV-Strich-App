import { ResultShareData } from "@/lib/share/types";

export type ResultShareLayout = "sticker" | "floodlight";

export type ExtendedResultShareData = ResultShareData & {
  sessionId: number;
  clubLogoUrl?: string | null;
  clubName?: string | null;
  strikrLogoUrl?: string | null;
  clubPrimaryColor?: string | null;
  winnerWasShorthanded?: boolean;
  upsetWin?: boolean;
  dramaticFinish?: boolean;
};

export type ShareCopy = {
  kicker: string;
  headline: string;
  subline: string;
};

export type Palette = {
  accent: string;
  accentSoft: string;
  accentGlow: string;
  loser: string;
  textPrimary: string;
  textSecondary: string;
  badgeBg: string;
  panelBg: string;
};