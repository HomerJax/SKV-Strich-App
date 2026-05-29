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

/**
 * STRIKR BRAND (oben rechts)
 */
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
        gap: 14,
      }}
    >
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: 22,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: params.dark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
          border: params.dark
            ? "1px solid rgba(255,255,255,0.14)"
            : "1px solid rgba(15,23,42,0.08)",
          boxShadow: params.dark
            ? `0 0 24px ${params.palette.accentGlow}`
            : "0 14px 34px rgba(0,0,0,0.22)",
          flexShrink: 0,
        }}
      >
        {params.strikrLogoUrl ? (
          <img
            src={params.strikrLogoUrl}
            alt="strikr"
            width={84}
            height={84}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              padding: 10,
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#FFFFFF",
              color: "#0F172A",
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            s
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 900,
            color: params.palette.textPrimary,
            letterSpacing: "-0.5px",
            textTransform: "lowercase",
            textShadow: params.dark
              ? `0 0 6px ${params.palette.accentGlow},
                 0 0 18px ${params.palette.accentGlow},
                 0 0 42px ${params.palette.accentGlow}`
              : "none",
          }}
        >
          strikr
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 12,
            fontWeight: 700,
            color: params.palette.textSecondary,
          }}
        >
          training managed
        </div>
      </div>
    </div>
  );
}

/**
 * CLUB BADGE (oben links) → jetzt 50% größer
 */
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
        gap: 20,
      }}
    >
      <div
        style={{
          width: 156,
          height: 156,
          borderRadius: 36,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: params.dark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
          border: params.dark
            ? "1px solid rgba(255,255,255,0.14)"
            : "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          flexShrink: 0,
        }}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={params.clubName}
            width={156}
            height={156}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              padding: 16,
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: params.dark ? "#FFFFFF" : "#0F172A",
              fontSize: 48,
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
          gap: 6,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 900,
            color: params.palette.textPrimary,
            maxWidth: 420,
            letterSpacing: "-0.6px",
          }}
        >
          {params.clubName}
        </div>
      </div>
    </div>
  );
}

/**
 * FOTO / FALLBACK
 */
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
            objectPosition: "center 72%",
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
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: "-0.8px",
            textTransform: "lowercase",
          }}
        >
          strikr
        </div>

        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          Match Result
        </div>
      </div>
    </div>
  );
}