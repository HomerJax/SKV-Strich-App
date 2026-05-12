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
            "radial-gradient(circle at 17% 14%, rgba(96,165,250,0.26), transparent 30%), radial-gradient(circle at 84% 18%, rgba(255,255,255,0.13), transparent 28%), linear-gradient(180deg,#04111f 0%,#08111f 40%,#020617 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
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
            top: 180,
            left: -170,
            width: 1280,
            height: 760,
            borderRadius: "999px",
            background:
              "radial-gradient(circle at 40% 42%, rgba(255,255,255,0.20), rgba(59,130,246,0.16), transparent 64%)",
            filter: "blur(105px)",
            transform: "rotate(-12deg)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(1,4,10,0.94) 0%, rgba(1,4,10,0.72) 28%, rgba(1,4,10,0.25) 62%, rgba(1,4,10,0.08) 100%)",
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

        {/* Editorial headline block, closer to result share cards */}
        <div
          style={{
            position: "absolute",
            top: 265,
            left: 54,
            right: 54,
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
              background: "rgba(2,6,12,0.74)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 2.8,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.72)",
            }}
          >
            MVP Award
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 34,
              fontSize: 138,
              fontWeight: 900,
              letterSpacing: -9,
              lineHeight: 0.84,
              color: "#ffffff",
              textTransform: "uppercase",
            }}
          >
            MVP
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 4,
              fontSize: 91,
              fontWeight: 900,
              letterSpacing: -5,
              lineHeight: 0.86,
              color: "rgba(255,255,255,0.94)",
              textTransform: "uppercase",
            }}
          >
            gewählt.
          </div>
        </div>

        {/* Badge as hero visual, like photo/score area on result cards */}
        <div
          style={{
            position: "absolute",
            top: 570,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          <PremiumBadge
            badgeImageUrl={badgeImageUrl}
            size={545}
            glowColor="rgba(255,255,255,0.23)"
            glowStrength={0.92}
            imageFilter="drop-shadow(0 58px 96px rgba(0,0,0,0.82)) drop-shadow(0 0 30px rgba(255,255,255,0.20))"
          />
        </div>

        {/* Winner block as the result element */}
        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            top: 1080,
            display: "flex",
            flexDirection: "column",
            zIndex: 5,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 4.6,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            Glückwunsch
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: 78,
              fontWeight: 900,
              letterSpacing: -4.5,
              lineHeight: 0.95,
              color: "#ffffff",
              maxWidth: 900,
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
              lineHeight: 1.25,
              color: "rgba(255,255,255,0.62)",
              maxWidth: 760,
            }}
          >
            wurde von seinem Team zum Spieler des Trainings gewählt.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 1292,
            left: 56,
            right: 56,
            display: "flex",
            gap: 14,
            zIndex: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "15px 24px",
              borderRadius: 999,
              background: "#ffffff",
              color: "#020617",
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            MVP #{winner.current}
          </div>

          <div
            style={{
              display: "flex",
              padding: "15px 24px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.76)",
              fontSize: 26,
              fontWeight: 900,
            }}
          >
            {winner.previous} → {winner.current}
          </div>

          <div
            style={{
              display: "flex",
              padding: "15px 24px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.76)",
              fontSize: 26,
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
              top: 1412,
              display: "flex",
              flexDirection: "column",
              padding: 28,
              borderRadius: 34,
              background: "rgba(255,255,255,0.94)",
              color: "#020617",
              zIndex: 7,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 16,
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
                  <div
                    style={{
                      display: "flex",
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        index === 0 ? "#020617" : "rgba(15,23,42,0.06)",
                      color: index === 0 ? "#ffffff" : "rgba(15,23,42,0.55)",
                      fontSize: 20,
                      fontWeight: 900,
                    }}
                  >
                    {index + 1}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      fontSize: 27,
                      fontWeight: 900,
                      letterSpacing: -0.7,
                    }}
                  >
                    {entry.name}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: 23,
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
            zIndex: 8,
          }}
        >
          <div style={{ display: "flex" }}>created with strikr</div>
          <div style={{ display: "flex" }}>@getstrikr · www.strikr.team</div>
        </div>
      </div>
    </div>
  );
}
