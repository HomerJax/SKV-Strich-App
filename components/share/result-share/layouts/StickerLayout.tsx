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
        padding: 12,
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
          borderRadius: 28,
          overflow: "hidden",
          background: "#FFFFFF",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "18px 20px 12px 20px",
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
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(15,23,42,0.05)",
              fontSize: 11,
              fontWeight: 800,
              color: "#475569",
            }}
          >
            {data.date}
          </div>
        </div>

        {/* CONTENT */}
        <div
          style={{
            display: "flex",
            flex: 1,
            gap: 12,
            padding: "0 12px 12px 12px",
          }}
        >
          {/* LEFT SIDE */}
          <div
            style={{
              width: "22%",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: palette.accentSoft,
                fontSize: 10,
                fontWeight: 900,
                textTransform: "uppercase",
              }}
            >
              {copy.kicker}
            </div>

            <div
              style={{
                fontSize: 34,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {copy.headline}
            </div>

            <div
              style={{
                fontSize: 14,
                color: "#475569",
                fontWeight: 600,
              }}
            >
              {copy.subline}
            </div>

            {/* SCORE */}
            <div
              style={{
                marginTop: "auto",
                padding: "12px",
                borderRadius: 16,
                background: "#0F172A",
                color: "#FFFFFF",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  opacity: 0.7,
                }}
              >
                Endstand
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  fontSize: 54,
                  fontWeight: 900,
                }}
              >
                <span
                  style={{
                    color: score.teamAIsWinner
                      ? palette.accent
                      : "rgba(255,255,255,0.5)",
                  }}
                >
                  {score.goalsA}
                </span>
                :
                <span
                  style={{
                    color: !score.teamAIsWinner
                      ? palette.accent
                      : "rgba(255,255,255,0.5)",
                  }}
                >
                  {score.goalsB}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              {renderBrandFooter({
                palette,
                dark: false,
                strikrLogoUrl: data.strikrLogoUrl,
              })}
            </div>
          </div>

          {/* IMAGE SIDE */}
          <div
            style={{
              width: "78%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                borderRadius: 24,
                overflow: "hidden",
                position: "relative",
                marginLeft: 6,
                marginBottom: 6,
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              }}
            >
              {renderPhotoOrFallback({
                winnerPhotoUrl: data.winnerPhotoUrl,
                palette,
                dark: false,
                width: 820,
                height: 1200,
                borderRadius: 24,
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}