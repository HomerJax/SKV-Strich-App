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

export function StickerLayout({ data }: { data: ExtendedResultShareData }) {
  const clubName = getDisplayClubName(data);
  const clubLogoUrl = getClubLogoUrl(data);
  const copy = buildCopy(data);
  const palette = buildPalette(data.clubPrimaryColor, "sticker");
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
          radial-gradient(circle at 16% 14%, ${palette.accentGlow}, transparent 22%),
          linear-gradient(180deg, #0A0F17 0%, #141B27 100%)
        `,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          borderRadius: 40,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 28px 72px rgba(0,0,0,0.34)",
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
            display: "flex",
            background: `
              linear-gradient(
                to top,
                rgba(4,8,14,0.92) 0%,
                rgba(4,8,14,0.72) 26%,
                rgba(4,8,14,0.18) 58%,
                rgba(4,8,14,0.18) 100%
              )
            `,
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: `
              linear-gradient(
                90deg,
                rgba(4,8,14,0.18) 0%,
                rgba(4,8,14,0.04) 34%,
                rgba(4,8,14,0) 56%,
                rgba(4,8,14,0.12) 100%
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
              background: "rgba(5,12,20,0.54)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.74)",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "1.3px",
              textTransform: "uppercase",
            }}
          >
            {data.date}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 30,
            right: 30,
            bottom: 28,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              maxWidth: 540,
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
                background: "rgba(5,12,20,0.5)",
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
                fontSize: 60,
                fontWeight: 900,
                lineHeight: 0.94,
                letterSpacing: "-2px",
                color: "#FFFFFF",
                textShadow: "0 10px 26px rgba(0,0,0,0.32)",
              }}
            >
              {copy.headline}
            </div>

            <div
              style={{
                display: "flex",
                maxWidth: 520,
                padding: "13px 15px",
                borderRadius: 18,
                background: "rgba(5,12,20,0.66)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 12px 24px rgba(0,0,0,0.22)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  lineHeight: 1.4,
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
                background: "rgba(5,12,20,0.5)",
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
              minWidth: 292,
              padding: "24px 28px",
              borderRadius: 30,
              background: "rgba(8,18,32,0.92)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: `
                0 18px 42px rgba(0,0,0,0.34),
                inset 0 1px 0 rgba(255,255,255,0.04)
              `,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 13,
                fontWeight: 800,
                color: "rgba(255,255,255,0.62)",
                textTransform: "uppercase",
                letterSpacing: "1.4px",
                marginBottom: 10,
              }}
            >
              Endstand
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                fontSize: 88,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: "-3px",
                textShadow: "0 12px 24px rgba(0,0,0,0.28)",
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