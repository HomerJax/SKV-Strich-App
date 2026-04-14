/* eslint-disable @next/next/no-img-element */
import { buildCopy } from "../result-share.copy";
import {
  getClubLogoUrl,
  getDisplayClubName,
  getScoreModel,
  renderBrandFooter,
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
      {/* HEADER */}
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
              fontSize: 16,
              fontWeight: 700,
              color: palette.textSecondary,
            }}
          >
            {data.date}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div
        style={{
          display: "flex",
          width: "100%",
          flex: 1,
          gap: 24,
        }}
      >
        {/* LEFT */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            justifyContent: "space-between",
            gap: 22,
          }}
        >
          {/* SCORE */}
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
                fontSize: 120,
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
                padding: "9px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.68)",
                border: "1px solid rgba(15,23,42,0.08)",
                color: palette.textSecondary,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "1.3px",
                textTransform: "uppercase",
                width: "fit-content",
              }}
            >
              Endstand
            </div>
          </div>

          {/* TEXT */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 44,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: "-1.6px",
              }}
            >
              {copy.headline}
            </div>

            <div
              style={{
                padding: "14px 16px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  lineHeight: 1.5,
                  color: palette.textSecondary,
                  fontWeight: 600,
                }}
              >
                {copy.subline}
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div>
            {renderBrandFooter({
              palette,
              dark: false,
              strikrLogoUrl: data.strikrLogoUrl,
            })}
          </div>
        </div>
      </div>
    </div>
  );
}