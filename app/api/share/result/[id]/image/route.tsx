import { ImageResponse } from "next/og";
import { getResultShareData } from "@/lib/share/result-share";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
      "Bis zuletzt offen",
    ]);
  }

  if (diff >= 6) {
    return pickVariant(seed, [
      "Statement-Sieg",
      "Klar dominiert",
      "Richtig abgeliefert",
      "Deutliche Ansage",
      "Souverän gewonnen",
    ]);
  }

  if (diff >= 3) {
    return pickVariant(seed, [
      "Klarer Sieg",
      "Starkes Ding",
      "Sauber gemacht",
      "Überzeugend gewonnen",
      "Starker Abend",
    ]);
  }

  return pickVariant(seed, [
    "Knapp durchgesetzt",
    "Bis zum Schluss",
    "Enge Nummer",
    "Wichtiger Sieg",
    "Ganz enges Ding",
  ]);
}

function getSubline(
  goalsA: number,
  goalsB: number,
  winnerLabel: string,
  seed: string
) {
  const diff = Math.abs(goalsA - goalsB);
  const isDraw = goalsA === goalsB;

  if (isDraw) {
    return pickVariant(seed + "-draw", [
      "Intensives Spiel ohne Sieger.",
      "Zwei Teams auf Augenhöhe.",
      "Am Ende bleibt alles offen.",
    ]);
  }

  if (diff >= 6) {
    return pickVariant(seed + "-big", [
      `${winnerLabel} mit einer klaren Vorstellung.`,
      "Heute lief vieles in die richtige Richtung.",
      "Ein Abend mit klarer Linie.",
    ]);
  }

  if (diff >= 3) {
    return pickVariant(seed + "-mid", [
      `${winnerLabel} setzt sich verdient durch.`,
      "Guter Abend, klares Ergebnis.",
      "Solide Leistung mit klarem Ausgang.",
    ]);
  }

  return pickVariant(seed + "-small", [
    `${winnerLabel} holt sich das Ding knapp.`,
    "Knapp, intensiv und am Ende erfolgreich.",
    "Ein enges Spiel mit dem besseren Ende.",
  ]);
}

async function getStrikrLogoDataUrl() {
  const iconPath = path.join(process.cwd(), "app", "icon.png");
  const file = await readFile(iconPath);
  return `data:image/png;base64,${file.toString("base64")}`;
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
    const winnerLabel = hasText(data.winnerLabel)
      ? data.winnerLabel
      : "Unentschieden";
    const winnerPhotoUrl = hasText(data.winnerPhotoUrl) ? data.winnerPhotoUrl : null;

    const goalsAValue = Number(data.goalsA ?? 0);
    const goalsBValue = Number(data.goalsB ?? 0);

    const goalsA = Number.isFinite(goalsAValue) ? goalsAValue : 0;
    const goalsB = Number.isFinite(goalsBValue) ? goalsBValue : 0;

    const scoreText = `${goalsA}:${goalsB}`;
    const seed = `${id}-${date}-${scoreText}-${winnerLabel}`;
    const headline = getHeadline(goalsA, goalsB, seed);
    const subline = getSubline(goalsA, goalsB, winnerLabel, seed);
    const strikrLogoDataUrl = await getStrikrLogoDataUrl();

    return new ImageResponse(
      (
        <div
          style={{
            width: 1080,
            height: 1350,
            display: "flex",
            position: "relative",
            overflow: "hidden",
            background: "#0A0A0A",
            color: "#FFFFFF",
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
              padding: "40px 40px 54px 40px",
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
              {clubCrestUrl ? (
                <img
                  src={clubCrestUrl}
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
                marginTop: 34,
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 92,
                  fontWeight: 900,
                  lineHeight: 0.94,
                  letterSpacing: -3,
                  maxWidth: 940,
                }}
              >
                {headline}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 34,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: "rgba(255,255,255,0.72)",
                  maxWidth: 940,
                }}
              >
                {subline}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                width: "100%",
                marginTop: 32,
                borderRadius: 34,
                padding: 16,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  position: "relative",
                  width: "100%",
                  height: 700,
                  borderRadius: 26,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                {winnerPhotoUrl ? (
                  <img
                    src={winnerPhotoUrl}
                    alt=""
                    width={968}
                    height={700}
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
                      background: "rgba(255,255,255,0.03)",
                      color: "rgba(255,255,255,0.58)",
                      fontSize: 34,
                      fontWeight: 700,
                    }}
                  >
                    Kein Siegerfoto
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginTop: 42,
                gap: 24,
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
                    display: "flex",
                    fontSize: 23,
                    fontWeight: 800,
                    color: "rgba(255,255,255,0.58)",
                    letterSpacing: 1.8,
                    textTransform: "uppercase",
                  }}
                >
                  Endstand
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: 124,
                    fontWeight: 900,
                    lineHeight: 0.9,
                    letterSpacing: -5,
                  }}
                >
                  {scoreText}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 12,
                  maxWidth: 420,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 20,
                    color: "rgba(255,255,255,0.58)",
                    fontWeight: 700,
                  }}
                >
                  Training managed by:
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: 24,
                    fontWeight: 900,
                    lineHeight: 1.15,
                    textAlign: "right",
                  }}
                >
                  strikr – Das System für euer Training
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 18px",
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <img
                    src={strikrLogoDataUrl}
                    alt="strikr"
                    width={52}
                    height={52}
                    style={{
                      width: 52,
                      height: 52,
                      objectFit: "contain",
                      display: "block",
                      borderRadius: 12,
                      flexShrink: 0,
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 2,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                      }}
                    >
                      strikr
                    </div>

                    <div
                      style={{
                        fontSize: 16,
                        color: "rgba(255,255,255,0.65)",
                        fontWeight: 700,
                      }}
                    >
                      #getstrikr
                    </div>
                  </div>
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
      error instanceof Error ? error.message : "Share-Bild konnte nicht erzeugt werden.";

    return new Response(message, {
      status: 500,
    });
  }
}