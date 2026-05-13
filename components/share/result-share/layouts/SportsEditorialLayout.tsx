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
    return (
      <>
        UNDER
        <br />
        DOG.
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
        DELIV
        <br />
        ERED.
      </>
    );
  }

  return (
    <>
      MATCH
      <br />
      DAY.
    </>
  );
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

function renderMassiveEditorialTitle({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  const baseStyle = {
    display: "flex",
    position: "absolute" as const,
    left: 0,
    bottom: 0,
    fontFamily: '"Arial Black", Arial, Helvetica, sans-serif',
    fontSize: 194,
    fontWeight: 900,
    lineHeight: 0.68,
    letterSpacing: -17,
    color,
    textTransform: "uppercase" as const,
  };

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      <div style={{ ...baseStyle, transform: "translateX(-2px)" }}>
        {children}
      </div>
      <div style={{ ...baseStyle, transform: "translateX(2px)" }}>
        {children}
      </div>
      <div style={{ ...baseStyle, transform: "translateY(-1px)" }}>
        {children}
      </div>
      <div style={{ ...baseStyle, transform: "translateY(1px)" }}>
        {children}
      </div>
      <div style={baseStyle}>{children}</div>
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
  const editorialTitle = getEditorialTitle(copy.headline);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 24,
        background: "#020617",
        color: "#FFFFFF",
        fontFamily: '"Arial Black", Arial, Helvetica, sans-serif',
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
          background: "#050505",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 430,
            background: colorway.topBackground,
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
            top: 170,
            height: 250,
            alignItems: "flex-end",
            zIndex: 10,
            overflow: "hidden",
          }}
        >
          {renderMassiveEditorialTitle({
            children: editorialTitle,
            color: colorway.titleColor,
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
              "linear-gradient(to top, rgba(1,4,10,0.92) 0%, rgba(1,4,10,0.72) 17%, rgba(1,4,10,0.22) 46%, rgba(1,4,10,0.04) 100%)",
          }}
        />

        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 54,
            right: 54,
            bottom: 48,
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
              fontSize: 142,
              fontWeight: 950,
              lineHeight: 0.9,
              letterSpacing: -11,
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
              fontSize: 48,
              fontWeight: 950,
              lineHeight: 0.86,
              letterSpacing: -1.8,
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
