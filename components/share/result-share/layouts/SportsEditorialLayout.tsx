/* eslint-disable @next/next/no-img-element */
import { buildCopy } from "../result-share.copy";
import {
  getClubLogoUrl,
  getDisplayClubName,
  getScoreModel,
  renderClubBadge,
  renderPhotoOrFallback,
} from "../result-share.helpers";
import { pickResultShareColorway } from "../result-share.colorways";
import { buildPalette } from "../result-share.palette";
import { ExtendedResultShareData } from "../result-share.types";

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
        gap: 8,
        minWidth: 250,
        padding: "18px 18px 14px",
        borderRadius: 24,
        background: "rgba(2,6,12,0.42)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(10px)",
      }}
    >
      {strikrLogoUrl ? (
        <img
          src={strikrLogoUrl}
          alt="strikr"
          style={{
            width: 68,
            height: 68,
            borderRadius: 18,
            objectFit: "cover",
            display: "flex",
          }}
        />
      ) : null}

      <div
        style={{
          display: "flex",
          fontSize: 30,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: -1.2,
          color: "#FFFFFF",
        }}
      >
        strikr
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 11,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.74)",
        }}
      >
        TEAM TRAINING. REDEFINED.
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 4,
          paddingTop: 10,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="white"
            style={{ display: "flex", opacity: 0.8 }}
          >
            <path d="M7 2C4.2 2 2 4.2 2 7v10c0 2.8 2.2 5 5 5h10c2.8 0 5-2.2 5-5V7c0-2.8-2.2-5-5-5H7zm0 2h10c1.7 0 3 1.3 3 3v10c0 1.7-1.3 3-3 3H7c-1.7 0-3-1.3-3-3V7c0-1.7 1.3-3 3-3zm5 2.5A5.5 5.5 0 1 0 17.5 12 5.5 5.5 0 0 0 12 6.5zm0 2A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5zm4.8-3.3a1.2 1.2 0 1 0 1.2 1.2 1.2 1.2 0 0 0-1.2-1.2z" />
          </svg>

          <div
            style={{
              display: "flex",
              fontSize: 12,
              fontWeight: 800,
              color: "rgba(255,255,255,0.82)",
            }}
          >
            @getstrikr
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: 1,
            height: 12,
            background: "rgba(255,255,255,0.16)",
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 12,
            fontWeight: 800,
            color: "#34d399",
          }}
        >
          www.strikr.team
        </div>
      </div>
    </div>
  );
}

function getEditorialTitle(headline: string) {
  const lower = headline.toLowerCase();

  if (lower.includes("unterzahl") || lower.includes("papier")) {
    return "UNDERDOG.";
  }

  if (
    lower.includes("diskussion") ||
    lower.includes("deutlich") ||
    lower.includes("gewonnen")
  ) {
    return "DELIVERED.";
  }

  return "MATCHDAY.";
}

function getShortHeadline(headline: string) {
  const lower = headline.toLowerCase();

  if (lower.includes("unterzahl")) {
    return (
      <>
        IN
        <br />
        UNTERZAHL
        <br />
        GEWONNEN.
      </>
    );
  }

  if (
    lower.includes("diskussion") ||
    lower.includes("deutlich") ||
    lower.includes("gewonnen")
  ) {
    return (
      <>
        HEUTE
        <br />
        GELIEFERT.
      </>
    );
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
        background: "radial-gradient(circle at 50% -8%, rgba(255,255,255,0.12), transparent 30%), #020617",
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
          background: "#050505",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 40px 120px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 410,
            background: colorway.topBackground,
            boxShadow: `0 42px 96px ${colorway.accentGlow}`,
          }}
        />

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
            zIndex: 20,
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

        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 54,
            right: 54,
            top: 178,
            height: 190,
            alignItems: "flex-end",
            zIndex: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 154,
              fontWeight: 950,
              lineHeight: 0.88,
              letterSpacing: -8,
              textShadow: "0 18px 46px rgba(0,0,0,0.32)",
              color: colorway.titleColor,
              textTransform: "uppercase",
            }}
          >
            {getEditorialTitle(copy.headline)}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            right: 0,
            top: 410,
            bottom: 0,
            overflow: "hidden",
          }}
        >
          {renderPhotoOrFallback({
            winnerPhotoUrl: data.winnerPhotoUrl,
            palette,
            dark: true,
            width: 1032,
            height: 1320,
            borderRadius: 0,
          })}
        </div>

        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            right: 0,
            top: 430,
            bottom: 0,
            background:
              "linear-gradient(to top, rgba(1,4,10,0.96) 0%, rgba(1,4,10,0.80) 22%, rgba(1,4,10,0.30) 52%, rgba(1,4,10,0.04) 100%)",
          }}
        />

        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 54,
            right: 54,
            bottom: 42,
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 30,
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 2,
              fontSize: 166,
              fontWeight: 950,
              lineHeight: 0.82,
              letterSpacing: -13,
              color: colorway.accent,
              textShadow: `0 0 34px ${colorway.accentGlow}`,
            }}
          >
            <span style={{ display: "flex" }}>{score.goalsA}</span>

            <span
              style={{
                display: "flex",
                fontSize: 92,
                letterSpacing: -4,
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
              maxWidth: 360,
              textAlign: "right",
              justifyContent: "flex-end",
              fontSize: 56,
              fontWeight: 950,
              lineHeight: 0.84,
              letterSpacing: -2.4,
              color: colorway.accent,
              textTransform: "uppercase",
              textShadow: `0 0 28px ${colorway.accentGlow}`,
            }}
          >
            {getShortHeadline(copy.headline)}
          </div>
        </div>
      </div>
    </div>
  );
}