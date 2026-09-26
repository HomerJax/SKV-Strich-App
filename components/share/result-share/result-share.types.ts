import { ResultShareData } from "@/lib/share/types";
import type { AppLocale } from "@/lib/i18n/config";

export type ResultShareLayout = "sticker" | "floodlight" | "sports_editorial";

export type ExtendedResultShareData = ResultShareData & {
  locale?: AppLocale;
  sessionId: number;
  clubLogoUrl?: string | null;
  clubName?: string | null;
  strikrLogoUrl?: string | null;
  clubPrimaryColor?: string | null;
  winnerWasShorthanded?: boolean;
  upsetWin?: boolean;
  dramaticFinish?: boolean;
  winnerPhotoFocusX?: number;
  winnerPhotoFocusY?: number;
  winnerPhotoZoom?: number;
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
