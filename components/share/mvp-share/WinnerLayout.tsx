/* eslint-disable @next/next/no-img-element */

import type { MvpShareImageProps } from "./mvp-share.types";
import PremiumBadge from "./PremiumBadge";
import ShareTopBar from "@/components/share/ShareTopBar";
import { buildPalette } from "@/components/share/result-share/result-share.palette";

type WinnerLayoutProps = Omit<MvpShareImageProps, "mode" | "leaderboard">;

function getCopy(mvpCount: number) {
  if (mvpCount >= 10) {
    return {
      sub: "Legendenstatus.",
      badge: "goat strikr badge",
      tone: "#f0abfc",
      glow: "rgba(236,72,153,0.70)",
      badgeSize: 800,
      glowStrength: 1.85,
      imageFilter:
        "drop-shadow(0 64px 108px rgba(0,0,0,0.84)) drop-shadow(0 0 78px rgba(236,72,153,0.70)) drop-shadow(0 0 46px rgba(34,211,238,0.42)) saturate(1.25) contrast(1.12)",
    };
  }

  if (mvpCount >= 7) {
    return {
      sub: "Statement gesetzt.",
      badge: "gold strikr badge",
      tone: "#fde68a",
      glow: "rgba(250,204,21,0.72)",
      badgeSize: 750,
      glowStrength: 1.55,
      imageFilter:
        "drop-shadow(0 60px 102px rgba(0,0,0,0.80)) drop-shadow(0 0 72px rgba(250,204,21,0.70)) drop-shadow(0 0 30px rgba(255,255,255,0.28)) saturate(1.14) contrast(1.08)",
    };
  }

  if (mvpCount >= 5) {
    return {
      sub: "Jetzt wird’s ernst.",
      badge: "silber strikr badge",
      tone: "#f1f5f9",
      glow: "rgba(226,232,240,0.48)",
      badgeSize: 700,
      glowStrength: 1.2,
      imageFilter:
        "drop-shadow(0 56px 94px rgba(0,0,0,0.74)) drop-shadow(0 0 46px rgba(226,232,240,0.42)) saturate(1.02) contrast(1.07)",
    };
  }

  if (mvpCount >= 3) {
    return {
      sub: "Kein Zufall mehr.",
      badge: "bronze strikr badge",
      tone: "#fed7aa",
      glow: "rgba(251,146,60,0.48)",
      badgeSize: 680,
      glowStrength: 1.08,
      imageFilter:
        "drop-shadow(0 52px 90px rgba(0,0,0,0.72)) drop-shadow(0 0 40px rgba(251,146,60,0.38)) saturate(1.06) contrast(1.05)",
    };
  }

  return {
    sub: "Ab jetzt zählt’s.",
    badge: "blechernes strikr badge",
    tone: "#a3a3a3",
    glow: "rgba(82,82,82,0.36)",
    badgeSize: 670,
    glowStrength: 0.82,
    imageFilter:
      "brightness(0.68) contrast(1.34) saturate(0.28) sepia(0.14) drop-shadow(0 56px 94px rgba(0,0,0,0.84)) drop-shadow(0 0 18px rgba(115,115,115,0.22))",
  };
}

export default function WinnerLayout({
  strikrLogoUrl,
  clubLogoUrl,
  badgeImageUrl,
  clubName,
  sessionDateLabel,
  winner,
}: WinnerLayoutProps) {
  const palette = buildPalette(null, "floodlight");
  const copy = getCopy(winner.current);

  return (
    <div
      style={{
        display: "flex",
        width: "1080px",
        height: "1920px",
        padding: 24,
        background: "#020617",
        color: "#ffffff",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 36,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.12), transparent 28%), radial-gradient(circle at 78% 16%, rgba(255,255,255,0.10), transparent 28%), linear-gradient(180deg,#050713 0%,#080b12 48%,#000000 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.05,
            backgroundImage:
              "repeating-linear-gradient(90deg,#ffffff 0px,#ffffff 1px,transparent 1px,transparent 90px)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 245,
            left: 40,
            width: 980,
            height: 720,
            borderRadius: "999px",
            background: copy.glow,
            opacity: 0.62,
            filter: "blur(155px)",
            transform: "rotate(-12deg)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 760,
            left: 100,
            width: 880,
            height: 570,
            borderRadius: "999px",
            background: "rgba(255,255,255,0.10)",
            opacity: 0.40,
            filter: "blur(165px)",
            transform: "rotate(10deg)",
          }}
        />

        <ShareTopBar
          clubName={clubName}
          clubLogoUrl={clubLogoUrl}
          strikrLogoUrl={strikrLogoUrl}
          palette={palette}
          dark
          variant="bright"
        />

        <div
          style={{
            position: "absolute",
            top: 300,
            left: 56,
            right: 56,
            display: "flex",
            flexDirection: "column",
            zIndex: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "10px 14px",
              borderRadius: 999,
              background: "rgba(2,6,12,0.72)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 2.8,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.72)",
            }}
          >
            Award Moment
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 30,
              fontSize: 34,
              letterSpacing: 7,
              color: "rgba(255,255,255,0.54)",
              fontWeight: 900,
            }}
          >
            ICH WURDE ZUM
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 205,
              fontWeight: 900,
              letterSpacing: -15,
              lineHeight: 0.88,
              marginTop: 4,
            }}
          >
            MVP
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: 38,
              fontWeight: 900,
              color: "rgba(255,255,255,0.76)",
            }}
          >
            gewählt. {copy.sub}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 620,
            left: 0,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            zIndex: 3,
          }}
        >
          <PremiumBadge
            badgeImageUrl={badgeImageUrl}
            size={copy.badgeSize}
            glowColor={copy.glow}
            glowStrength={copy.glowStrength}
            imageFilter={copy.imageFilter}
          />
        </div>

        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            top: 1320,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 5,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 900,
              color: copy.tone,
              textTransform: "uppercase",
              letterSpacing: 1.6,
            }}
          >
            {copy.badge}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 14,
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                background: "#ffffff",
                color: "#000000",
                padding: "16px 28px",
                borderRadius: 999,
                fontSize: 32,
                fontWeight: 900,
              }}
            >
              MVP #{winner.current}
            </div>

            <div
              style={{
                display: "flex",
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.10)",
                padding: "16px 28px",
                borderRadius: 999,
                fontSize: 28,
                fontWeight: 900,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              {winner.previous} → {winner.current}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 28,
              padding: "20px 28px",
              borderRadius: 28,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.68)",
              fontSize: 24,
              fontWeight: 800,
              maxWidth: 720,
              textAlign: "center",
              lineHeight: 1.25,
            }}
          >
            {winner.name} · {clubName} · {sessionDateLabel}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            bottom: 52,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px 28px",
            borderRadius: 30,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.72)",
            fontSize: 20,
            fontWeight: 900,
            zIndex: 6,
          }}
        >
          <div style={{ display: "flex" }}>earned with strikr</div>
          <div style={{ display: "flex" }}>@getstrikr · www.strikr.team</div>
        </div>
      </div>
    </div>
  );
}
