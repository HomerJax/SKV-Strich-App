/* eslint-disable @next/next/no-img-element */
import { ExtendedResultShareData, Palette } from "./result-share.types";

export function getDisplayClubName(data: ExtendedResultShareData) {
  return data.clubName ?? data.branding.clubName ?? "Club Session";
}

export function getClubLogoUrl(_data: ExtendedResultShareData) {
  return null;
}

export function getScoreModel(data: ExtendedResultShareData) {
  const goalsA = Number(data.goalsA ?? 0);
  const goalsB = Number(data.goalsB ?? 0);

  return {
    goalsA,
    goalsB,
    isDraw: goalsA === goalsB,
    teamAIsWinner: goalsA >= goalsB,
  };
}

export function renderBrandFooter(params: {
  palette: Palette;
  strikrLogoUrl?: string | null;
  dark: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      {params.strikrLogoUrl ? (
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: params.dark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
            border: params.dark
              ? "1px solid rgba(255,255,255,0.12)"
              : "1px solid rgba(15,23,42,0.08)",
            flexShrink: 0,
          }}
        >
          <img
            src={params.strikrLogoUrl}
            alt="Strikr"
            width={30}
            height={30}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              padding: 4,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: params.dark ? "#FFFFFF" : params.palette.accent,
            color: params.dark ? "#0F172A" : "#FFFFFF",
            fontSize: 14,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          S
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 11,
            fontWeight: 900,
            color: params.palette.textPrimary,
            letterSpacing: "-0.3px",
          }}
        >
          Strikr
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 9,
            fontWeight: 600,
            color: params.palette.textSecondary,
          }}
        >
          powered by strikr
        </div>
      </div>
    </div>
  );
}

export function renderClubBadge(params: {
  clubName: string;
  clubLogoUrl: string | null;
  palette: Palette;
  dark: boolean;
  strikrLogoUrl?: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: params.dark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
          border: params.dark
            ? "1px solid rgba(255,255,255,0.14)"
            : "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
          flexShrink: 0,
          color: params.dark ? "#FFFFFF" : "#0F172A",
          fontSize: 18,
          fontWeight: 900,
        }}
      >
        S
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 14,
            fontWeight: 800,
            color: params.palette.textPrimary,
            maxWidth: 240,
          }}
        >
          {params.clubName}
        </div>
      </div>
    </div>
  );
}

export function renderPhotoOrFallback(params: {
  winnerPhotoUrl?: string | null;
  palette: Palette;
  dark: boolean;
  width: number;
  height: number;
  borderRadius: number;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: params.borderRadius,
        background: params.dark
          ? "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))"
          : "linear-gradient(135deg, rgba(15,23,42,0.06), rgba(15,23,42,0.02))",
        color: params.palette.textSecondary,
        fontSize: 28,
        fontWeight: 700,
      }}
    >
      Kein Siegerfoto
    </div>
  );
}