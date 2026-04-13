/* eslint-disable @next/next/no-img-element */
import { ResultShareData } from "@/lib/share/types";

type ResultShareLayout = "poster" | "sticker" | "floodlight";

type ExtendedResultShareData = ResultShareData & {
  clubLogoUrl?: string | null;
  clubName?: string | null;
  strikrLogoUrl?: string | null;
  clubPrimaryColor?: string | null;
  winnerWasShorthanded?: boolean;
  upsetWin?: boolean;
  dramaticFinish?: boolean;
};

type ShareCopy = {
  kicker: string;
  headline: string;
  subline: string;
};

type Palette = {
  accent: string;
  accentSoft: string;
  accentGlow: string;
  loser: string;
  textPrimary: string;
  textSecondary: string;
  badgeBg: string;
  panelBg: string;
};

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;

  const value = Number.parseInt(expanded, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeHex(input: string) {
  const clean = input.trim().replace("#", "");

  if (clean.length === 3) {
    return `#${clean
      .split("")
      .map((char) => char + char)
      .join("")}`.toUpperCase();
  }

  if (clean.length === 6) {
    return `#${clean}`.toUpperCase();
  }

  return "#3B82F6";
}

function normalizePrimaryColor(input?: string | null) {
  const value = input?.trim().toLowerCase();

  if (!value) return "#3B82F6";
  if (value === "black") return "#020617";
  if (value === "blue") return "#2563EB";
  if (value === "red") return "#DC2626";
  if (value === "green") return "#16A34A";
  if (value.startsWith("#")) return normalizeHex(value);

  return "#3B82F6";
}

function getLuminance(hex: string) {
  const clean = normalizeHex(hex).replace("#", "");
  const value = Number.parseInt(clean, 16);

  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;

  const convert = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  const rr = convert(r);
  const gg = convert(g);
  const bb = convert(b);

  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
}

function buildPalette(
  rawPrimary: string | null | undefined,
  layout: ResultShareLayout
): Palette {
  const base = normalizePrimaryColor(rawPrimary);
  const isDarkBase = getLuminance(base) < 0.18;
  const darkLayout = layout !== "poster";

  const accent =
    darkLayout && isDarkBase
      ? "#E2E8F0"
      : layout === "poster" && isDarkBase
        ? "#334155"
        : base;

  if (layout === "poster") {
    return {
      accent,
      accentSoft: hexToRgba(accent, 0.12),
      accentGlow: hexToRgba(accent, 0.18),
      loser: "#475569",
      textPrimary: "#0F172A",
      textSecondary: "#64748B",
      badgeBg: "#FFFFFF",
      panelBg: "rgba(255,255,255,0.72)",
    };
  }

  return {
    accent,
    accentSoft: hexToRgba(accent, 0.16),
    accentGlow: hexToRgba(accent, 0.34),
    loser: "rgba(255,255,255,0.72)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.72)",
    badgeBg: "rgba(255,255,255,0.08)",
    panelBg: "rgba(7,18,47,0.42)",
  };
}

function buildCopy(data: ExtendedResultShareData): ShareCopy {
  const goalsA = Number(data.goalsA ?? 0);
  const goalsB = Number(data.goalsB ?? 0);
  const isDraw = goalsA === goalsB;
  const goalDiff = Math.abs(goalsA - goalsB);

  if (isDraw) {
    return {
      kicker: "Remis",
      headline: "Eng bis zum Schluss.",
      subline: "Kein Sieger, aber definitiv ein Abend mit Geschichte.",
    };
  }

  if (data.winnerWasShorthanded && data.upsetWin) {
    return {
      kicker: "Unterzahl",
      headline: "Einer weniger. Trotzdem gewonnen.",
      subline:
        "Nicht favorisiert, reduziert und am Ende trotzdem das Siegerfoto.",
    };
  }

  if (data.winnerWasShorthanded) {
    return {
      kicker: "Unterzahl",
      headline: "Dezimiert. Durchgezogen.",
      subline: "Weniger Leute, aber am Ende mehr Spiel auf dem Platz.",
    };
  }

  if (data.upsetWin) {
    return {
      kicker: "Upset",
      headline: "Auf dem Papier schwächer. Auf dem Platz besser.",
      subline: "Nicht als Favorit rein. Aber als Sieger raus.",
    };
  }

  if (data.dramaticFinish || goalDiff === 1) {
    return {
      kicker: "Late Push",
      headline: "Lange offen. Dann zugemacht.",
      subline: "Kein Spaziergang. Eher einer dieser Abende, die man gern teilt.",
    };
  }

  if (goalDiff >= 4) {
    return {
      kicker: "Klarer Abend",
      headline: "Heute ohne große Diskussion.",
      subline: "Von Anfang an da. Und am Ende ziemlich deutlich vorne.",
    };
  }

  return {
    kicker: "Session",
    headline: "Sauber gewonnen.",
    subline: "Flutlicht, Treffer, Siegerbild. Kann man so mitnehmen.",
  };
}

function hashString(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function chooseLayout(data: ExtendedResultShareData): ResultShareLayout {
  const seed = [
    data.clubName ?? data.branding.clubName ?? "club",
    data.date ?? "date",
    `${data.goalsA}:${data.goalsB}`,
  ].join("|");

  const layouts: ResultShareLayout[] = ["poster", "sticker", "floodlight"];
  return layouts[hashString(seed) % layouts.length];
}

function getDisplayClubName(data: ExtendedResultShareData) {
  return data.clubName ?? data.branding.clubName ?? "Club Session";
}

function getClubLogoUrl(data: ExtendedResultShareData) {
  return data.clubLogoUrl ?? data.branding.clubCrestUrl ?? null;
}

function getScoreModel(data: ExtendedResultShareData) {
  const goalsA = Number(data.goalsA ?? 0);
  const goalsB = Number(data.goalsB ?? 0);

  return {
    goalsA,
    goalsB,
    isDraw: goalsA === goalsB,
    teamAIsWinner: goalsA >= goalsB,
  };
}

function renderBrandFooter(params: {
  palette: Palette;
  strikrLogoUrl?: string | null;
  dark: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {params.strikrLogoUrl ? (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: params.dark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
              border: params.dark
                ? "1px solid rgba(255,255,255,0.12)"
                : "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <img
              src={params.strikrLogoUrl}
              alt="Strikr"
              width={34}
              height={34}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                padding: 4,
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: params.palette.accent,
              color: params.dark ? "#0F172A" : "#FFFFFF",
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            S
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 13,
              fontWeight: 900,
              color: params.palette.textPrimary,
              letterSpacing: "-0.4px",
            }}
          >
            Strikr
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 10,
              fontWeight: 600,
              color: params.palette.textSecondary,
            }}
          >
            powered by strikr
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 10,
          fontWeight: 700,
          color: params.palette.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "1.4px",
        }}
      >
        #getstrikr
      </div>
    </div>
  );
}

function renderClubBadge(params: {
  clubName: string;
  clubLogoUrl: string | null;
  palette: Palette;
  dark: boolean;
  strikrLogoUrl?: string | null;
}) {
  const fallbackLogo = params.strikrLogoUrl ?? null;
  const logoSrc = params.clubLogoUrl ?? fallbackLogo;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 16,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: params.dark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
          border: params.dark
            ? "1px solid rgba(255,255,255,0.14)"
            : "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
          flexShrink: 0,
        }}
      >
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={params.clubName}
            width={58}
            height={58}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              padding: 7,
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              color: params.dark ? "#FFFFFF" : "#0F172A",
              fontSize: 18,
              fontWeight: 900,
            }}
          >
            S
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 14,
            fontWeight: 800,
            color: params.palette.textPrimary,
            maxWidth: 240,
          }}
        >
          {params.clubName}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 10,
            fontWeight: 700,
            color: params.palette.textSecondary,
            textTransform: "uppercase",
            letterSpacing: "1.4px",
          }}
        >
          Result Story
        </div>
      </div>
    </div>
  );
}

function renderPhotoOrFallback(params: {
  winnerPhotoUrl?: string | null;
  palette: Palette;
  dark: boolean;
  width: number;
  height: number;
  borderRadius: number;
}) {
  if (params.winnerPhotoUrl) {
    return (
      <img
        src={params.winnerPhotoUrl}
        alt="Siegerfoto"
        width={params.width}
        height={params.height}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          borderRadius: params.borderRadius,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: params.borderRadius,
        background: params.dark
          ? "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))"
          : "linear-gradient(135deg, rgba(15,23,42,0.06), rgba(15,23,42,0.02))",
        color: params.palette.textSecondary,
        fontSize: 28,
        fontWeight: 700,
      }}
    >
      Kein Siegerfoto
    </div>
  );
}

function PosterLayout({ data }: { data: ExtendedResultShareData }) {
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
        padding: 34,
        gap: 24,
        color: palette.textPrimary,
        background: `
          radial-gradient(circle at 18% 12%, ${palette.accentGlow}, transparent 24%),
          linear-gradient(180deg, #F6F2EA 0%, #EEE8DE 100%)
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
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 12,
              fontWeight: 800,
              color: palette.textSecondary,
              textTransform: "uppercase",
              letterSpacing: "1.6px",
            }}
          >
            {copy.kicker}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
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
            width: "42%",
            justifyContent: "space-between",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 102,
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: "-5px",
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
              <span style={{ color: palette.textSecondary, margin: "0 10px" }}>
                :
              </span>
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
                gap: 14,
                fontSize: 14,
                fontWeight: 700,
                color: palette.textSecondary,
              }}
            >
              <div>{data.teamAName}</div>
              <div>{data.teamBName}</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 40,
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: "-1.6px",
              }}
            >
              {copy.headline}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 18,
                lineHeight: 1.5,
                color: palette.textSecondary,
                fontWeight: 600,
              }}
            >
              {copy.subline}
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
            width: "58%",
            borderRadius: 34,
            overflow: "hidden",
            background: "#FFFFFF",
            boxShadow: "0 24px 54px rgba(15,23,42,0.18)",
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

function StickerLayout({ data }: { data: ExtendedResultShareData }) {
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
        color: palette.textPrimary,
        background: `
          radial-gradient(circle at 16% 14%, ${palette.accentGlow}, transparent 22%),
          linear-gradient(180deg, #0C111A 0%, #161C28 100%)
        `,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          borderRadius: 38,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 28px 72px rgba(0,0,0,0.34)",
        }}
      >
        {renderPhotoOrFallback({
          winnerPhotoUrl: data.winnerPhotoUrl,
          palette,
          dark: true,
          width: 1200,
          height: 1440,
          borderRadius: 38,
        })}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(8,12,18,0.92) 0%, rgba(8,12,18,0.12) 46%, rgba(8,12,18,0.2) 100%)",
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
          {renderClubBadge({
            clubName,
            clubLogoUrl,
            palette,
            dark: true,
            strikrLogoUrl: data.strikrLogoUrl,
          })}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 16px",
              borderRadius: 999,
              background: palette.badgeBg,
              border: "1px solid rgba(255,255,255,0.14)",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "1.3px",
              textTransform: "uppercase",
              color: palette.textSecondary,
            }}
          >
            {copy.kicker}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 34,
            top: 120,
            transform: "rotate(-2deg)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "14px 18px",
            borderRadius: 24,
            background: "#FFFFFF",
            color: "#0F172A",
            boxShadow: "0 18px 38px rgba(15,23,42,0.22)",
            maxWidth: 520,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "1.3px",
              textTransform: "uppercase",
              color: "#64748B",
            }}
          >
            {data.date}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 46,
              fontWeight: 900,
              lineHeight: 0.94,
              letterSpacing: "-1.8px",
            }}
          >
            {copy.headline}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 34,
            bottom: 132,
            transform: "rotate(2deg)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "16px 20px",
            borderRadius: 26,
            background: hexToRgba(palette.accent, 0.96),
            boxShadow: `0 18px 42px ${palette.accentGlow}`,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "1.3px",
              color: "rgba(255,255,255,0.72)",
            }}
          >
            Endstand
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              fontSize: 74,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-3px",
            }}
          >
            <span
              style={{
                color: score.isDraw
                  ? "#FFFFFF"
                  : score.teamAIsWinner
                    ? "#FFFFFF"
                    : "rgba(255,255,255,0.72)",
              }}
            >
              {score.goalsA}
            </span>
            <span style={{ color: "rgba(255,255,255,0.62)" }}>:</span>
            <span
              style={{
                color: score.isDraw
                  ? "#FFFFFF"
                  : score.teamAIsWinner
                    ? "rgba(255,255,255,0.72)"
                    : "#FFFFFF",
              }}
            >
              {score.goalsB}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              fontSize: 12,
              fontWeight: 700,
              color: "rgba(255,255,255,0.76)",
            }}
          >
            <span>{data.teamAName}</span>
            <span>{data.teamBName}</span>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 28,
            right: 28,
            bottom: 24,
            display: "flex",
            padding: "16px 18px",
            borderRadius: 22,
            background: "rgba(0,0,0,0.34)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {renderBrandFooter({
            palette,
            dark: true,
            strikrLogoUrl: data.strikrLogoUrl,
          })}
        </div>
      </div>
    </div>
  );
}

function FloodlightLayout({ data }: { data: ExtendedResultShareData }) {
  const clubName = getDisplayClubName(data);
  const clubLogoUrl = getClubLogoUrl(data);
  const copy = buildCopy(data);
  const palette = buildPalette(data.clubPrimaryColor, "floodlight");
  const score = getScoreModel(data);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: 26,
        color: palette.textPrimary,
        background: `
          radial-gradient(circle at 50% 6%, rgba(255,255,255,0.18), transparent 16%),
          radial-gradient(circle at 20% 18%, ${palette.accentGlow}, transparent 22%),
          linear-gradient(180deg, #05070B 0%, #0C1220 100%)
        `,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          borderRadius: 42,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.42)",
        }}
      >
        {renderPhotoOrFallback({
          winnerPhotoUrl: data.winnerPhotoUrl,
          palette,
          dark: true,
          width: 1200,
          height: 1440,
          borderRadius: 42,
        })}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(3,6,11,0.94) 0%, rgba(3,6,11,0.18) 40%, rgba(3,6,11,0.28) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 26,
            right: 26,
            top: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 18,
          }}
        >
          {renderClubBadge({
            clubName,
            clubLogoUrl,
            palette,
            dark: true,
            strikrLogoUrl: data.strikrLogoUrl,
          })}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: palette.textSecondary,
              }}
            >
              {copy.kicker}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 18,
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
            position: "absolute",
            left: 30,
            right: 30,
            bottom: 28,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxWidth: "55%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 800,
                  color: palette.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                }}
              >
                Winner Moment
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 78,
                  fontWeight: 900,
                  lineHeight: 0.92,
                  letterSpacing: "-2.6px",
                  textShadow: `0 0 20px ${palette.accentGlow}, 0 14px 34px rgba(0,0,0,0.34)`,
                }}
              >
                {copy.headline}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  lineHeight: 1.45,
                  fontWeight: 600,
                  color: palette.textSecondary,
                }}
              >
                {copy.subline}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 310,
                padding: "24px 30px",
                borderRadius: 34,
                background: palette.panelBg,
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: `0 18px 44px rgba(0,0,0,0.28), 0 0 28px ${palette.accentGlow}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 800,
                  color: palette.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  marginBottom: 10,
                }}
              >
                Endstand
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  fontSize: 104,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: "-3.2px",
                  textShadow: "0 12px 24px rgba(0,0,0,0.34)",
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
                <span style={{ color: "rgba(255,255,255,0.5)" }}>:</span>
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
                  gap: 14,
                  fontSize: 13,
                  fontWeight: 700,
                  color: palette.textSecondary,
                  marginTop: 10,
                }}
              >
                <span>{data.teamAName}</span>
                <span>{data.teamBName}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              padding: "18px 20px",
              borderRadius: 24,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {renderBrandFooter({
              palette,
              dark: true,
              strikrLogoUrl: data.strikrLogoUrl,
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultShareCard({
  data,
}: {
  data: ExtendedResultShareData;
}) {
  const layout = chooseLayout(data);

  if (layout === "poster") {
    return <PosterLayout data={data} />;
  }

  if (layout === "sticker") {
    return <StickerLayout data={data} />;
  }

  return <FloodlightLayout data={data} />;
}