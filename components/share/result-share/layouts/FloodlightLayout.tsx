/* eslint-disable @next/next/no-img-element */
import { buildCopy } from "../result-share.copy";
import {
  getClubLogoUrl,
  getDisplayClubName,
  getScoreModel,
  renderBrandFooter,
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
        color: palette.textPrimary,
        background: `
          radial-gradient(circle at 50% 6%, rgba(255,255,255,0.12), transparent 14%),
          radial-gradient(circle at 18% 18%, ${palette.accentGlow}, transparent 20%),
          linear-gradient(180deg, #04060A 0%, #0A1120 100%)
        `,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          borderRadius: 40,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 28px 72px rgba(0,0,0,0.42)",
        }}
      >
        {renderPhotoOrFallback({
          winnerPhotoUrl: data.winnerPhotoUrl,
          palette,
          dark: true,
          width: 1200,
          height: 1440,
          borderRadius: 40,
        })}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              linear-gradient(
                to top,
                rgba(2,5,10,0.96) 0%,
                rgba(2,5,10,0.82) 22%,
                rgba(2,5,10,0.34) 50%,
                rgba(2,5,10,0.16) 68%,
                rgba(2,5,10,0.22) 100%
              )
            `,
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              linear-gradient(
                90deg,
                rgba(2,5,10,0.34) 0%,
                rgba(2,5,10,0.12) 28%,
                rgba(2,5,10,0) 52%,
                rgba(2,5,10,0.08) 100%
              )
            `,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            right: 24,
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
              alignItems: "center",
              padding: "9px 14px",
              borderRadius: 999,
              background: "rgba(4,10,18,0.56)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.76)",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "1.3px",
              textTransform: "uppercase",
              backdropFilter: "blur(8px)",
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
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              maxWidth: 560,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                width: "fit-content",
                alignItems: "center",
                padding: "9px 14px",
                borderRadius: 999,
                background: "rgba(4,10,18,0.52)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.72)",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "1.4px",
                textTransform: "uppercase",
              }}
            >
              {copy.kicker}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 72,
                fontWeight: 900,
                lineHeight: 0.94,
                letterSpacing: "-2.4px",
                color: "#FFFFFF",
                textShadow: "0 10px 28px rgba(0,0,0,0.34)",
              }}
            >
              {copy.headline}
            </div>

            <div
              style={{
                display: "flex",
                maxWidth: 540,
                padding: "14px 16px",
                borderRadius: 18,
                background: "rgba(4,10,18,0.68)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 12px 28px rgba(0,0,0,0.24)",
                backdropFilter: "blur(10px)",
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
                padding: "12px 14px",
                borderRadius: 18,
                background: "rgba(4,10,18,0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
                width: "fit-content",
              }}
            >
              {renderBrandFooter({
                palette,
                dark: true,
                strikrLogoUrl: data.strikrLogoUrl,
              })}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 320,
              padding: "26px 30px",
              borderRadius: 34,
              background: "rgba(3,8,16,0.88)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: `
                0 20px 48px rgba(0,0,0,0.38),
                inset 0 1px 0 rgba(255,255,255,0.04),
                0 0 0 1px rgba(255,255,255,0.02)
              `,
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 14,
                fontWeight: 800,
                color: "rgba(255,255,255,0.64)",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                marginBottom: 12,
              }}
            >
              Endstand
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                fontSize: 108,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: "-3.6px",
                textShadow: "0 12px 30px rgba(0,0,0,0.32)",
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