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

export function PosterLayout({ data }: { data: ExtendedResultShareData }) {
  const clubName = getDisplayClubName(data);
  const clubLogoUrl = getClubLogoUrl(data);
  const copy = buildCopy(data);
  const palette = buildPalette(data.clubPrimaryColor, "poster");
  const score = getScoreModel(data);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 32,
        gap: 24,
        color: palette.textPrimary,
        background: `
          radial-gradient(circle at 18% 12%, ${palette.accentGlow}, transparent 24%),
          linear-gradient(180deg, #F5F0E7 0%, #ECE4D8 100%)
        `,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 24,
        }}
      >
        {renderClubBadge({
          clubName,
          clubLogoUrl,
          palette,
          dark: false,
          strikrLogoUrl: data.strikrLogoUrl,
        })}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.62)",
              border: "1px solid rgba(15,23,42,0.08)",
              color: palette.textSecondary,
              fontSize: 11,
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
              fontSize: 16,
              fontWeight: 700,
              color: palette.textSecondary,
            }}
          >
            {data.date}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          width: "100%",
          flex: 1,
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "41%",
            justifyContent: "space-between",
            gap: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                fontSize: 104,
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: "-4px",
              }}
            >
              <span
                style={{
                  color: score.isDraw
                    ? palette.textPrimary
                    : score.teamAIsWinner
                      ? palette.accent
                      : palette.loser,
                }}
              >
                {score.goalsA}
              </span>
              <span style={{ color: palette.textSecondary }}>:</span>
              <span
                style={{
                  color: score.isDraw
                    ? palette.textPrimary
                    : score.teamAIsWinner
                      ? palette.loser
                      : palette.accent,
                }}
              >
                {score.goalsB}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                width: "fit-content",
                alignItems: "center",
                padding: "9px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.68)",
                border: "1px solid rgba(15,23,42,0.08)",
                color: palette.textSecondary,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "1.3px",
                textTransform: "uppercase",
              }}
            >
              Endstand
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 42,
                fontWeight: 900,
                lineHeight: 0.96,
                letterSpacing: "-1.6px",
                color: palette.textPrimary,
              }}
            >
              {copy.headline}
            </div>

            <div
              style={{
                display: "flex",
                padding: "14px 16px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  lineHeight: 1.48,
                  color: palette.textSecondary,
                  fontWeight: 600,
                }}
              >
                {copy.subline}
              </div>
            </div>
          </div>

          <div>
            {renderBrandFooter({
              palette,
              dark: false,
              strikrLogoUrl: data.strikrLogoUrl,
            })}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: "59%",
            borderRadius: 34,
            overflow: "hidden",
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow: "0 24px 54px rgba(15,23,42,0.14)",
          }}
        >
          {renderPhotoOrFallback({
            winnerPhotoUrl: data.winnerPhotoUrl,
            palette,
            dark: false,
            width: 720,
            height: 960,
            borderRadius: 34,
          })}
        </div>
      </div>
    </div>
  );
}