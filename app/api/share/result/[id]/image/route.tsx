import { ImageResponse } from "next/og";
import { getResultShareData } from "@/lib/share/result-share";

export const runtime = "nodejs";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data = await getResultShareData(id);

    const clubName = hasText(data.branding?.clubName)
      ? data.branding.clubName
      : "Strikr";
    const clubCrestUrl = hasText(data.branding?.clubCrestUrl)
      ? data.branding.clubCrestUrl
      : null;

    const subtitle = hasText(data.subtitle) ? data.subtitle : "match result by strikr";
    const date = hasText(data.date) ? data.date : "";
    const title = hasText(data.title) ? data.title : "Ergebnis";
    const teamAName = hasText(data.teamAName) ? data.teamAName : "Team A";
    const teamBName = hasText(data.teamBName) ? data.teamBName : "Team B";
    const goalsA = hasText(data.goalsA) ? data.goalsA : "0";
    const goalsB = hasText(data.goalsB) ? data.goalsB : "0";
    const winnerLabel = hasText(data.winnerLabel) ? data.winnerLabel : "Unentschieden";
    const winnerPhotoUrl = hasText(data.winnerPhotoUrl) ? data.winnerPhotoUrl : null;

    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            display: "flex",
            position: "relative",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #081225 0%, #0f172a 32%, #172554 100%)",
            color: "#ffffff",
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -140,
              left: -120,
              width: 380,
              height: 380,
              borderRadius: 9999,
              background: "rgba(59,130,246,0.15)",
              filter: "blur(28px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -120,
              left: 300,
              width: 320,
              height: 320,
              borderRadius: 9999,
              background: "rgba(16,185,129,0.10)",
              filter: "blur(28px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 90,
              right: 240,
              width: 280,
              height: 280,
              borderRadius: 9999,
              background: "rgba(96,165,250,0.10)",
              filter: "blur(24px)",
            }}
          />

          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                width: winnerPhotoUrl ? "53%" : "100%",
                height: "100%",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "38px 40px 34px 40px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    minWidth: 0,
                  }}
                >
                  {clubCrestUrl ? (
                    <img
                      src={clubCrestUrl}
                      alt=""
                      width={60}
                      height={60}
                      style={{
                        borderRadius: 16,
                        objectFit: "cover",
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        fontSize: 24,
                        fontWeight: 800,
                        letterSpacing: 1,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                      }}
                    >
                      S
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 25,
                        fontWeight: 800,
                        lineHeight: 1.1,
                      }}
                    >
                      {clubName}
                    </div>
                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 18,
                        color: "rgba(255,255,255,0.76)",
                      }}
                    >
                      made with strikr
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    borderRadius: 9999,
                    padding: "10px 16px",
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    backdropFilter: "blur(10px)",
                    fontSize: 18,
                    color: "rgba(255,255,255,0.92)",
                    boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
                    maxWidth: 220,
                  }}
                >
                  {subtitle}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 22,
                      color: "rgba(255,255,255,0.74)",
                    }}
                  >
                    {date}
                  </div>

                  <div
                    style={{
                      fontSize: 56,
                      fontWeight: 850,
                      lineHeight: 1.02,
                      letterSpacing: -1,
                    }}
                  >
                    {title}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    gap: 14,
                    marginTop: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flex: 1,
                      flexDirection: "column",
                      borderRadius: 28,
                      padding: "24px 24px",
                      background: "rgba(255,255,255,0.09)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 29,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.94)",
                      }}
                    >
                      {teamAName}
                    </div>
                    <div
                      style={{
                        marginTop: 16,
                        fontSize: 112,
                        fontWeight: 900,
                        lineHeight: 0.9,
                        letterSpacing: -2,
                      }}
                    >
                      {goalsA}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 30,
                      fontSize: 54,
                      fontWeight: 800,
                      color: "rgba(255,255,255,0.40)",
                    }}
                  >
                    :
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flex: 1,
                      flexDirection: "column",
                      alignItems: "flex-end",
                      borderRadius: 28,
                      padding: "24px 24px",
                      background: "rgba(255,255,255,0.09)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 29,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.94)",
                        textAlign: "right",
                      }}
                    >
                      {teamBName}
                    </div>
                    <div
                      style={{
                        marginTop: 16,
                        fontSize: 112,
                        fontWeight: 900,
                        lineHeight: 0.9,
                        letterSpacing: -2,
                      }}
                    >
                      {goalsB}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    borderRadius: 9999,
                    padding: "14px 22px",
                    background: "linear-gradient(135deg, rgba(16,185,129,0.22) 0%, rgba(34,197,94,0.14) 100%)",
                    border: "1px solid rgba(74,222,128,0.35)",
                    boxShadow: "0 10px 24px rgba(0,0,0,0.14)",
                    fontSize: 25,
                    fontWeight: 800,
                  }}
                >
                  {winnerLabel}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 6,
                    color: "rgba(255,255,255,0.66)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      letterSpacing: 1.4,
                      textTransform: "uppercase",
                    }}
                  >
                    share card
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      color: "rgba(255,255,255,0.86)",
                    }}
                  >
                    Ergebnis teilen
                  </div>
                </div>
              </div>
            </div>

            {winnerPhotoUrl ? (
              <div
                style={{
                  display: "flex",
                  width: "47%",
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "28px 28px 28px 10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    borderRadius: 34,
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    boxShadow:
                      "0 24px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "radial-gradient(circle at 50% 35%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.00) 60%)",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      height: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 22,
                    }}
                  >
                    <img
                      src={winnerPhotoUrl}
                      alt=""
                      width={520}
                      height={560}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        objectPosition: "center",
                        borderRadius: 24,
                        boxShadow: "0 18px 40px rgba(0,0,0,0.24)",
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Share-Bild konnte nicht erzeugt werden.";

    return new Response(message, {
      status: 500,
    });
  }
}