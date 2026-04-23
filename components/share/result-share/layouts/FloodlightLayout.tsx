/* eslint-disable @next/next/no-img-element */
import { buildCopy } from "../result-share.copy";
import {
  getClubLogoUrl,
  getDisplayClubName,
  getScoreModel,
  renderPhotoOrFallback,
  renderClubBadge,
} from "../result-share.helpers";
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
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

export function FloodlightLayout({ data }: { data: ExtendedResultShareData }) {
  const clubName = getDisplayClubName(data);
  const clubLogoUrl = getClubLogoUrl(data);
  const copy = buildCopy(data);
  const palette = buildPalette(data.clubPrimaryColor, "floodlight");
  const score = getScoreModel(data);

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
          background: "#0B1220",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {renderPhotoOrFallback({
          winnerPhotoUrl: data.winnerPhotoUrl,
          palette,
          dark: true,
          width: 1032,
          height: 1302,
          borderRadius: 36,
        })}

        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(1,4,10,0.88) 0%, rgba(1,4,10,0.68) 24%, rgba(1,4,10,0.28) 54%, rgba(1,4,10,0.10) 100%)",
          }}
        />

        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 28,
            left: 28,
            right: 28,
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
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
            left: 32,
            right: 32,
            bottom: 28,
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              maxWidth: 610,
            }}
          >
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(2,6,12,0.70)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 12,
                fontWeight: 800,
                color: "rgba(255,255,255,0.78)",
                textTransform: "uppercase",
              }}
            >
              {copy.kicker}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 70,
                fontWeight: 900,
                lineHeight: 0.94,
                letterSpacing: -2.4,
                color: "#FFFFFF",
              }}
            >
              {copy.headline}
            </div>

            <div
              style={{
                display: "flex",
                padding: "14px 16px",
                borderRadius: 18,
                background: "rgba(2,6,12,0.72)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 19,
                  lineHeight: 1.42,
                  fontWeight: 600,
                  color: "#FFFFFF",
                }}
              >
                {copy.subline}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 310,
              padding: "28px 30px",
              borderRadius: 30,
              background: "rgba(1,4,10,0.82)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div
              style={{
                display: "flex",
                marginBottom: 12,
                fontSize: 14,
                fontWeight: 800,
                color: "rgba(255,255,255,0.66)",
                textTransform: "uppercase",
              }}
            >
              Endstand
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                fontSize: 104,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -3.6,
              }}
            >
              <span
                style={{
                  display: "flex",
                  color: score.isDraw
                    ? "#FFFFFF"
                    : score.teamAIsWinner
                      ? palette.accent
                      : "rgba(255,255,255,0.68)",
                }}
              >
                {score.goalsA}
              </span>
              <span
                style={{
                  display: "flex",
                  color: "rgba(255,255,255,0.34)",
                }}
              >
                :
              </span>
              <span
                style={{
                  display: "flex",
                  color: score.isDraw
                    ? "#FFFFFF"
                    : score.teamAIsWinner
                      ? "rgba(255,255,255,0.68)"
                      : palette.accent,
                }}
              >
                {score.goalsB}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}