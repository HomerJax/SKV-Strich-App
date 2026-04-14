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
        background: "#F3F4F6",
        color: "#0F172A",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: 34,
          overflow: "hidden",
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            padding: "24px 24px 18px 24px",
            background:
              "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
            borderBottom: "1px solid rgba(15,23,42,0.06)",
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
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(15,23,42,0.04)",
              border: "1px solid rgba(15,23,42,0.06)",
              color: "#475569",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {data.date}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            gap: 20,
            padding: 20,
            background: "#FFFFFF",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "38%",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "8px 12px",
                borderRadius: 999,
                background: palette.accentSoft,
                color: "#0F172A",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 1.1,
                textTransform: "uppercase",
              }}
            >
              {copy.kicker}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 54,
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: -1.8,
                color: "#0F172A",
              }}
            >
              {copy.headline}
            </div>

            <div
              style={{
                display: "flex",
                padding: "14px 16px",
                borderRadius: 18,
                background: "#F8FAFC",
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  lineHeight: 1.42,
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                {copy.subline}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "18px 18px",
                borderRadius: 22,
                background: "#0F172A",
                color: "#FFFFFF",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1.3,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.66)",
                }}
              >
                Endstand
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  fontSize: 84,
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
                        : "rgba(255,255,255,0.5)",
                  }}
                >
                  {score.goalsA}
                </span>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>:</span>
                <span
                  style={{
                    color: score.isDraw
                      ? "#FFFFFF"
                      : score.teamAIsWinner
                        ? "rgba(255,255,255,0.5)"
                        : palette.accent,
                  }}
                >
                  {score.goalsB}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                marginTop: "auto",
              }}
            >
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
              width: "62%",
              borderRadius: 28,
              overflow: "hidden",
              background: "#E2E8F0",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            {renderPhotoOrFallback({
              winnerPhotoUrl: data.winnerPhotoUrl,
              palette,
              dark: false,
              width: 620,
              height: 980,
              borderRadius: 28,
            })}
          </div>
        </div>
      </div>
    </div>
  );
}