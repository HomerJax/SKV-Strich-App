/* eslint-disable @next/next/no-img-element */

import type { Palette } from "@/components/share/result-share/result-share.types";

type ShareTopBarProps = {
  clubName: string;
  clubLogoUrl?: string | null;
  strikrLogoUrl?: string | null;
  palette: Palette;
  dark?: boolean;
};

function glassBg(dark: boolean) {
  return dark ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.72)";
}

function glassBorder(dark: boolean) {
  return dark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(15,23,42,0.08)";
}

function ShareStrikrBadge({
  strikrLogoUrl,
  dark = true,
}: {
  strikrLogoUrl?: string | null;
  dark?: boolean;
}) {
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
        borderRadius: 24,
        background: glassBg(dark),
        border: glassBorder(dark),
        backdropFilter: "blur(14px)",
        boxShadow: dark
          ? "0 24px 70px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.10)"
          : "0 20px 60px rgba(15,23,42,0.10)",
      }}
    >
      {strikrLogoUrl ? (
        <img
          src={strikrLogoUrl}
          alt="strikr"
          style={{
            width: 68,
            height: 68,
            borderRadius: 18,
            objectFit: "cover",
            display: "flex",
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
          color: "#FFFFFF",
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
          color: "rgba(255,255,255,0.74)",
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
          borderTop: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div style={{ display: "flex", fontSize: 12, fontWeight: 800 }}>
          @getstrikr
        </div>

        <div
          style={{
            display: "flex",
            width: 1,
            height: 12,
            background: "rgba(255,255,255,0.18)",
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 12,
            fontWeight: 800,
            color: "#34d399",
          }}
        >
          www.strikr.team
        </div>
      </div>
    </div>
  );
}

function ShareClubBadge({
  clubName,
  clubLogoUrl,
  strikrLogoUrl,
  palette,
  dark = true,
}: ShareTopBarProps) {
  const logoSrc = clubLogoUrl ?? strikrLogoUrl ?? null;

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
          background: dark ? "rgba(255,255,255,0.12)" : "#FFFFFF",
          border: dark
            ? "1px solid rgba(255,255,255,0.20)"
            : "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10)",
          flexShrink: 0,
        }}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={clubName}
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
              color: dark ? "#FFFFFF" : "#0F172A",
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
          fontSize: 26,
          fontWeight: 900,
          color: palette.textPrimary,
          maxWidth: 420,
          letterSpacing: "-0.6px",
        }}
      >
        {clubName}
      </div>
    </div>
  );
}

export default function ShareTopBar(props: ShareTopBarProps) {
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
        zIndex: 10,
      }}
    >
      <ShareClubBadge {...props} />
      <ShareStrikrBadge strikrLogoUrl={props.strikrLogoUrl} dark={props.dark} />
    </div>
  );
}