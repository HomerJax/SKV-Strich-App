import type { MvpShareImageProps } from "./mvp-share.types";
import PremiumBadge from "./PremiumBadge";
import ShareTopBar from "@/components/share/ShareTopBar";
import { buildPalette } from "@/components/share/result-share/result-share.palette";

type TeamLayoutProps = Omit<MvpShareImageProps, "mode">;

function getAccent(label: string) {
  const lower = label.toLowerCase();

  if (lower.includes("goat")) return {
    top: "linear-gradient(135deg,#7c3aed 0%,#db2777 48%,#facc15 100%)",
    glow: "rgba(217,70,239,0.42)",
    label: "#f0abfc",
  };

  if (lower.includes("gold")) return {
    top: "linear-gradient(135deg,#92400e 0%,#f59e0b 48%,#fde68a 100%)",
    glow: "rgba(245,158,11,0.38)",
    label: "#fde68a",
  };

  if (lower.includes("silber")) return {
    top: "linear-gradient(135deg,#334155 0%,#94a3b8 48%,#f8fafc 100%)",
    glow: "rgba(148,163,184,0.34)",
    label: "#e2e8f0",
  };

  if (lower.includes("bronze")) return {
    top: "linear-gradient(135deg,#7c2d12 0%,#ea580c 50%,#fed7aa 100%)",
    glow: "rgba(249,115,22,0.36)",
    label: "#fed7aa",
  };

  return {
    top: "linear-gradient(135deg,#1f2937 0%,#52525b 48%,#d4d4d8 100%)",
    glow: "rgba(113,113,122,0.34)",
    label: "#d4d4d8",
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
  const topThree = leaderboard.slice(0, 3);
  const accent = getAccent(winner.badgeLabel);

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
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          borderRadius: 36,
          background: "linear-gradient(180deg,#020617 0%,#07111f 48%,#020617 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Editorial color slab like result cards */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 500,
            background: accent.top,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 290,
            left: -120,
            width: 1320,
            height: 760,
            borderRadius: "999px",
            background: accent.glow,
            filter: "blur(120px)",
            transform: "rotate(-10deg)",
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

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(1,4,10,0.96) 0%, rgba(1,4,10,0.74) 34%, rgba(1,4,10,0.18) 74%, rgba(1,4,10,0.02) 100%)",
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

        {/* Huge Result-Card-like headline */}
        <div
          style={{
            position: "absolute",
            top: 214,
            left: 52,
            right: 52,
            display: "flex",
            flexDirection: "column",
            zIndex: 5,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 154,
              fontWeight: 900,
              letterSpacing: -10,
              lineHeight: 0.78,
              color: "#ffffff",
              textTransform: "uppercase",
            }}
          >
            MVP
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 8,
              fontSize: 104,
              fontWeight: 900,
              letterSpacing: -6,
              lineHeight: 0.82,
              color: "#ffffff",
              textTransform: "uppercase",
            }}
          >
            gewählt.
          </div>

          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              marginTop: 24,
              padding: "10px 15px",
              borderRadius: 999,
              background: "rgba(2,6,12,0.72)",
              border: "1px solid rgba(255,255,255,0.16)",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 2.8,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.76)",
            }}
          >
            Award Moment
          </div>
        </div>

        {/* Badge hero */}
        <div
          style={{
            position: "absolute",
            top: 565,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            zIndex: 4,
          }}
        >
          <PremiumBadge
            badgeImageUrl={badgeImageUrl}
            size={555}
            glowColor={accent.glow}
            glowStrength={1.05}
            imageFilter="drop-shadow(0 60px 100px rgba(0,0,0,0.84)) drop-shadow(0 0 34px rgba(255,255,255,0.20))"
          />
        </div>

        {/* Winner result block */}
        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            top: 1085,
            zIndex: 6,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 4.4,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            Glückwunsch
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 12,
              fontSize: 86,
              fontWeight: 900,
              letterSpacing: -5,
              lineHeight: 0.92,
              color: "#ffffff",
            }}
          >
            {winner.name}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: 28,
              fontWeight: 800,
              color: "rgba(255,255,255,0.62)",
            }}
          >
            Spieler des Trainings · {sessionDateLabel}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 1284,
            left: 56,
            right: 56,
            display: "flex",
            gap: 14,
            zIndex: 7,
          }}
        >
          <div style={{
            display: "flex",
            padding: "15px 24px",
            borderRadius: 999,
            background: "#ffffff",
            color: "#020617",
            fontSize: 28,
            fontWeight: 900,
          }}>
            MVP #{winner.current}
          </div>

          <div style={{
            display: "flex",
            padding: "15px 24px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.76)",
            fontSize: 26,
            fontWeight: 900,
          }}>
            {winner.previous} → {winner.current}
          </div>

          <div style={{
            display: "flex",
            padding: "15px 24px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: accent.label,
            fontSize: 26,
            fontWeight: 900,
          }}>
            {winner.badgeLabel}
          </div>
        </div>

        {topThree.length > 1 ? (
          <div
            style={{
              position: "absolute",
              left: 56,
              right: 56,
              top: 1408,
              display: "flex",
              flexDirection: "column",
              padding: 28,
              borderRadius: 34,
              background: "rgba(255,255,255,0.94)",
              color: "#020617",
              zIndex: 8,
            }}
          >
            <div style={{
              display: "flex",
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "rgba(15,23,42,0.38)",
            }}>
              Voting Ergebnis
            </div>

            {topThree.map((entry, index) => (
              <div
                key={entry.playerId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 18,
                  paddingBottom: index < topThree.length - 1 ? 16 : 0,
                  borderBottom:
                    index < topThree.length - 1
                      ? "1px solid rgba(15,23,42,0.08)"
                      : "none",
                  gap: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    display: "flex",
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    background: index === 0 ? "#020617" : "rgba(15,23,42,0.06)",
                    color: index === 0 ? "#ffffff" : "rgba(15,23,42,0.55)",
                    fontSize: 20,
                    fontWeight: 900,
                  }}>
                    {index + 1}
                  </div>

                  <div style={{
                    display: "flex",
                    fontSize: 27,
                    fontWeight: 900,
                    letterSpacing: -0.7,
                  }}>
                    {entry.name}
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  fontSize: 23,
                  fontWeight: 900,
                  color: "rgba(15,23,42,0.52)",
                }}>
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
            bottom: 50,
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
            zIndex: 9,
          }}
        >
          <div style={{ display: "flex" }}>created with strikr</div>
          <div style={{ display: "flex" }}>@getstrikr · www.strikr.team</div>
        </div>
      </div>
    </div>
  );
}
