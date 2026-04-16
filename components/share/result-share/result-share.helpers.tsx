/* eslint-disable @next/next/no-img-element */
import { ExtendedResultShareData, Palette } from "./result-share.types";

export function getDisplayClubName(data: ExtendedResultShareData) {
  return data.clubName ?? data.branding.clubName ?? "Club Session";
}

export function getClubLogoUrl(data: ExtendedResultShareData) {
  return data.clubLogoUrl ?? data.branding.clubCrestUrl ?? null;
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
        gap: 18,
      }}
    >
      {params.strikrLogoUrl ? (
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: params.dark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
            border: params.dark
              ? "1px solid rgba(255,255,255,0.14)"
              : "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
            flexShrink: 0,
          }}
        >
          <img
            src={params.strikrLogoUrl}
            alt="Strikr"
            width={96}
            height={96}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              padding: 10,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: params.dark ? "#FFFFFF" : params.palette.accent,
            color: params.dark ? "#0F172A" : "#FFFFFF",
            fontSize: 28,
            fontWeight: 900,
            flexShrink: 0,
            boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
          }}
        >
          S
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 20,
            fontWeight: 900,
            color: params.palette.textPrimary,
            letterSpacing: "-0.4px",
            lineHeight: 1.1,
          }}
        >
          STRIKR
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 13,
            fontWeight: 700,
            color: params.palette.textSecondary,
            lineHeight: 1.15,
          }}
        >
          Training managed by STRIKR
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
  const fallbackLogo = params.strikrLogoUrl ?? null;
  const logoSrc = params.clubLogoUrl ?? fallbackLogo;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div
        style={{
          width: 116,
          height: 116,
          borderRadius: 28,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: params.dark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
          border: params.dark
            ? "1px solid rgba(255,255,255,0.14)"
            : "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
          flexShrink: 0,
        }}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={params.clubName}
            width={116}
            height={116}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              padding: 12,
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              color: params.dark ? "#FFFFFF" : "#0F172A",
              fontSize: 34,
              fontWeight: 900,
            }}
          >
            S
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 800,
            color: params.palette.textPrimary,
            maxWidth: 390,
            lineHeight: 1.08,
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
  if (params.winnerPhotoUrl) {
    return (
      <div
        style={{
          width: params.width,
          height: params.height,
          display: "flex",
          borderRadius: params.borderRadius,
          overflow: "hidden",
          position: "relative",
          background: params.dark ? "#0F172A" : "#E5E7EB",
        }}
      >
        <img
          src={params.winnerPhotoUrl}
          alt="Siegerfoto"
          width={params.width}
          height={params.height}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(to top, rgba(15,23,42,0.34), rgba(15,23,42,0.06) 40%, rgba(15,23,42,0))",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: params.width,
        height: params.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: params.borderRadius,
        background: params.dark
          ? "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))"
          : "linear-gradient(135deg, rgba(15,23,42,0.06), rgba(15,23,42,0.02))",
        color: params.palette.textSecondary,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background: `
            radial-gradient(circle at 30% 25%, ${params.palette.accentGlow}, transparent 28%),
            linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))
          `,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          zIndex: 1,
          textAlign: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontWeight: 900,
            color: params.palette.textPrimary,
            letterSpacing: "-0.8px",
          }}
        >
          STRIKR
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 18,
            fontWeight: 700,
            color: params.palette.textSecondary,
          }}
        >
          Match Result
        </div>
      </div>
    </div>
  );
}