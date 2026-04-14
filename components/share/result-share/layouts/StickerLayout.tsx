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
        padding: 28,
        background: "#F8FAFC",
        color: "#0F172A",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: 38,
          overflow: "hidden",
          background: "#FFFFFF",
          border: "2px solid rgba(15,23,42,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px 24px 18px 24px",
            background:
              "linear-gradient(90deg, rgba(34,197,94,0.14), rgba(59,130,246,0.08))",
            borderBottom: "1px solid rgba(15,23,42,0.08)",
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
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "8px 14px",
                borderRadius: 999,
                background: "#111827",
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              STICKER STYLE
            </div>

            <div
              style={{
                display: "flex",
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.78)",
                border: "1px solid rgba(15,23,42,0.08)",
                color: "#334155",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {data.date}
            </div>
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
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.06)",
                color: "#334155",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              {copy.kicker}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 56,
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: -2,
                color: "#0F172A",
              }}
            >
              {copy.headline}
            </div>

            <div
              style={{
                display: "flex",
                padding: "14px 16px",
                borderRadius: 20,
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
                padding: "18px 18px",
                borderRadius: 24,
                background: "#0F172A",
                color: "#FFFFFF",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Endstand
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  fontSize: 90,
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
              borderRadius: 30,
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
              borderRadius: 30,
            })}
          </div>
        </div>
      </div>
    </div>
  );
}