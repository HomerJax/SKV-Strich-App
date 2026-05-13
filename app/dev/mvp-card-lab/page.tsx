const strikrLogo = "/brand/strikr-mark.png";

type Tier = {
  key: string;
  label: string;
  image: string;
  top: string;
  glow: string;
  text: string;
  sub: string;
};

const tiers: Tier[] = [
  {
    key: "blech",
    label: "Blech",
    image: "/badges/hero/blech.webp",
    top: "linear-gradient(135deg,#d4d4d8 0%,#52525b 48%,#020617 100%)",
    glow: "rgba(161,161,170,0.34)",
    text: "#d4d4d8",
    sub: "Ab jetzt zählt’s.",
  },
  {
    key: "bronze",
    label: "Bronze",
    image: "/badges/hero/bronze.webp",
    top: "linear-gradient(135deg,#7c2d12 0%,#ea580c 46%,#fed7aa 100%)",
    glow: "rgba(249,115,22,0.42)",
    text: "#fed7aa",
    sub: "Kein Zufall mehr.",
  },
  {
    key: "silber",
    label: "Silber",
    image: "/badges/hero/silber.webp",
    top: "linear-gradient(135deg,#0f172a 0%,#94a3b8 52%,#f8fafc 100%)",
    glow: "rgba(203,213,225,0.42)",
    text: "#f1f5f9",
    sub: "Jetzt wird’s ernst.",
  },
  {
    key: "gold",
    label: "Gold",
    image: "/badges/hero/gold.webp",
    top: "linear-gradient(135deg,#78350f 0%,#f59e0b 46%,#fde68a 100%)",
    glow: "rgba(245,158,11,0.56)",
    text: "#fde68a",
    sub: "Statement gesetzt.",
  },
  {
    key: "goat",
    label: "GOAT",
    image: "/badges/hero/goat.webp",
    top: "linear-gradient(135deg,#312e81 0%,#db2777 42%,#facc15 72%,#22d3ee 100%)",
    glow: "rgba(217,70,239,0.70)",
    text: "#f0abfc",
    sub: "Legendenstatus.",
  },
];

type CardFrameProps = {
  title: string;
  children: React.ReactNode;
};

function PreviewFrame({ title, children }: CardFrameProps) {
  const scale = 0.2;
  const width = 1080;
  const height = 1920;

  return (
    <div>
      <div className="mb-3 max-w-[216px] text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {title}
      </div>

      <div
        className="overflow-hidden rounded-[22px] border border-white/10 bg-slate-900 shadow-2xl"
        style={{
          width: width * scale,
          height: height * scale,
        }}
      >
        <div
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function TopBar({ dark = true }: { dark?: boolean }) {
  const bg = dark ? "rgba(2,6,12,0.46)" : "rgba(255,255,255,0.76)";
  const border = dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.08)";
  const main = dark ? "#ffffff" : "#020617";
  const muted = dark ? "rgba(255,255,255,0.48)" : "rgba(15,23,42,0.42)";

  return (
    <div
      style={{
        position: "absolute",
        top: 34,
        left: 34,
        right: 34,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          minWidth: 330,
          padding: "18px 20px",
          borderRadius: 28,
          background: bg,
          border: `1px solid ${border}`,
          backdropFilter: "blur(14px)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 68,
            height: 68,
            borderRadius: 20,
            background: dark ? "#ffffff" : "#020617",
            color: dark ? "#020617" : "#ffffff",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 900,
          }}
        >
          SKV
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 900,
              color: main,
              lineHeight: 1,
            }}
          >
            SKV Rutesheim AH
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 10,
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: muted,
            }}
          >
            Training Moment
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "18px 20px",
          borderRadius: 28,
          background: bg,
          border: `1px solid ${border}`,
          backdropFilter: "blur(14px)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={strikrLogo}
          alt=""
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 900,
              color: main,
              lineHeight: 1,
            }}
          >
            strikr
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 10,
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 2.2,
              color: "#34d399",
            }}
          >
            @getstrikr
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer({
  text = "created with strikr",
  dark = true,
}: {
  text?: string;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 54,
        right: 54,
        bottom: 48,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "26px 30px",
        borderRadius: 32,
        background: dark ? "rgba(255,255,255,0.09)" : "#020617",
        border: dark ? "1px solid rgba(255,255,255,0.10)" : "none",
        color: "rgba(255,255,255,0.72)",
        fontSize: 20,
        fontWeight: 900,
        zIndex: 20,
      }}
    >
      <div style={{ display: "flex" }}>{text}</div>
      <div style={{ display: "flex" }}>@getstrikr · strikr.team</div>
    </div>
  );
}

function Badge({ tier, size = 620 }: { tier: Tier; size?: number }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: size * 0.82,
          height: size * 0.55,
          borderRadius: 999,
          background: tier.glow,
          filter: "blur(95px)",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tier.image}
        alt=""
        style={{
          position: "relative",
          width: size,
          height: size,
          objectFit: "contain",
          filter:
            tier.key === "blech"
              ? "brightness(0.72) contrast(1.30) saturate(0.35) sepia(0.10) drop-shadow(0 54px 90px rgba(0,0,0,0.78))"
              : "drop-shadow(0 54px 90px rgba(0,0,0,0.78)) drop-shadow(0 0 34px rgba(255,255,255,0.14))",
        }}
      />
    </div>
  );
}

function WinnerPremium({ tier }: { tier: Tier }) {
  return (
    <PreviewFrame title={`Winner Premium — ${tier.label}`}>
      <div
        style={{
          position: "relative",
          width: 1080,
          height: 1920,
          padding: 24,
          background: "#020617",
          color: "#ffffff",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 24,
            overflow: "hidden",
            borderRadius: 36,
            background:
              "linear-gradient(180deg,#050713 0%,#090b12 48%,#000000 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 560,
              background: tier.top,
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 250,
              left: -120,
              width: 1320,
              height: 780,
              borderRadius: "999px",
              background: tier.glow,
              filter: "blur(135px)",
              transform: "rotate(-10deg)",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.72) 36%, rgba(0,0,0,0.12) 100%)",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.055,
              backgroundImage:
                "repeating-linear-gradient(90deg,#ffffff 0px,#ffffff 1px,transparent 1px,transparent 90px)",
            }}
          />

          <TopBar />

          <div
            style={{
              position: "absolute",
              top: 285,
              left: 54,
              right: 54,
              zIndex: 5,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 82,
                fontWeight: 900,
                letterSpacing: -5,
                lineHeight: 0.86,
                textTransform: "uppercase",
              }}
            >
              Ich wurde
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 10,
                fontSize: 194,
                fontWeight: 900,
                letterSpacing: -15,
                lineHeight: 0.76,
                textTransform: "uppercase",
              }}
            >
              MVP.
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 34,
                fontSize: 40,
                fontWeight: 900,
                color: "rgba(255,255,255,0.70)",
              }}
            >
              {tier.sub}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              top: 690,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              zIndex: 4,
            }}
          >
            <Badge tier={tier} size={tier.key === "goat" ? 735 : 675} />
          </div>

          <div
            style={{
              position: "absolute",
              left: 56,
              right: 56,
              top: 1455,
              zIndex: 6,
              display: "flex",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: tier.text,
              }}
            >
              {tier.label} strikr badge
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 24,
                padding: "18px 26px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.68)",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              Marcello Testa · SKV Rutesheim AH
            </div>
          </div>

          <Footer text="earned with strikr" />
        </div>
      </div>
    </PreviewFrame>
  );
}

function TeamBrightAward({ tier }: { tier: Tier }) {
  return (
    <PreviewFrame title={`Team heller Award — ${tier.label}`}>
      <div
        style={{
          position: "relative",
          width: 1080,
          height: 1920,
          padding: 24,
          background: "#020617",
          color: "#020617",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 24,
            overflow: "hidden",
            borderRadius: 36,
            background: "#f8fafc",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: 540,
              background: tier.top,
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 360,
              left: -160,
              width: 1320,
              height: 620,
              borderRadius: "999px",
              background: tier.glow,
              opacity: 0.65,
              filter: "blur(120px)",
            }}
          />

          <TopBar />

          <div
            style={{
              position: "absolute",
              top: 292,
              left: 54,
              right: 54,
              zIndex: 5,
              color: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 24,
                fontSize: 106,
                fontWeight: 900,
                letterSpacing: -8.5,
                lineHeight: 0.78,
                color: "#ffffff",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  display: "flex",
                  fontSize: 116,
                  fontWeight: 900,
                  letterSpacing: -10,
                  textTransform: "lowercase",
                }}
              >
                strikr
              </span>
              <span
                style={{
                  display: "flex",
                  textTransform: "uppercase",
                }}
              >
                MVP
              </span>
              <span
                style={{
                  display: "flex",
                  textTransform: "uppercase",
                }}
              >
                Badge
              </span>
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 20,
                fontSize: 132,
                fontWeight: 900,
                letterSpacing: -9,
                lineHeight: 0.78,
                textTransform: "uppercase",
                color: "#ffffff",
              }}
            >
              {tier.label}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              top: 605,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              zIndex: 6,
            }}
          >
            <Badge tier={tier} size={tier.key === "goat" ? 640 : 585} />
          </div>

          <div
            style={{
              position: "absolute",
              left: 56,
              right: 56,
              top: 1265,
              zIndex: 7,
              padding: 36,
              borderRadius: 40,
              background: "#ffffff",
              boxShadow: "0 34px 90px rgba(15,23,42,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "rgba(15,23,42,0.36)",
              }}
            >
              Glückwunsch
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 72,
                fontWeight: 900,
                letterSpacing: -5,
                lineHeight: 0.92,
              }}
            >
              Marcello Testa
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 28,
                fontWeight: 800,
                color: "rgba(15,23,42,0.58)",
              }}
            >
              wurde zum MVP gewählt.
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 26,
                paddingTop: 22,
                borderTop: "1px solid rgba(15,23,42,0.08)",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 15,
                  fontWeight: 900,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: "rgba(15,23,42,0.34)",
                }}
              >
                Voting Ergebnis
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 18 }}>
                <div style={{ display: "flex", fontSize: 23, fontWeight: 900, color: "#020617" }}>
                  1. Marcello Testa
                </div>
                <div style={{ display: "flex", fontSize: 20, fontWeight: 900, color: "rgba(15,23,42,0.56)" }}>
                  5 Stimmen
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 18 }}>
                <div style={{ display: "flex", fontSize: 21, fontWeight: 900, color: "rgba(15,23,42,0.52)" }}>
                  2. Steffen
                </div>
                <div style={{ display: "flex", fontSize: 19, fontWeight: 900, color: "rgba(15,23,42,0.42)" }}>
                  3 Stimmen
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 18 }}>
                <div style={{ display: "flex", fontSize: 21, fontWeight: 900, color: "rgba(15,23,42,0.52)" }}>
                  3. Julian
                </div>
                <div style={{ display: "flex", fontSize: 19, fontWeight: 900, color: "rgba(15,23,42,0.42)" }}>
                  2 Stimmen
                </div>
              </div>
            </div>
          </div>

          <Footer dark={false} />
        </div>
      </div>
    </PreviewFrame>
  );
}

export default function MvpCardLabPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
            strikr dev
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            MVP Card Lab
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Variante 2 und 3 als Tier-System. Farben eskalieren je Badge-Level,
            damit MVP Cards näher an die Result-Card-Familie rücken.
          </p>
        </div>

        <h2 className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-slate-500">
          Winner Premium
        </h2>
        <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {tiers.map((tier) => (
            <WinnerPremium key={`winner-${tier.key}`} tier={tier} />
          ))}
        </div>

        <h2 className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-slate-500">
          Team heller Award
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {tiers.map((tier) => (
            <TeamBrightAward key={`team-${tier.key}`} tier={tier} />
          ))}
        </div>
      </div>
    </main>
  );
}
