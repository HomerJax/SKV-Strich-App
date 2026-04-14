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
        padding: 16,
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
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            padding: "18px 18px 12px 18px",
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
            gap: 14,
            padding: 14,
            background: "#FFFFFF",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "24%",
              minWidth: 0,
              gap: 12,
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
                fontSize: 46,
                fontWeight: 900,
                lineHeight: 0.93,
                letterSpacing: -1.6,
                color: "#0F172A",
              }}
            >
              {copy.headline}
            </div>

            <div
              style={{
                display: "flex",
                padding: "12px 14px",
                borderRadius: 16,
                background: "#F8FAFC",
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 16,
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
                gap: 8,
                padding: "16px 16px",
                borderRadius: 20,
                background: "#0F172A",
                color: "#FFFFFF",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1.2,
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
                  gap: 8,
                  fontSize: 72,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: -2.6,
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
                flexDirection: "column",
                gap: 10,
                marginTop: "auto",
                paddingTop: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {data.strikrLogoUrl ? (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#0F172A",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={data.strikrLogoUrl}
                      alt="Strikr"
                      width={40}
                      height={40}
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
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#0F172A",
                      color: "#FFFFFF",
                      fontSize: 18,
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
                      fontSize: 18,
                      fontWeight: 900,
                      color: "#0F172A",
                      letterSpacing: -0.4,
                    }}
                  >
                    STRIKR
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#64748B",
                    }}
                  >
                    Training managed by STRIKR
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: "76%",
              minWidth: 0,
              height: "100%",
              borderRadius: 22,
              overflow: "hidden",
              background: "#E2E8F0",
              borderLeft: "1px solid rgba(15,23,42,0.06)",
              borderBottom: "1px solid rgba(15,23,42,0.06)",
            }}
          >
            {renderPhotoOrFallback({
              winnerPhotoUrl: data.winnerPhotoUrl,
              palette,
              dark: false,
              width: 860,
              height: 1120,
              borderRadius: 22,
            })}
          </div>
        </div>
      </div>
    </div>
  );
}