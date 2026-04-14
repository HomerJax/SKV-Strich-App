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

export function FloodlightLayout({ data }: { data: ExtendedResultShareData }) {
  const clubName = getDisplayClubName(data);
  const clubLogoUrl = getClubLogoUrl(data);
  const copy = buildCopy(data);
  const palette = buildPalette(data.clubPrimaryColor, "floodlight");
  const score = getScoreModel(data);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: 24,
        background: "#020617",
        color: "#FFFFFF",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
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
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(to top, rgba(1,4,10,0.96) 0%, rgba(1,4,10,0.82) 24%, rgba(1,4,10,0.34) 52%, rgba(1,4,10,0.14) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            right: 28,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          {renderClubBadge({
            clubName,
            clubLogoUrl,
            palette,
            dark: true,
            strikrLogoUrl: data.strikrLogoUrl,
          })}

          <div
            style={{
              display: "flex",
              padding: "10px 14px",
              borderRadius: 999,
              background: "rgba(2,6,12,0.72)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 12,
              fontWeight: 800,
              color: "rgba(255,255,255,0.78)",
              textTransform: "uppercase",
            }}
          >
            {data.date}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 32,
            right: 32,
            bottom: 28,
            display: "flex",
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
              maxWidth: 600,
            }}
          >
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(2,6,12,0.72)",
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
                background: "rgba(2,6,12,0.78)",
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

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                alignSelf: "flex-start",
                padding: "14px 16px",
                borderRadius: 20,
                background: "rgba(2,6,12,0.82)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {data.strikrLogoUrl ? (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.08)",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={data.strikrLogoUrl}
                    alt="Strikr"
                    width={44}
                    height={44}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                      padding: 6,
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#FFFFFF",
                    color: "#0F172A",
                    fontSize: 20,
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  S
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 20,
                    fontWeight: 900,
                    color: "#FFFFFF",
                    letterSpacing: -0.5,
                  }}
                >
                  STRIKR
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.68)",
                  }}
                >
                  Training managed by STRIKR
                </div>
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
              padding: "26px 30px",
              borderRadius: 30,
              background: "rgba(1,4,10,0.88)",
              border: "1px solid rgba(255,255,255,0.08)",
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
                  color: score.isDraw
                    ? "#FFFFFF"
                    : score.teamAIsWinner
                      ? palette.accent
                      : "rgba(255,255,255,0.68)",
                }}
              >
                {score.goalsA}
              </span>
              <span style={{ color: "rgba(255,255,255,0.34)" }}>:</span>
              <span
                style={{
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