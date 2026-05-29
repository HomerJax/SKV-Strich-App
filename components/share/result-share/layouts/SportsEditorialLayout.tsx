/* eslint-disable @next/next/no-img-element */
import { buildCopy } from "../result-share.copy";
import {
  getClubLogoUrl,
  getDisplayClubName,
  getScoreModel,
  renderClubBadge,
} from "../result-share.helpers";
import { pickResultShareColorway } from "../result-share.colorways";
import { buildPalette } from "../result-share.palette";
import { ExtendedResultShareData } from "../result-share.types";

function pickBySessionId<T>(sessionId: number, values: T[]) {
  return values[Math.abs(sessionId) % values.length] ?? values[0];
}

function renderStrikrTopBadge({
  strikrLogoUrl,
}: {
  strikrLogoUrl?: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        width: 212,
        padding: "14px 14px 12px",
        borderRadius: 22,
        background: "rgba(2,6,12,0.48)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      {strikrLogoUrl ? (
        <img
          src={strikrLogoUrl}
          alt="strikr"
          style={{
            width: 60,
            height: 60,
            borderRadius: 16,
            objectFit: "cover",
            display: "flex",
          }}
        />
      ) : null}

      <div
        style={{
          display: "flex",
          fontSize: 28,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: -1,
          color: "#FFFFFF",
        }}
      >
        strikr
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 8,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: 1.05,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.70)",
        }}
      >
        TEAM TRAINING. REDEFINED.
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 2,
          paddingTop: 7,
          borderTop: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 9,
            fontWeight: 800,
            color: "rgba(255,255,255,0.78)",
          }}
        >
          @getstrikr
        </div>

        <div
          style={{
            display: "flex",
            width: 1,
            height: 11,
            background: "rgba(255,255,255,0.16)",
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 11,
            fontWeight: 800,
            color: "#34d399",
          }}
        >
          strikr.team
        </div>
      </div>
    </div>
  );
}

function getEditorialTitle(headline: string, sessionId: number) {
  const lower = headline.toLowerCase();

  if (lower.includes("unterzahl") || lower.includes("papier")) {
    return pickBySessionId(sessionId, ["UNDERDOG.", "UPSET.", "MENTALITY."]);
  }

  if (
    lower.includes("diskussion") ||
    lower.includes("deutlich") ||
    lower.includes("gewonnen")
  ) {
    return pickBySessionId(sessionId, [
      "STATEMENT.",
      "DONE.",
      "BIG WIN.",
      "CLINICAL.",
      "DELIVERED.",
    ]);
  }

  return pickBySessionId(sessionId, ["MATCHDAY.", "TRAINING.", "GAME ON."]);
}

function getShortHeadline(headline: string, sessionId: number) {
  const lower = headline.toLowerCase();

  if (lower.includes("unterzahl")) {
    return pickBySessionId(sessionId, [
      "MENTALITÄT.",
      "STARK GEBLIEBEN.",
      "TEAM GEZOGEN.",
    ]);
  }

  if (
    lower.includes("diskussion") ||
    lower.includes("deutlich") ||
    lower.includes("gewonnen")
  ) {
    return pickBySessionId(sessionId, [
      "KLARE SACHE.",
      "STARKER AUFTRITT.",
      "SAUBER GEZOGEN.",
      "TEAM MOMENT.",
      "GELIEFERT.",
    ]);
  }

  return headline;
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

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 20,
        background:
          "radial-gradient(circle at 50% -8%, rgba(255,255,255,0.12), transparent 30%), #020617",
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
          borderRadius: 42,
          background: "#020617",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow:
            "0 40px 120px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Top color field */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 330,
            background: colorway.topBackground,
            boxShadow: `0 42px 96px ${colorway.accentGlow}`,
            zIndex: 1,
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 34,
            left: 34,
            right: 34,
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
            zIndex: 10,
          }}
        >
          {renderClubBadge({
            clubName,
            clubLogoUrl,
            palette,
            dark: true,
            strikrLogoUrl: data.strikrLogoUrl,
          })}

          {renderStrikrTopBadge({
            strikrLogoUrl: data.strikrLogoUrl,
          })}
        </div>

        {/* Big editorial title */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 54,
            right: 54,
            top: 148,
            height: 170,
            alignItems: "flex-end",
            zIndex: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 116,
              fontWeight: 950,
              lineHeight: 0.9,
              letterSpacing: -4,
              textShadow: "0 18px 46px rgba(0,0,0,0.32)",
              color: colorway.titleColor,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {getEditorialTitle(copy.headline, data.sessionId)}
          </div>
        </div>

        {/* Photo: endet VOR dem Footer, dadurch keine grünen unteren Ecken */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            right: 0,
            top: 330,
            bottom: 150,
            overflow: "hidden",
            background: "#0F172A",
            zIndex: 2,
          }}
        >
          {data.winnerPhotoUrl ? (
            <img
              src={data.winnerPhotoUrl}
              alt="Siegerfoto"
              width={1040}
              height={950}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 82%",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.12), transparent 34%), linear-gradient(180deg,#1E293B,#020617)",
                color: "rgba(255,255,255,0.55)",
                fontSize: 42,
                fontWeight: 900,
                letterSpacing: -1,
              }}
            >
              Siegerfoto
            </div>
          )}
        </div>

        {/* Übergang Top → Foto */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            right: 0,
            top: 355,
            height: 80,
            background:
              "linear-gradient(180deg, rgba(8,145,178,0.38) 0%, rgba(8,145,178,0.10) 48%, rgba(8,145,178,0) 100%)",
            zIndex: 3,
          }}
        />

        {/* Foto unten abdunkeln */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 100,
            height: 390,
            background:
              "linear-gradient(180deg, rgba(2,6,23,0) 0%, rgba(2,6,23,0.04) 16%, rgba(2,6,23,0.12) 34%, rgba(2,6,23,0.34) 58%, rgba(2,6,23,0.72) 82%, rgba(2,6,23,0.98) 100%)",
            zIndex: 4,
          }}
        />

        {/* Echter Footer, volle Breite */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 100,
            background:
              "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(2,6,23,0.98) 32%, #020617 100%)",
            zIndex: 5,
          }}
        />

        {/* Score + short headline */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 58,
            right: 58,
            bottom: 22,
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 28,
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 2,
              fontSize: 168,
              fontWeight: 950,
              lineHeight: 0.86,
              letterSpacing: -8,
              color: colorway.accent,
              textShadow: `0 0 34px ${colorway.accentGlow}`,
            }}
          >
            <span style={{ display: "flex" }}>{score.goalsA}</span>

            <span
              style={{
                display: "flex",
                fontSize: 94,
                letterSpacing: -3,
                opacity: 0.92,
              }}
            >
              :
            </span>

            <span style={{ display: "flex" }}>{score.goalsB}</span>
          </div>

          <div
            style={{
              display: "flex",
              width: 560,
              maxWidth: 560,
              textAlign: "right",
              justifyContent: "flex-end",
              fontSize: 42,
              fontWeight: 950,
              lineHeight: 1,
              letterSpacing: -1.1,
              color: colorway.accent,
              textTransform: "uppercase",
              textShadow: `0 0 28px ${colorway.accentGlow}`,
            }}
          >
            {getShortHeadline(copy.headline, data.sessionId)}
          </div>
        </div>
      </div>
    </div>
  );
}
