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
            "radial-gradient(circle at 18% 16%, rgba(255,255,255,0.18), transparent 28%), radial-gradient(circle at 82% 18%, rgba(59,130,246,0.25), transparent 30%), linear-gradient(180deg,#050816 0%,#0f172a 42%,#020617 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.045,
            backgroundImage:
              "repeating-linear-gradient(90deg,#ffffff 0px,#ffffff 1px,transparent 1px,transparent 88px)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 250,
            left: -160,
            width: 1320,
            height: 720,
            borderRadius: "999px",
            background:
              "radial-gradient(circle at 42% 42%, rgba(255,255,255,0.18), rgba(59,130,246,0.12), transparent 64%)",
            filter: "blur(90px)",
            transform: "rotate(-10deg)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 690,
            left: 180,
            width: 720,
            height: 520,
            borderRadius: "999px",
            background: "rgba(2,6,23,0.88)",
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
            top: 300,
            left: 56,
            right: 56,
            display: "flex",
            flexDirection: "column",
            zIndex: 3,
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
              color: "rgba(255,255,255,0.70)",
            }}
          >
            MVP Award
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 152,
              fontWeight: 900,
              letterSpacing: -10,
              lineHeight: 0.86,
              color: "#ffffff",
            }}
          >
            MVP
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 10,
              maxWidth: 900,
              fontSize: 78,
              fontWeight: 900,
              letterSpacing: -4,
              lineHeight: 0.95,
              color: "#ffffff",
            }}
          >
            {winner.name}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 18,
              maxWidth: 780,
              fontSize: 30,
              fontWeight: 850,
              lineHeight: 1.2,
              color: "rgba(255,255,255,0.62)",
            }}
          >
            wurde von seinem Team zum Spieler des Trainings gewählt.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 650,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          <PremiumBadge
            badgeImageUrl={badgeImageUrl}
            size={520}
            glowColor="rgba(255,255,255,0.24)"
            glowStrength={0.9}
            imageFilter="drop-shadow(0 56px 92px rgba(0,0,0,0.78)) drop-shadow(0 0 28px rgba(255,255,255,0.20))"
          />
        </div>

        <div
          style={{
            position: "absolute",
            top: 1130,
            left: 56,
            right: 56,
            display: "flex",
            gap: 16,
            zIndex: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "16px 26px",
              borderRadius: 999,
              background: "#ffffff",
              color: "#020617",
              fontSize: 30,
              fontWeight: 900,
            }}
          >
            MVP #{winner.current}
          </div>

          <div
            style={{
              display: "flex",
              padding: "16px 26px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.76)",
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            {winner.previous} → {winner.current}
          </div>

          <div
            style={{
              display: "flex",
              padding: "16px 26px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.76)",
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            {winner.badgeLabel}
          </div>
        </div>

        {topThree.length > 1 ? (
          <div
            style={{
              position: "absolute",
              left: 56,
              right: 56,
              top: 1285,
              display: "flex",
              flexDirection: "column",
              padding: 32,
              borderRadius: 38,
              background: "rgba(255,255,255,0.94)",
              color: "#020617",
              zIndex: 5,
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
                  marginTop: 22,
                  paddingBottom: index < topThree.length - 1 ? 18 : 0,
                  borderBottom:
                    index < topThree.length - 1
                      ? "1px solid rgba(15,23,42,0.08)"
                      : "none",
                  gap: 22,
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
                    fontSize: 25,
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
          <div style={{ display: "flex" }}>created with strikr</div>
          <div style={{ display: "flex" }}>@getstrikr · www.strikr.team</div>
        </div>
      </div>
    </div>
  );
}
