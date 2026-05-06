import type { MvpShareImageProps } from "./mvp-share.types";
import PremiumBadge from "./PremiumBadge";
import ProgressBlock from "./ProgressBlock";
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

  return (
    <div
      style={{
        display: "flex",
        width: "1080px",
        height: "1920px",
        flexDirection: "column",
        background:
          "radial-gradient(circle at 82% 12%, rgba(15,23,42,0.055), transparent 28%), linear-gradient(180deg,#f8fafc 0%,#ffffff 55%,#f8fafc 100%)",
        padding: 70,
        fontFamily: "Arial",
        color: "#020617",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          inset: 34,
          borderRadius: 66,
          border: "1px solid rgba(15,23,42,0.08)",
          background: "rgba(255,255,255,0.62)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 720,
          left: -120,
          width: 1100,
          height: 580,
          borderRadius: "999px",
          background: "rgba(15,23,42,0.055)",
          filter: "blur(110px)",
          transform: "rotate(-12deg)",
        }}
      />

      <ShareTopBar
        clubName={clubName}
        clubLogoUrl={clubLogoUrl}
        strikrLogoUrl={strikrLogoUrl}
        palette={palette}
        dark={false}
        variant="muted"
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
          marginTop: 220,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 27,
            fontWeight: 900,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: "rgba(15,23,42,0.36)",
          }}
        >
          Glückwunsch
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 26,
            maxWidth: 900,
            fontSize: 96,
            fontWeight: 900,
            letterSpacing: -5,
            lineHeight: 0.95,
            color: "#020617",
          }}
        >
          {winner.name}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 24,
            maxWidth: 820,
            fontSize: 31,
            fontWeight: 800,
            lineHeight: 1.25,
            color: "rgba(15,23,42,0.56)",
          }}
        >
          wurde von seinem Team zum MVP des Trainings gewählt.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          position: "relative",
          marginTop: 74,
          padding: 40,
          borderRadius: 54,
          background: "rgba(255,255,255,0.82)",
          border: "1px solid rgba(15,23,42,0.08)",
          alignItems: "center",
          gap: 42,
        }}
      >
        <PremiumBadge badgeImageUrl={badgeImageUrl} size={250} />

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{
              display: "flex",
              marginBottom: 18,
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "13px 18px",
                borderRadius: 999,
                background: "#020617",
                color: "#ffffff",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              {winner.current}x MVP
            </div>

            <div
              style={{
                display: "flex",
                padding: "13px 18px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.06)",
                color: "rgba(15,23,42,0.58)",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              {winner.badgeLabel}
            </div>
          </div>

          <ProgressBlock
            previous={winner.previous}
            current={winner.current}
            earnedBadgeText={winner.earnedBadgeText}
          />
        </div>
      </div>

      {leaderboard.length > 1 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
            marginTop: 38,
            padding: 34,
            borderRadius: 42,
            background: "rgba(255,255,255,0.84)",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "rgba(15,23,42,0.34)",
            }}
          >
            Voting-Ergebnis
          </div>

          {leaderboard.slice(0, 3).map((entry, index) => (
            <div
              key={entry.playerId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 24,
                paddingBottom:
                  index < Math.min(leaderboard.length, 3) - 1 ? 20 : 0,
                borderBottom:
                  index < Math.min(leaderboard.length, 3) - 1
                    ? "1px solid rgba(15,23,42,0.08)"
                    : "none",
                gap: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    background:
                      index === 0 ? "#020617" : "rgba(15,23,42,0.06)",
                    color: index === 0 ? "#ffffff" : "rgba(15,23,42,0.52)",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: 30,
                    fontWeight: 900,
                    letterSpacing: -0.9,
                    color: "#020617",
                  }}
                >
                  {entry.name}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  fontWeight: 900,
                  color: "rgba(15,23,42,0.46)",
                  flexShrink: 0,
                }}
              >
                {entry.votes} {entry.votes === 1 ? "Stimme" : "Stimmen"}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ display: "flex", flex: 1 }} />

      <div
        style={{
          display: "flex",
          position: "relative",
          justifyContent: "space-between",
          alignItems: "flex-end",
          color: "rgba(15,23,42,0.38)",
          fontSize: 22,
          fontWeight: 900,
        }}
      >
        <div>{sessionDateLabel}</div>
        <div>created with strikr</div>
      </div>
    </div>
  );
}