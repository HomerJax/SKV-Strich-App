/* eslint-disable @next/next/no-img-element */
import { ResultShareData } from "@/lib/share/types";
import { SHARE_THEME } from "@/lib/share/brand";

type ExtendedResultShareData = ResultShareData & {
  clubLogoUrl?: string | null;
  clubName?: string | null;
  strikrLogoUrl?: string | null;
};

export default function ResultShareCard({
  data,
}: {
  data: ExtendedResultShareData;
}) {
  const isDraw = data.goalsA === data.goalsB;
  const winnerText = isDraw ? "Remis" : "Sieg";
  const heroText = isDraw ? "Kein Sieger. Volles Brett." : data.winnerLabel;
  const scoreText = `${data.goalsA}:${data.goalsB}`;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        padding: 28,
        color: "#FFFFFF",
        background: `
          radial-gradient(circle at 15% 15%, rgba(70, 98, 255, 0.22), transparent 28%),
          radial-gradient(circle at 85% 18%, rgba(0, 209, 255, 0.16), transparent 26%),
          radial-gradient(circle at 50% 100%, rgba(16, 185, 129, 0.12), transparent 30%),
          linear-gradient(180deg, #081225 0%, #07122F 100%)
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxWidth: "72%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 16px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: `1px solid ${SHARE_THEME.cardBorder}`,
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "1.2px",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              {isDraw ? "🤝 Remis" : "🏆 Sieg"}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 20,
                color: "rgba(255,255,255,0.72)",
                fontWeight: 600,
              }}
            >
              {data.date}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 72,
                fontWeight: 900,
                lineHeight: 0.94,
                letterSpacing: "-2px",
              }}
            >
              {data.title}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 700,
                color: "rgba(255,255,255,0.78)",
                letterSpacing: "-0.5px",
              }}
            >
              {heroText}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexShrink: 0,
          }}
        >
          {data.clubLogoUrl ? (
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 24,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.08)",
                border: `1px solid ${SHARE_THEME.cardBorder}`,
                boxShadow: "0 14px 32px rgba(0,0,0,0.22)",
              }}
            >
              <img
                src={data.clubLogoUrl}
                alt={data.clubName || "Club Logo"}
                width={88}
                height={88}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                  padding: 10,
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: 920,
          borderRadius: 42,
          overflow: "hidden",
          border: `1px solid ${SHARE_THEME.cardBorder}`,
          background: "rgba(255,255,255,0.06)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.42)",
        }}
      >
        {data.winnerPhotoUrl ? (
          <img
            src={data.winnerPhotoUrl}
            alt="Siegerfoto"
            width={1200}
            height={920}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 700,
              color: "rgba(255,255,255,0.68)",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
            }}
          >
            Kein Siegerfoto
          </div>
        )}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              linear-gradient(
                to top,
                rgba(7,18,47,0.96) 0%,
                rgba(7,18,47,0.56) 24%,
                rgba(7,18,47,0.12) 50%,
                rgba(7,18,47,0.34) 100%
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 18px",
              borderRadius: 999,
              background: "rgba(7,18,47,0.42)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(10px)",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.92)",
            }}
          >
            {isDraw ? "Match endet ohne Sieger" : "Winner Moment"}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 16px",
              borderRadius: 18,
              background: "rgba(7,18,47,0.42)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(10px)",
              fontSize: 18,
              fontWeight: 700,
              color: "rgba(255,255,255,0.84)",
              maxWidth: 360,
              textAlign: "right",
            }}
          >
            {data.clubName || "Club Session"}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 28,
            right: 28,
            bottom: 28,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxWidth: "58%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                  color: "rgba(255,255,255,0.72)",
                }}
              >
                {winnerText}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 82,
                  fontWeight: 900,
                  lineHeight: 0.92,
                  letterSpacing: "-2.4px",
                  textShadow: "0 14px 34px rgba(0,0,0,0.38)",
                }}
              >
                {heroText}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 290,
                padding: "24px 30px",
                borderRadius: 32,
                background: "rgba(7,18,47,0.52)",
                border: "1px solid rgba(255,255,255,0.16)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 18px 44px rgba(0,0,0,0.28)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "1.6px",
                  color: "rgba(255,255,255,0.68)",
                  marginBottom: 10,
                }}
              >
                Endstand
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "center",
                  fontSize: 108,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: "-3px",
                  textShadow: "0 12px 26px rgba(0,0,0,0.35)",
                }}
              >
                {scoreText}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 18,
              padding: "18px 22px",
              borderRadius: 26,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              {data.strikrLogoUrl ? (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    display: "flex",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
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
                      padding: 5,
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    minWidth: 44,
                    height: 44,
                    padding: "0 12px",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #6D5EF5, #3B82F6)",
                    fontSize: 20,
                    fontWeight: 900,
                    letterSpacing: "-0.5px",
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
                    fontSize: 24,
                    fontWeight: 900,
                    letterSpacing: "-0.8px",
                  }}
                >
                  Strikr
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: 18,
                    color: "rgba(255,255,255,0.68)",
                    fontWeight: 600,
                  }}
                >
                  made for football moments
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 2,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  fontWeight: 900,
                  letterSpacing: "-0.6px",
                }}
              >
                #getstrikr
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  color: "rgba(255,255,255,0.68)",
                  fontWeight: 600,
                }}
              >
                @getstrikr
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}