import { ImageResponse } from "next/og";
import { getResultShareData } from "@/lib/share/result-share";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getResultHighlight(goalsA: number, goalsB: number) {
  const diff = Math.abs(goalsA - goalsB);

  if (goalsA === goalsB) return "🤝 Alles offen";
  if (diff >= 3) return "💪 Dominanter Sieg";
  if (diff === 1) return "😮 Knappe Kiste";
  return "⚡ Klar entschieden";
}

function getResultStory(goalsA: number, goalsB: number) {
  const diff = Math.abs(goalsA - goalsB);

  if (goalsA === goalsB) return "Zwei Teams auf Augenhöhe.";
  if (diff >= 3) return "Klare Sache heute.";
  if (diff === 1) return "Bis zum Schluss spannend.";
  return "Verdient durchgesetzt.";
}

function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
}

function pickVariant(seed: string, options: string[]) {
  if (options.length === 0) return "";
  return options[hashString(seed) % options.length];
}

function getHeadline(goalsA: number, goalsB: number, seed: string) {
  const diff = Math.abs(goalsA - goalsB);
  const isDraw = goalsA === goalsB;

  if (isDraw) {
    return pickVariant(seed, [
      "Hart umkämpft",
      "Alles offen",
      "Kein Sieger",
      "Enge Kiste",
    ]);
  }

  if (diff >= 6) {
    return pickVariant(seed, [
      "Statement-Sieg",
      "Richtig abgeliefert",
      "Klare Ansage",
    ]);
  }

  if (diff >= 3) {
    return pickVariant(seed, [
      "Starkes Ding",
      "Sauber gewonnen",
      "Überzeugend",
    ]);
  }

  return pickVariant(seed, [
    "Ganz enges Ding",
    "Bis zum Schluss",
    "Knapper Sieg",
  ]);
}

async function getStrikrLogoDataUrl() {
  const iconPath = path.join(process.cwd(), "app", "icon.png");
  const file = await readFile(iconPath);
  return `data:image/png;base64,${file.toString("base64")}`;
}

async function remoteImageToDataUrl(url: string | null) {
  if (!url) return null;

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
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
      : "Strikr Club";

    const clubCrestUrl = hasText(data.branding?.clubCrestUrl)
      ? data.branding.clubCrestUrl
      : null;

    const date = hasText(data.date) ? data.date : "";
    const winnerPhotoUrl = hasText(data.winnerPhotoUrl)
      ? data.winnerPhotoUrl
      : null;

    const goalsA = Number(data.goalsA ?? 0);
    const goalsB = Number(data.goalsB ?? 0);

    const scoreText = `${goalsA}:${goalsB}`;
    const seed = `${id}-${date}-${scoreText}`;

    const headline = getHeadline(goalsA, goalsB, seed);
    const highlight = getResultHighlight(goalsA, goalsB);
    const story = getResultStory(goalsA, goalsB);

    const strikrLogoDataUrl = await getStrikrLogoDataUrl();
    const winnerPhotoDataUrl = await remoteImageToDataUrl(winnerPhotoUrl);
    const clubCrestDataUrl = await remoteImageToDataUrl(clubCrestUrl);

    return new ImageResponse(
      (
        <div
          style={{
            width: 1080,
            height: 1350,
            display: "flex",
            flexDirection: "column",
            background: "#0A0A0A",
            color: "#fff",
            padding: "60px 50px 110px 50px",
            fontFamily: "sans-serif",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background:
                "linear-gradient(180deg, #0A0A0A 0%, #111111 60%, #0F0F0F 100%)",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: -180,
              right: -140,
              width: 340,
              height: 340,
              borderRadius: 999,
              background: "rgba(255,255,255,0.015)",
              display: "flex",
            }}
          />

          <div
            style={{
              position: "absolute",
              bottom: -140,
              left: -100,
              width: 240,
              height: 240,
              borderRadius: 999,
              background: "rgba(255,255,255,0.012)",
              display: "flex",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                maxWidth: 860,
              }}
            >
              {clubCrestDataUrl ? (
                <img
                  src={clubCrestDataUrl}
                  alt=""
                  width={84}
                  height={84}
                  style={{
                    width: 84,
                    height: 84,
                    objectFit: "contain",
                    display: "block",
                    flexShrink: 0,
                  }}
                />
              ) : null}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 42,
                    fontWeight: 800,
                    lineHeight: 1.04,
                    letterSpacing: -0.8,
                  }}
                >
                  {clubName}
                </div>

                {date ? (
                  <div
                    style={{
                      display: "flex",
                      fontSize: 27,
                      color: "rgba(255,255,255,0.72)",
                      fontWeight: 600,
                    }}
                  >
                    {date}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 30,
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  padding: "12px 18px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  fontSize: 24,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {highlight}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 82,
                  fontWeight: 900,
                  lineHeight: 0.95,
                  letterSpacing: -3,
                  maxWidth: 940,
                }}
              >
                {headline}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 32,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: "rgba(255,255,255,0.72)",
                  maxWidth: 940,
                }}
              >
                {story}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                width: "100%",
                marginTop: 32,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 720,
                  borderRadius: 32,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  display: "flex",
                }}
              >
                {winnerPhotoDataUrl ? (
                  <img
                    src={winnerPhotoDataUrl}
                    alt=""
                    width={1080}
                    height={720}
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
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 32,
                      fontWeight: 700,
                    }}
                  >
                    Kein Siegerfoto
                  </div>
                )}

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.72) 100%)",
                    display: "flex",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    bottom: 32,
                    left: 32,
                    right: 32,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      padding: "18px 22px",
                      borderRadius: 20,
                      background: "rgba(0,0,0,0.45)",
                      backdropFilter: "blur(6px)",
                      border: "1px solid rgba(255,255,255,0.18)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "rgba(255,255,255,0.7)",
                        textTransform: "uppercase",
                        letterSpacing: 1.5,
                        display: "flex",
                      }}
                    >
                      Endstand
                    </div>

                    <div
                      style={{
                        fontSize: 110,
                        fontWeight: 900,
                        lineHeight: 0.9,
                        letterSpacing: -4,
                        display: "flex",
                      }}
                    >
                      {scoreText}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "auto",
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
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    color: "rgba(255,255,255,0.58)",
                    fontWeight: 700,
                    display: "flex",
                  }}
                >
                  Taggt uns beim Teilen
                </div>

                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    lineHeight: 1.1,
                    display: "flex",
                  }}
                >
                  @getstrikr
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 8,
                  textAlign: "right",
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    color: "rgba(255,255,255,0.58)",
                    fontWeight: 700,
                    display: "flex",
                  }}
                >
                  Session powered by strikr
                </div>

                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: "rgba(255,255,255,0.96)",
                    letterSpacing: -0.6,
                    display: "flex",
                  }}
                >
                  strikr
                </div>

                <img
                  src={strikrLogoDataUrl}
                  alt="strikr"
                  width={72}
                  height={72}
                  style={{
                    width: 72,
                    height: 72,
                    objectFit: "contain",
                    display: "block",
                    borderRadius: 14,
                    opacity: 0.95,
                  }}
                />

                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    lineHeight: 1.15,
                    color: "rgba(255,255,255,0.78)",
                    maxWidth: 320,
                    display: "flex",
                  }}
                >
                  das System für euer Training!
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1350,
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Share-Bild konnte nicht erzeugt werden.";

    return new Response(message, {
      status: 500,
    });
  }
}