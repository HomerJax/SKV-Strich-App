import type { MvpShareImageProps } from "./mvp-share.types";
import PremiumBadge from "./PremiumBadge";
import ShareTopBar from "@/components/share/ShareTopBar";
import { buildPalette } from "@/components/share/result-share/result-share.palette";

type TeamLayoutProps = Omit<MvpShareImageProps, "mode">;

type TierMeta = {
  label: string;
  key: "blech" | "bronze" | "silber" | "gold" | "goat";
  top: string;
  glow: string;
  text: string;
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
    };
  }

  if (lower.includes("gold")) {
    return {
      label: "Gold",
      key: "gold",
      top: "linear-gradient(135deg,#78350f 0%,#f59e0b 46%,#fde68a 100%)",
      glow: "rgba(245,158,11,0.56)",
      text: "#fde68a",
    };
  }

  if (lower.includes("silber")) {
    return {
      label: "Silber",
      key: "silber",
      top: "linear-gradient(135deg,#0f172a 0%,#94a3b8 52%,#f8fafc 100%)",
      glow: "rgba(203,213,225,0.42)",
      text: "#f1f5f9",
    };
  }

  if (lower.includes("bronze")) {
    return {
      label: "Bronze",
      key: "bronze",
      top: "linear-gradient(135deg,#7c2d12 0%,#ea580c 46%,#fed7aa 100%)",
      glow: "rgba(249,115,22,0.42)",
      text: "#fed7aa",
    };
  }

  return {
    label: "Blech",
    key: "blech",
    top: "linear-gradient(135deg,#d4d4d8 0%,#52525b 48%,#020617 100%)",
    glow: "rgba(161,161,170,0.34)",
    text: "#d4d4d8",
  };
}

export default function TeamLayout({
  strikrLogoUrl,
  clubLogoUrl,
  badgeImageUrl,
  clubName,
  sessionDateLabel,
  winner,
  leaderboard,
}: TeamLayoutProps) {
  const palette = buildPalette(null, "floodlight");
  const tier = getTierMeta(winner.badgeLabel);
  const topThree = leaderboard.slice(0, 3);

  return (
    <div
      style={{
        display: "flex",
        width: "1080px",
        height: "1920px",
        padding: 24,
        background: "#020617",
        color: "#020617",
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
          background: "#f8fafc",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 540,
            background: tier.top,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 360,
            left: -160,
            width: 1320,
            height: 620,
            borderRadius: "999px",
            background: tier.glow,
            opacity: 0.65,
            filter: "blur(120px)",
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
            top: 292,
            left: 54,
            right: 54,
            zIndex: 5,
            color: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 24,
              fontSize: 106,
              fontWeight: 900,
              letterSpacing: -8.5,
              lineHeight: 0.78,
              color: "#ffffff",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                display: "flex",
                fontSize: 116,
                fontWeight: 900,
                letterSpacing: -10,
                textTransform: "lowercase",
              }}
            >
              strikr
            </span>
            <span
              style={{
                display: "flex",
                textTransform: "uppercase",
              }}
            >
              MVP
            </span>
            <span
              style={{
                display: "flex",
                textTransform: "uppercase",
              }}
            >
              Badge
            </span>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 132,
              fontWeight: 900,
              letterSpacing: -9,
              lineHeight: 0.78,
              textTransform: "uppercase",
              color: "#ffffff",
            }}
          >
            {tier.label}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 605,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            zIndex: 6,
          }}
        >
          <PremiumBadge
            badgeImageUrl={badgeImageUrl}
            size={tier.key === "goat" ? 640 : 585}
            glowColor={tier.glow}
            glowStrength={tier.key === "goat" ? 1.45 : 1.05}
            imageFilter={
              tier.key === "blech"
                ? "brightness(0.72) contrast(1.30) saturate(0.35) sepia(0.10) drop-shadow(0 54px 90px rgba(0,0,0,0.78))"
                : "drop-shadow(0 54px 90px rgba(0,0,0,0.78)) drop-shadow(0 0 34px rgba(255,255,255,0.14))"
            }
          />
        </div>

        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            top: 1265,
            zIndex: 7,
            padding: 36,
            borderRadius: 40,
            background: "#ffffff",
            boxShadow: "0 34px 90px rgba(15,23,42,0.18)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "rgba(15,23,42,0.36)",
            }}
          >
            Glückwunsch
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: -5,
              lineHeight: 0.92,
              color: "#020617",
            }}
          >
            {winner.name}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: 28,
              fontWeight: 800,
              color: "rgba(15,23,42,0.58)",
            }}
          >
            wurde zum MVP gewählt.
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 20,
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "14px 22px",
                borderRadius: 999,
                background: "#020617",
                color: "#ffffff",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              MVP #{winner.current}
            </div>

            <div
              style={{
                display: "flex",
                padding: "14px 22px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.06)",
                color: "rgba(15,23,42,0.56)",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {winner.previous} → {winner.current}
            </div>

            <div
              style={{
                display: "flex",
                padding: "14px 22px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.06)",
                color: "rgba(15,23,42,0.56)",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {tier.label}
            </div>
          </div>
        </div>

        {topThree.length > 1 ? (
          <div
            style={{
              position: "absolute",
              left: 56,
              right: 56,
              top: 1578,
              display: "flex",
              flexDirection: "column",
              padding: "22px 28px",
              borderRadius: 30,
              background: "rgba(2,6,23,0.92)",
              color: "#ffffff",
              zIndex: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 15,
                fontWeight: 900,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.38)",
              }}
            >
              Voting Ergebnis
            </div>

            {topThree.slice(0, 2).map((entry, index) => (
              <div
                key={entry.playerId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 14,
                  gap: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 23,
                    fontWeight: 900,
                    letterSpacing: -0.5,
                    color: index === 0 ? "#ffffff" : "rgba(255,255,255,0.62)",
                  }}
                >
                  {index + 1}. {entry.name}
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: 21,
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.52)",
                  }}
                >
                  {entry.votes} {entry.votes === 1 ? "Stimme" : "Stimmen"}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            bottom: 48,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "26px 30px",
            borderRadius: 32,
            background: "#020617",
            color: "rgba(255,255,255,0.72)",
            fontSize: 20,
            fontWeight: 900,
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex" }}>created with strikr</div>
          <div style={{ display: "flex" }}>@getstrikr · strikr.team</div>
        </div>
      </div>
    </div>
  );
}
