import type { MvpShareImageProps } from "./mvp-share.types";
import PremiumBadge from "./PremiumBadge";
import ShareTopBar from "@/components/share/ShareTopBar";
import { buildPalette } from "@/components/share/result-share/result-share.palette";

type TeamLayoutProps = Omit<MvpShareImageProps, "mode">;

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
          background:
            "radial-gradient(circle at 18% 18%, rgba(255,255,255,0.13), transparent 30%), radial-gradient(circle at 78% 18%, rgba(148,163,184,0.18), transparent 28%), linear-gradient(180deg,#050816 0%,#111827 48%,#020617 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(1,4,10,0.92) 0%, rgba(1,4,10,0.70) 34%, rgba(1,4,10,0.20) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 440,
            left: -170,
            width: 1300,
            height: 650,
            borderRadius: "999px",
            background: "rgba(255,255,255,0.09)",
            filter: "blur(145px)",
            transform: "rotate(-10deg)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 760,
            left: 160,
            width: 760,
            height: 520,
            borderRadius: "999px",
            background: "rgba(15,23,42,0.88)",
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
            left: 56,
            right: 56,
            top: 320,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "10px 14px",
              borderRadius: 999,
              background: "rgba(2,6,12,0.70)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 2.6,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.72)",
            }}
          >
            MVP Award
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 32,
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.52)",
            }}
          >
            Glückwunsch
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 14,
              maxWidth: 850,
              fontSize: 92,
              fontWeight: 900,
              letterSpacing: -5,
              lineHeight: 0.95,
              color: "#ffffff",
            }}
          >
            {winner.name}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 22,
              maxWidth: 820,
              fontSize: 32,
              fontWeight: 800,
              lineHeight: 1.25,
              color: "rgba(255,255,255,0.64)",
            }}
          >
            wurde von seinem Team zum MVP des Trainings gewählt.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 690,
            left: 56,
            right: 56,
            display: "flex",
            alignItems: "center",
            gap: 38,
            padding: 38,
            borderRadius: 46,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(18px)",
          }}
        >
          <PremiumBadge
            badgeImageUrl={badgeImageUrl}
            size={300}
            glowColor="rgba(255,255,255,0.20)"
            glowStrength={0.75}
            imageFilter="drop-shadow(0 44px 80px rgba(0,0,0,0.72)) drop-shadow(0 0 22px rgba(255,255,255,0.18))"
          />

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  padding: "13px 18px",
                  borderRadius: 999,
                  background: "#ffffff",
                  color: "#020617",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                MVP #{winner.current}
              </div>

              <div
                style={{
                  display: "flex",
                  padding: "13px 18px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.72)",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {winner.badgeLabel}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontSize: 42,
                fontWeight: 900,
                letterSpacing: -1.4,
                color: "#ffffff",
              }}
            >
              {winner.previous} → {winner.current}
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 8,
                fontSize: 23,
                fontWeight: 800,
                color: "rgba(255,255,255,0.52)",
                textTransform: "uppercase",
                letterSpacing: 1.3,
              }}
            >
              {winner.earnedBadgeText}
            </div>
          </div>
        </div>

        {topThree.length > 1 ? (
          <div
            style={{
              position: "absolute",
              left: 56,
              right: 56,
              top: 1120,
              display: "flex",
              flexDirection: "column",
              padding: 34,
              borderRadius: 42,
              background: "rgba(255,255,255,0.92)",
              color: "#020617",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "rgba(15,23,42,0.38)",
              }}
            >
              Voting Ergebnis
            </div>

            {topThree.map((entry, index) => (
              <div
                key={entry.playerId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 24,
                  paddingBottom: index < topThree.length - 1 ? 20 : 0,
                  borderBottom:
                    index < topThree.length - 1
                      ? "1px solid rgba(15,23,42,0.08)"
                      : "none",
                  gap: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        index === 0 ? "#020617" : "rgba(15,23,42,0.06)",
                      color: index === 0 ? "#ffffff" : "rgba(15,23,42,0.55)",
                      fontSize: 22,
                      fontWeight: 900,
                    }}
                  >
                    {index + 1}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      fontSize: 31,
                      fontWeight: 900,
                      letterSpacing: -0.8,
                    }}
                  >
                    {entry.name}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    fontWeight: 900,
                    color: "rgba(15,23,42,0.52)",
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
            bottom: 52,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "26px 30px",
            borderRadius: 32,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.72)",
            fontSize: 20,
            fontWeight: 900,
          }}
        >
          <div style={{ display: "flex" }}>created with strikr</div>
          <div style={{ display: "flex" }}>@getstrikr · www.strikr.team</div>
        </div>
      </div>
    </div>
  );
}
