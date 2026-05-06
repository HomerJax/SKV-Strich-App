/* eslint-disable @next/next/no-img-element */

import type { Palette } from "@/components/share/result-share/result-share.types";

type ShareTopBarVariant = "glass" | "muted" | "bright";

type ShareTopBarProps = {
  clubName: string;
  clubLogoUrl?: string | null;
  strikrLogoUrl?: string | null;
  palette: Palette;
  dark?: boolean;
  variant?: ShareTopBarVariant;
};

function getSurface(dark: boolean, variant: ShareTopBarVariant) {
  if (variant === "bright") {
    return {
      panelBg: "rgba(255,255,255,0.16)",
      logoBg: "rgba(255,255,255,0.18)",
      border: "1px solid rgba(255,255,255,0.24)",
      textPrimary: "#ffffff",
      textSecondary: "rgba(255,255,255,0.72)",
      divider: "rgba(255,255,255,0.18)",
    };
  }

  if (variant === "muted") {
    return {
      panelBg: "rgba(255,255,255,0.72)",
      logoBg: "rgba(15,23,42,0.07)",
      border: "1px solid rgba(15,23,42,0.08)",
      textPrimary: "#020617",
      textSecondary: "rgba(15,23,42,0.52)",
      divider: "rgba(15,23,42,0.12)",
    };
  }

  return {
    panelBg: dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.72)",
    logoBg: dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.07)",
    border: dark
      ? "1px solid rgba(255,255,255,0.14)"
      : "1px solid rgba(15,23,42,0.08)",
    textPrimary: dark ? "#ffffff" : "#020617",
    textSecondary: dark ? "rgba(255,255,255,0.72)" : "rgba(15,23,42,0.52)",
    divider: dark ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.12)",
  };
}

function ShareClubBadge({
  clubName,
  clubLogoUrl,
  strikrLogoUrl,
  dark = true,
  variant = "glass",
}: ShareTopBarProps) {
  const logoSrc = clubLogoUrl ?? strikrLogoUrl ?? null;
  const surface = getSurface(dark, variant);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        minWidth: 360,
        maxWidth: 560,
        padding: "16px 22px 16px 16px",
        borderRadius: 26,
        background: surface.panelBg,
        border: surface.border,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: surface.logoBg,
          border: surface.border,
          flexShrink: 0,
        }}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={clubName}
            width={72}
            height={72}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              padding: 8,
            }}
          />
        ) : (
          <div
            style={{
              color: surface.textPrimary,
              fontSize: 28,
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
          fontSize: 24,
          fontWeight: 900,
          color: surface.textPrimary,
          maxWidth: 420,
          letterSpacing: "-0.7px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {clubName}
      </div>
    </div>
  );
}

function ShareStrikrBadge({
  strikrLogoUrl,
  dark = true,
  variant = "glass",
}: {
  strikrLogoUrl?: string | null;
  dark?: boolean;
  variant?: ShareTopBarVariant;
}) {
  const surface = getSurface(dark, variant);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 250,
        padding: "18px 18px 14px",
        borderRadius: 26,
        background: surface.panelBg,
        border: surface.border,
      }}
    >
      {strikrLogoUrl ? (
        <img
          src={strikrLogoUrl}
          alt="strikr"
          width={68}
          height={68}
          style={{
            width: 68,
            height: 68,
            borderRadius: 18,
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : null}

      <div
        style={{
          display: "flex",
          fontSize: 30,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: -1.2,
          color: surface.textPrimary,
        }}
      >
        strikr
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 11,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          color: surface.textSecondary,
        }}
      >
        TEAM TRAINING. REDEFINED.
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 4,
          paddingTop: 10,
          borderTop: `1px solid ${surface.divider}`,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 12,
            fontWeight: 800,
            color: surface.textSecondary,
          }}
        >
          @getstrikr
        </div>

        <div
          style={{
            display: "flex",
            width: 1,
            height: 12,
            background: surface.divider,
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 12,
            fontWeight: 800,
            color: dark ? "#86efac" : "#059669",
          }}
        >
          www.strikr.team
        </div>
      </div>
    </div>
  );
}

export default function ShareTopBar(props: ShareTopBarProps) {
  const variant = props.variant ?? "glass";

  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        top: 28,
        left: 28,
        right: 28,
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 24,
      }}
    >
      <ShareClubBadge {...props} variant={variant} />

      <ShareStrikrBadge
        strikrLogoUrl={props.strikrLogoUrl}
        dark={props.dark}
        variant={variant}
      />
    </div>
  );
}