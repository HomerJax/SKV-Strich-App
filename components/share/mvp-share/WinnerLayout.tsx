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
      hook: "Diskussion beendet.",
      glow:
        "radial-gradient(circle at 20% 28%, rgba(34,211,238,0.58), transparent 32%), radial-gradient(circle at 72% 26%, rgba(236,72,153,0.72), transparent 34%), radial-gradient(circle at 48% 74%, rgba(250,204,21,0.46), transparent 38%)",
      badgeSize: 850,
      glowStrength: 1.85,
      backgroundGlowOpacity: 0.86,
      whiteGlowOpacity: 0.5,
      lowerGlowOpacity: 0.32,
      imageFilter:
        "drop-shadow(0 64px 108px rgba(0,0,0,0.82)) drop-shadow(0 0 90px rgba(236,72,153,0.72)) drop-shadow(0 0 54px rgba(34,211,238,0.48)) drop-shadow(0 0 34px rgba(250,204,21,0.34)) saturate(1.35) contrast(1.12)",
    };
  }

  if (mvpCount >= 7) {
    return {
      sub: "Dominanz.",
      badge: "gold strikr badge",
      tone: "#fde68a",
      hook: "Statement gesetzt.",
      glow: "rgba(250,204,21,0.78)",
      badgeSize: 790,
      glowStrength: 1.65,
      backgroundGlowOpacity: 0.78,
      whiteGlowOpacity: 0.45,
      lowerGlowOpacity: 0.28,
      imageFilter:
        "drop-shadow(0 60px 102px rgba(0,0,0,0.78)) drop-shadow(0 0 86px rgba(250,204,21,0.76)) drop-shadow(0 0 38px rgba(255,255,255,0.34)) saturate(1.18) contrast(1.09)",
    };
  }

  if (mvpCount >= 5) {
    return {
      sub: "Jetzt wird’s ernst.",
      badge: "silber strikr badge",
      tone: "#f1f5f9",
      hook: "Heute geliefert.",
      glow: "rgba(226,232,240,0.58)",
      badgeSize: 720,
      glowStrength: 1.35,
      backgroundGlowOpacity: 0.66,
      whiteGlowOpacity: 0.34,
      lowerGlowOpacity: 0.2,
      imageFilter:
        "drop-shadow(0 56px 94px rgba(0,0,0,0.72)) drop-shadow(0 0 58px rgba(226,232,240,0.56)) drop-shadow(0 0 24px rgba(148,163,184,0.28)) saturate(1.03) contrast(1.07)",
    };
  }

  if (mvpCount >= 3) {
    return {
      sub: "Kein Zufall mehr.",
      badge: "bronze strikr badge",
      tone: "#fed7aa",
      hook: "War kein Zufall.",
      glow: "rgba(251,146,60,0.48)",
      badgeSize: 700,
      glowStrength: 1.18,
      backgroundGlowOpacity: 0.56,
      whiteGlowOpacity: 0.25,
      lowerGlowOpacity: 0.14,
      imageFilter:
        "drop-shadow(0 52px 90px rgba(0,0,0,0.70)) drop-shadow(0 0 44px rgba(251,146,60,0.42)) drop-shadow(0 0 18px rgba(255,237,213,0.18)) saturate(1.06) contrast(1.05)",
    };
  }

  return {
    sub: "Erstes Zeichen gesetzt.",
    badge: "blechernes strikr badge",
    tone: "#9ca3af",
    hook: "Ab jetzt zählt’s.",
    glow: "rgba(90,95,100,0.18)",
    badgeSize: 690,
    glowStrength: 0.55,
    backgroundGlowOpacity: 0.34,
    whiteGlowOpacity: 0.14,
    lowerGlowOpacity: 0.06,
    imageFilter:
      "brightness(0.6) contrast(1.3) saturate(0.2) sepia(0.15) drop-shadow(0 55px 90px rgba(0,0,0,0.85)) drop-shadow(0 0 10px rgba(90,95,100,0.12))",
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
            "radial-gradient(circle at 80% 12%, rgba(255,255,255,0.08), transparent 25%), linear-gradient(180deg,#050713,#000000)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 250,
            left: 95,
            width: 840,
            height: 570,
            borderRadius: "999px",
            background: copy.glow,
            opacity: copy.backgroundGlowOpacity,
            filter: "blur(150px)",
            transform: "rotate(-12deg)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 665,
            left: 160,
            width: 760,
            height: 560,
            borderRadius: "999px",
            background: "rgba(255,255,255,0.14)",
            opacity: copy.whiteGlowOpacity,
            filter: "blur(165px)",
            transform: "rotate(10deg)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 900,
            left: -110,
            width: 1280,
            height: 420,
            borderRadius: "999px",
            background: copy.glow,
            opacity: copy.lowerGlowOpacity,
            filter: "blur(135px)",
            transform: "rotate(-8deg)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.04,
            backgroundImage:
              "repeating-linear-gradient(90deg,#ffffff 0px,#ffffff 1px,transparent 1px,transparent 90px)",
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
            display: "flex",
            position: "absolute",
            top: 320,
            left: 56,
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 36,
              letterSpacing: 8,
              color: "rgba(255,255,255,0.55)",
              fontWeight: 900,
            }}
          >
            ICH WURDE ZUM
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 200,
              fontWeight: 900,
              letterSpacing: -14,
              lineHeight: 0.9,
              marginTop: 6,
            }}
          >
            MVP
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: 42,
              fontWeight: 900,
              color: "rgba(255,255,255,0.8)",
            }}
          >
            gewählt. {copy.sub}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 630,
            left: 0,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            zIndex: 3,
          }}
        >
          <PremiumBadge
            badgeImageUrl={badgeImageUrl}
            size={Math.min(copy.badgeSize, 560)}
            glowColor={copy.glow}
            glowStrength={Math.min(copy.glowStrength, 0.9)}
            imageFilter="drop-shadow(0 42px 76px rgba(0,0,0,0.62)) drop-shadow(0 0 24px rgba(255,255,255,0.16))"
          />
        </div>

        <div
          style={{
            position: "absolute",
            top: 1380,
            width: "100%",
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontWeight: 900,
              color: copy.tone,
              textTransform: "uppercase",
            }}
          >
            {copy.badge}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 26,
              marginTop: 4,
              color: "rgba(255,255,255,0.6)",
              fontWeight: 800,
            }}
          >
            freigeschaltet
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 1500,
            width: "100%",
            display: "flex",
            justifyContent: "center",
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
              background: "rgba(255,255,255,0.1)",
              padding: "16px 28px",
              borderRadius: 999,
              fontSize: 28,
              fontWeight: 900,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {winner.previous} → {winner.current}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 1620,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 900,
            color: "rgba(255,255,255,0.65)",
          }}
        >
          {copy.hook}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 32,
            right: 32,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "rgba(255,255,255,0.45)",
          }}
        >
          <div style={{ display: "flex" }}>{sessionDateLabel}</div>
          <div style={{ display: "flex" }}>created with strikr</div>
        </div>
      </div>
    </div>
  );
}