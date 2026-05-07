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
    return <>DELIVERED.</>;
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
        padding: 24,
        background: "#020617",
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
          borderRadius: 36,
          background: "#050505",
          border: `1px solid ${colorway.accent}66`,
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 610,
            background: colorway.topBackground,
          }}
        />

        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 18% 12%, ${colorway.accentGlow}, transparent 28%)`,
            opacity: 0.55,
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
            left: 42,
            right: 28,
            top: 262,
            height: 348,
            alignItems: "flex-end",
            zIndex: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: getEditorialTitle(copy.headline).props?.children
                ? 178
                : 192,
              fontWeight: 1000,
              lineHeight: 0.76,
              letterSpacing: -14,
              color: colorway.titleColor,
              textTransform: "uppercase",
              textShadow: `0 0 28px ${colorway.accentGlow}`,
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
            top: 610,
            bottom: 0,
            overflow: "hidden",
          }}
        >
          {renderPhotoOrFallback({
            winnerPhotoUrl: data.winnerPhotoUrl,
            palette,
            dark: true,
            width: 1032,
            height: 1200,
            borderRadius: 0,
          })}
        </div>

        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            right: 0,
            top: 610,
            bottom: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.74) 18%, rgba(0,0,0,0.22) 48%, rgba(0,0,0,0.02) 74%)",
          }}
        />

        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 58,
            right: 58,
            bottom: 64,
            alignItems: "flex-end",
            gap: 44,
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 0,
              minWidth: 410,
              fontSize: 150,
              fontWeight: 1000,
              lineHeight: 0.85,
              letterSpacing: -13,
              color: colorway.accent,
              textShadow: `0 0 36px ${colorway.accentGlow}`,
            }}
          >
            <span style={{ display: "flex" }}>{score.goalsA}</span>
            <span
              style={{
                display: "flex",
                fontSize: 98,
                letterSpacing: -8,
                marginLeft: -4,
                marginRight: -4,
                opacity: 0.96,
              }}
            >
              :
            </span>
            <span style={{ display: "flex" }}>{score.goalsB}</span>
          </div>

          <div
            style={{
              display: "flex",
              width: 1,
              height: 122,
              background: `${colorway.accent}88`,
              boxShadow: `0 0 24px ${colorway.accentGlow}`,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              maxWidth: 430,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 58,
                fontWeight: 1000,
                lineHeight: 0.86,
                letterSpacing: -2.2,
                color: colorway.accent,
                textTransform: "uppercase",
                textShadow: `0 0 30px ${colorway.accentGlow}`,
              }}
            >
              {getShortHeadline(copy.headline)}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 25,
                lineHeight: 1.25,
                fontWeight: 600,
                color: "rgba(255,255,255,0.84)",
              }}
            >
              {copy.subline}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 58,
            right: 58,
            bottom: 24,
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 44,
                height: 44,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${colorway.accent}`,
                color: colorway.accent,
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              ✦
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 19,
                  fontWeight: 900,
                  letterSpacing: 2.2,
                  color: "#FFFFFF",
                  textTransform: "uppercase",
                }}
              >
                Matchday
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: 2.6,
                  color: "rgba(255,255,255,0.62)",
                  textTransform: "uppercase",
                }}
              >
                Training. Team. Together.
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 38,
              fontWeight: 1000,
              lineHeight: 1,
              letterSpacing: -1.4,
              color: colorway.accent,
              textShadow: `0 0 28px ${colorway.accentGlow}`,
            }}
          >
            strikr
          </div>
        </div>
      </div>
    </div>
  );
}