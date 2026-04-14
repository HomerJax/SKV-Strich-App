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
        background: "#0F172A",
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
          background: "#111827",
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
              "linear-gradient(to top, rgba(2,6,12,0.92) 0%, rgba(2,6,12,0.78) 26%, rgba(2,6,12,0.2) 58%, rgba(2,6,12,0.12) 100%)",
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
              background: "rgba(15,23,42,0.7)",
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
            left: 28,
            right: 28,
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
              maxWidth: 580,
            }}
          >
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.7)",
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
                fontSize: 58,
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: -2,
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
                background: "rgba(15,23,42,0.74)",
                border: "1px solid rgba(255,255,255,0.08)",
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
                alignSelf: "flex-start",
                padding: "12px 14px",
                borderRadius: 18,
                background: "rgba(15,23,42,0.74)",
                border: "1px solid rgba(255,255,255,0.08)",
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
              minWidth: 280,
              padding: "24px 28px",
              borderRadius: 28,
              background: "rgba(2,6,12,0.86)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                marginBottom: 10,
                fontSize: 13,
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
                gap: 10,
                fontSize: 86,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -3,
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
              <span style={{ color: "rgba(255,255,255,0.36)" }}>:</span>
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