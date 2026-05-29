/* eslint-disable @next/next/no-img-element */
import { buildCopy } from "../result-share.copy";
import {
  getClubLogoUrl,
  getDisplayClubName,
  getScoreModel,
} from "../result-share.helpers";
import { pickResultShareColorway } from "../result-share.colorways";
import { buildPalette } from "../result-share.palette";
import { ExtendedResultShareData } from "../result-share.types";

function pickBySessionId<T>(sessionId: number, values: T[]) {
  return values[Math.abs(sessionId) % values.length] ?? values[0];
}

function getHeroTitle(headline: string, sessionId: number) {
  const lower = headline.toLowerCase();

  if (lower.includes("unterzahl") || lower.includes("papier")) {
    return pickBySessionId(sessionId, [
      "Mentalität gezeigt.",
      "Stark geblieben.",
      "Team gezogen.",
    ]);
  }

  if (
    lower.includes("diskussion") ||
    lower.includes("deutlich") ||
    lower.includes("gewonnen")
  ) {
    return pickBySessionId(sessionId, [
      "Klare Sache.",
      "Starker Auftritt.",
      "Sauber gezogen.",
      "Team Moment.",
      "Geliefert.",
    ]);
  }

  return pickBySessionId(sessionId, [
    "Training entschieden.",
    "Matchday erledigt.",
    "Team Moment.",
  ]);
}

function getResultLabel(goalsA: number, goalsB: number) {
  if (goalsA === goalsB) return "Remis";
  return goalsA > goalsB ? "Team 1 gewinnt" : "Team 2 gewinnt";
}

function getCrestInitial(clubName: string) {
  return clubName.trim().charAt(0).toUpperCase() || "S";
}

function ClubBadge({
  clubName,
  clubLogoUrl,
}: {
  clubName: string;
  clubLogoUrl: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 82,
          height: 82,
          borderRadius: 24,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.86)",
          border: "1px solid rgba(255,255,255,0.38)",
          boxShadow: "0 18px 44px rgba(0,0,0,0.26)",
          flexShrink: 0,
        }}
      >
        {clubLogoUrl ? (
          <img
            src={clubLogoUrl}
            alt={clubName}
            width={82}
            height={82}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              padding: 9,
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              color: "#0F172A",
              fontSize: 34,
              fontWeight: 950,
            }}
          >
            {getCrestInitial(clubName)}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -0.6,
            color: "#FFFFFF",
            textShadow: "0 8px 22px rgba(0,0,0,0.45)",
            maxWidth: 520,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {clubName}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 2.1,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.70)",
          }}
        >
          Match result by strikr
        </div>
      </div>
    </div>
  );
}

function StrikrBadge({
  strikrLogoUrl,
}: {
  strikrLogoUrl?: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 22,
        background: "rgba(2,6,23,0.62)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 18px 44px rgba(0,0,0,0.24)",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          flexShrink: 0,
        }}
      >
        {strikrLogoUrl ? (
          <img
            src={strikrLogoUrl}
            alt="strikr"
            width={48}
            height={48}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              padding: 6,
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              color: "#FFFFFF",
              fontSize: 24,
              fontWeight: 950,
            }}
          >
            s
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 25,
            fontWeight: 950,
            lineHeight: 1,
            letterSpacing: -0.8,
            color: "#FFFFFF",
          }}
        >
          strikr
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 9,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.62)",
          }}
        >
          training redefined
        </div>
      </div>
    </div>
  );
}

export function SportsEditorialLayout({
  data,
}: {
  data: ExtendedResultShareData;
}) {
  const clubName = getDisplayClubName(data);
  const clubLogoUrl = getClubLogoUrl(data);
  const copy = buildCopy(data);
  const palette = buildPalette(data.clubPrimaryColor, "sports_editorial");
  const score = getScoreModel(data);
  const colorway = pickResultShareColorway(data.sessionId);

  const heroTitle = getHeroTitle(copy.headline, data.sessionId);
  const resultLabel = getResultLabel(score.goalsA, score.goalsB);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 22,
        background:
          "radial-gradient(circle at 50% -12%, rgba(255,255,255,0.16), transparent 32%), #020617",
        color: "#FFFFFF",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          borderRadius: 46,
          background: "#020617",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow:
            "0 44px 130px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.10)",
        }}
      >
        {/* Full hero photo */}
        {data.winnerPhotoUrl ? (
          <img
            src={data.winnerPhotoUrl}
            alt="Siegerfoto"
            width={1040}
            height={1306}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 74%",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.14), transparent 34%), linear-gradient(180deg,#1E293B,#020617)",
              color: "rgba(255,255,255,0.55)",
              fontSize: 48,
              fontWeight: 950,
            }}
          >
            Siegerfoto
          </div>
        )}

        {/* Photo grading */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(2,6,23,0.44) 0%, rgba(2,6,23,0.10) 26%, rgba(2,6,23,0.04) 52%, rgba(2,6,23,0.82) 100%)",
          }}
        />

        {/* Brand glow top */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 250,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(8,145,178,0.62) 0%, rgba(8,145,178,0.24) 52%, rgba(8,145,178,0) 100%)",
          }}
        />

        {/* Bottom readability */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 430,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(2,6,23,0) 0%, rgba(2,6,23,0.58) 38%, rgba(2,6,23,0.96) 100%)",
          }}
        />

        {/* Header */}
        <div
          style={{
            position: "absolute",
            top: 34,
            left: 34,
            right: 34,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
          }}
        >
          <ClubBadge clubName={clubName} clubLogoUrl={clubLogoUrl} />

          <StrikrBadge strikrLogoUrl={data.strikrLogoUrl} />
        </div>

        {/* Small editorial tag */}
        <div
          style={{
            position: "absolute",
            left: 42,
            top: 178,
            display: "flex",
            padding: "10px 14px",
            borderRadius: 999,
            background: "rgba(2,6,23,0.50)",
            border: `1px solid ${colorway.accent}55`,
            color: "rgba(255,255,255,0.78)",
            fontSize: 12,
            fontWeight: 850,
            letterSpacing: 1.6,
            textTransform: "uppercase",
          }}
        >
          {resultLabel}
        </div>

        {/* Main bottom content */}
        <div
          style={{
            position: "absolute",
            left: 46,
            right: 46,
            bottom: 42,
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 30,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                fontSize: 150,
                fontWeight: 950,
                lineHeight: 0.82,
                letterSpacing: -8,
                color: colorway.accent,
                textShadow: `0 0 34px ${colorway.accentGlow}`,
              }}
            >
              <span style={{ display: "flex" }}>{score.goalsA}</span>
              <span
                style={{
                  display: "flex",
                  fontSize: 82,
                  opacity: 0.9,
                  letterSpacing: -3,
                }}
              >
                :
              </span>
              <span style={{ display: "flex" }}>{score.goalsB}</span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 8,
                maxWidth: 455,
                textAlign: "right",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 42,
                  fontWeight: 950,
                  lineHeight: 0.98,
                  letterSpacing: -1.4,
                  color: "#FFFFFF",
                  textShadow: "0 16px 44px rgba(0,0,0,0.46)",
                }}
              >
                {heroTitle}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 15,
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: 2.2,
                  textTransform: "uppercase",
                  color: palette.accent,
                  textShadow: `0 0 24px ${palette.accentGlow}`,
                }}
              >
                made with strikr
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              height: 1,
              width: "100%",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.0), rgba(255,255,255,0.22), rgba(255,255,255,0.0))",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
              color: "rgba(255,255,255,0.66)",
              fontSize: 17,
              fontWeight: 750,
            }}
          >
            <div style={{ display: "flex" }}>{copy.subline}</div>
            <div style={{ display: "flex", color: palette.accent }}>
              @getstrikr
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
