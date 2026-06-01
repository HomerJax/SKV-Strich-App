/* eslint-disable @next/next/no-img-element */

import type { MvpShareImageProps } from "./mvp-share.types";
import PremiumBadge from "./PremiumBadge";
import ShareTopBar from "@/components/share/ShareTopBar";
import { buildPalette } from "@/components/share/result-share/result-share.palette";

type WinnerLayoutProps = Omit<MvpShareImageProps, "mode" | "leaderboard">;

type TierMeta = {
  label: string;
  key: "blech" | "bronze" | "silber" | "gold" | "goat";
  top: string;
  glow: string;
  text: string;
  sub: string;
};

function getTierMeta(label: string): TierMeta {
  const lower = label.toLowerCase();

  if (lower.includes("goat")) {
    return {
      label: "GOAT",
      key: "goat",
      top: "linear-gradient(135deg,#312e81 0%,#db2777 42%,#facc15 72%,#22d3ee 100%)",
      glow: "rgba(217,70,239,0.70)",
      text: "#f0abfc",
      sub: "Legendenstatus.",
    };
  }

  if (lower.includes("gold")) {
    return {
      label: "Gold",
      key: "gold",
      top: "linear-gradient(135deg,#78350f 0%,#f59e0b 46%,#fde68a 100%)",
      glow: "rgba(245,158,11,0.56)",
      text: "#fde68a",
      sub: "Statement gesetzt.",
    };
  }

  if (lower.includes("silber")) {
    return {
      label: "Silber",
      key: "silber",
      top: "linear-gradient(135deg,#0f172a 0%,#94a3b8 52%,#f8fafc 100%)",
      glow: "rgba(203,213,225,0.42)",
      text: "#f1f5f9",
      sub: "Jetzt wird’s ernst.",
    };
  }

  if (lower.includes("bronze")) {
    return {
      label: "Bronze",
      key: "bronze",
      top: "linear-gradient(135deg,#7c2d12 0%,#ea580c 46%,#fed7aa 100%)",
      glow: "rgba(249,115,22,0.42)",
      text: "#fed7aa",
      sub: "Kein Zufall mehr.",
    };
  }

  return {
    label: "Blech",
    key: "blech",
    top: "linear-gradient(135deg,#18181b 0%,#3f3f46 42%,#09090b 100%)",
    glow: "rgba(82,82,91,0.42)",
    text: "#a1a1aa",
    sub: "Ab jetzt zählt’s.",
  };
}

export default function WinnerLayout({
  strikrLogoUrl,
  clubLogoUrl,
  badgeImageUrl,
  clubName,
  sessionDateLabel,
  winner,
  sharePerspective = "self",
}: WinnerLayoutProps) {
  const palette = buildPalette(null, "floodlight");
  const tier = getTierMeta(winner.badgeLabel);

  const nextTarget =
    tier.key === "blech"
      ? 3
      : tier.key === "bronze"
        ? 5
        : tier.key === "silber"
          ? 7
          : tier.key === "gold"
            ? 10
            : null;

  const nextLabel =
    tier.key === "blech"
      ? "Bronze"
      : tier.key === "bronze"
        ? "Silber"
        : tier.key === "silber"
          ? "Gold"
          : tier.key === "gold"
            ? "GOAT"
            : null;

  const progressBase =
    tier.key === "blech"
      ? 1
      : tier.key === "bronze"
        ? 3
        : tier.key === "silber"
          ? 5
          : tier.key === "gold"
            ? 7
            : winner.current;

  const progressPercent =
    nextTarget === null
      ? 100
      : Math.max(
          8,
          Math.min(
            100,
            ((winner.current - progressBase) / (nextTarget - progressBase)) * 100
          )
        );

  const progressText =
    nextTarget === null
      ? "Höchstes Badge erreicht"
      : `${winner.current} / ${nextTarget} MVPs bis ${nextLabel}`;

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
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          borderRadius: 36,
          background: "linear-gradient(180deg,#050713 0%,#090b12 48%,#000000 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 560,
            background: tier.top,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 250,
            left: -120,
            width: 1320,
            height: 780,
            borderRadius: "999px",
            background: tier.glow,
            filter: "blur(135px)",
            transform: "rotate(-10deg)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.72) 36%, rgba(0,0,0,0.12) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.055,
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
            position: "absolute",
            top: 285,
            left: 54,
            right: 54,
            zIndex: 5,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 82,
              fontWeight: 900,
              letterSpacing: -5,
              lineHeight: 0.86,
              textTransform: "uppercase",
            }}
          >
            {sharePerspective === "self" ? "Ich wurde" : winner.name}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 10,
              fontSize: 194,
              fontWeight: 900,
              letterSpacing: -15,
              lineHeight: 0.76,
              textTransform: "uppercase",
            }}
          >
            MVP.
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 34,
              fontSize: 40,
              fontWeight: 900,
              color: "rgba(255,255,255,0.70)",
            }}
          >
            {tier.sub}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 690,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            zIndex: 4,
          }}
        >
          <PremiumBadge
            badgeImageUrl={badgeImageUrl}
            fallbackLabel={winner.badgeLabel}
            size={tier.key === "goat" ? 735 : 675}
            glowColor={tier.glow}
            glowStrength={tier.key === "goat" ? 1.7 : 1.12}
            imageFilter={
              tier.key === "blech"
                ? "brightness(0.58) contrast(1.45) saturate(0.18) sepia(0.16) hue-rotate(-8deg) drop-shadow(0 58px 96px rgba(0,0,0,0.86)) drop-shadow(0 0 18px rgba(120,113,108,0.16))"
                : "drop-shadow(0 54px 90px rgba(0,0,0,0.78)) drop-shadow(0 0 34px rgba(255,255,255,0.14))"
            }
          />
        </div>

        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            top: 1405,
            zIndex: 6,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: tier.text,
              }}
            >
              {tier.label} strikr badge
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 14,
                fontSize: 25,
                fontWeight: 800,
                color: "rgba(255,255,255,0.62)",
              }}
            >
              {winner.name} · {clubName} · {sessionDateLabel}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              padding: "28px 34px",
              borderRadius: 32,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.52)",
                }}
              >
                Badge-Fortschritt
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  fontWeight: 900,
                  color: tier.text,
                }}
              >
                {progressText}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                width: "100%",
                height: 16,
                borderRadius: 999,
                background: "rgba(255,255,255,0.14)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: `${progressPercent}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: tier.text,
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 54,
            right: 54,
            bottom: 48,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "26px 30px",
            borderRadius: 32,
            background: "rgba(255,255,255,0.09)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.72)",
            fontSize: 20,
            fontWeight: 900,
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex" }}>earned with strikr</div>
          <div style={{ display: "flex" }}>@getstrikr · strikr.team</div>
        </div>
      </div>
    </div>
  );
}
