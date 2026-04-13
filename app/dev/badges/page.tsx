import StrikrBadgeMark from "@/components/brand/StrikrBadgeMark";

type Concept = {
  id: string;
  title: string;
  note: string;
  shellClass?: string;
  markClass?: string;
  backdropClass?: string;
  dirt?: boolean;
  dents?: boolean;
  double?: boolean;
  floating?: boolean;
  goatOnly?: boolean;
  goatClass?: string;
  ring?: boolean;
};

function DirtLayer({ heavy = false }: { heavy?: boolean }) {
  return (
    <>
      <span className="absolute left-2 top-2 h-3.5 w-4 rounded-full bg-[rgba(120,53,15,0.38)] blur-[0.8px]" />
      <span className="absolute right-2 top-5 h-3 w-3 rounded-full bg-[rgba(146,64,14,0.32)] blur-[0.8px]" />
      <span className="absolute bottom-2 left-3 h-2.5 w-5 rounded-full bg-[rgba(87,83,78,0.30)] blur-[0.7px]" />
      <span className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-[rgba(120,53,15,0.26)] blur-[0.4px]" />
      <span className="absolute left-3 top-6 h-1.5 w-2 rounded-full bg-[rgba(68,64,60,0.20)] blur-[0.4px]" />
      {heavy ? (
        <>
          <span className="absolute left-1 top-8 h-4 w-5 rounded-full bg-[rgba(92,45,12,0.28)] blur-[0.9px]" />
          <span className="absolute right-3 bottom-4 h-3 w-4 rounded-full bg-[rgba(120,53,15,0.24)] blur-[0.8px]" />
          <span className="absolute left-4 bottom-1 h-2 w-3 rounded-full bg-[rgba(68,64,60,0.22)] blur-[0.6px]" />
        </>
      ) : null}
    </>
  );
}

function DentLayer() {
  return (
    <>
      <span className="absolute left-2.5 top-3 h-5 w-2 rounded-full bg-black/10 blur-[1px]" />
      <span className="absolute right-3 top-7 h-4 w-4 rounded-full bg-black/10 blur-[1.2px]" />
      <span className="absolute bottom-2 left-5 h-2 w-5 rounded-full bg-white/10 blur-[0.8px]" />
    </>
  );
}

function CategorySection({
  title,
  description,
  concepts,
}: {
  title: string;
  description: string;
  concepts: Concept[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {concepts.map((item) => (
          <ConceptCard key={item.id} {...item} />
        ))}
      </div>
    </section>
  );
}

function ConceptCard({
  id,
  title,
  note,
  shellClass,
  markClass,
  backdropClass,
  dirt = false,
  dents = false,
  double = false,
  floating = false,
  goatOnly = false,
  goatClass,
  ring = false,
}: Concept) {
  const markSize = "h-10 w-10";

  return (
    <div className="rounded-[22px] border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={[
            "relative flex h-24 w-24 items-center justify-center rounded-[22px]",
            backdropClass ?? "",
          ].join(" ")}
        >
          {floating ? (
            <>
              {ring ? (
                <span className="absolute h-16 w-16 rounded-full border border-white/20 shadow-[0_0_22px_rgba(255,255,255,0.10)]" />
              ) : null}

              {double && !goatOnly ? (
                <StrikrBadgeMark
                  className={`absolute h-14 w-14 opacity-30 blur-[3px] ${markClass ?? ""}`}
                />
              ) : null}

              {goatOnly ? (
                <span
                  className={[
                    "text-[40px] leading-none",
                    goatClass ??
                      "drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]",
                  ].join(" ")}
                >
                  🐐
                </span>
              ) : (
                <StrikrBadgeMark className={`${markSize} ${markClass ?? ""}`} />
              )}
            </>
          ) : (
            <div
              className={[
                "relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[16px] border",
                shellClass ?? "",
              ].join(" ")}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-white/35 to-transparent" />
              {dirt ? <DirtLayer heavy={dents} /> : null}
              {dents ? <DentLayer /> : null}
              {ring ? (
                <span className="absolute inset-1 rounded-[12px] border border-white/12" />
              ) : null}

              {double && !goatOnly ? (
                <StrikrBadgeMark
                  className={`absolute h-14 w-14 opacity-30 blur-[3px] ${markClass ?? ""}`}
                />
              ) : null}

              {goatOnly ? (
                <span
                  className={[
                    "relative z-10 text-[34px] leading-none",
                    goatClass ?? "",
                  ].join(" ")}
                >
                  🐐
                </span>
              ) : (
                <StrikrBadgeMark className={`relative z-10 ${markSize} ${markClass ?? ""}`} />
              )}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-950">
            {id} · {title}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{note}</div>
        </div>
      </div>
    </div>
  );
}

const metalAndDirty: Concept[] = [
  {
    id: "01",
    title: "Dirty Blech",
    note: "Low tier. Blechern, stumpf, matschig, rough.",
    shellClass:
      "border-stone-500 bg-[linear-gradient(180deg,rgba(245,245,244,0.98),rgba(214,211,209,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_4px_10px_rgba(87,83,78,0.08)]",
    markClass: "text-stone-700",
    dirt: true,
  },
  {
    id: "02",
    title: "Blech / rusted dented sign",
    note: "Noch schmutziger, rostiger, eingedellt. Wie ein verbogenes Blechschild.",
    shellClass:
      "rotate-[-4deg] border-stone-600 bg-[linear-gradient(180deg,rgba(231,229,228,0.98),rgba(168,162,158,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.44),0_8px_14px_rgba(87,83,78,0.16)]",
    markClass: "text-zinc-800",
    dirt: true,
    dents: true,
  },
  {
    id: "03",
    title: "Blech / scrapyard",
    note: "Sehr rough, fast kaputt. Viel Charakter.",
    shellClass:
      "rotate-[3deg] border-stone-700 bg-[linear-gradient(180deg,rgba(214,211,209,0.96),rgba(120,113,108,0.92))] shadow-[0_10px_16px_rgba(68,64,60,0.18)]",
    markClass: "text-stone-200",
    dirt: true,
    dents: true,
  },
  {
    id: "04",
    title: "Bronze Heat",
    note: "Warmes Metall mit mehr Bühne.",
    shellClass:
      "border-orange-300 bg-[linear-gradient(180deg,rgba(254,215,170,0.96),rgba(251,146,60,0.82))] shadow-[0_8px_18px_rgba(146,64,14,0.14)]",
    markClass: "text-orange-800",
  },
  {
    id: "05",
    title: "Bronze / hot rust",
    note: "Bronze mit leuchtender Rost-Energie.",
    shellClass:
      "border-orange-400 bg-[linear-gradient(180deg,rgba(254,215,170,0.96),rgba(194,65,12,0.86))] shadow-[0_0_18px_rgba(194,65,12,0.18)]",
    markClass: "text-orange-100 drop-shadow-[0_0_8px_rgba(251,146,60,0.65)]",
  },
  {
    id: "06",
    title: "Bronze / molten neon",
    note: "Zwischen Bronze und Lava. Sehr besonders.",
    shellClass:
      "border-orange-400 bg-[linear-gradient(180deg,rgba(120,53,15,1),rgba(194,65,12,0.94))] shadow-[0_0_22px_rgba(251,146,60,0.20)]",
    markClass: "text-orange-200 drop-shadow-[0_0_10px_rgba(251,146,60,0.78)]",
  },
  {
    id: "07",
    title: "Bronze / neon edge",
    note: "Sauberer als Hot Rust, aber immer noch aggressiv.",
    shellClass:
      "border-orange-300 bg-white shadow-[0_0_0_1px_rgba(251,146,60,0.18),0_0_20px_rgba(251,146,60,0.14)]",
    markClass: "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.42)]",
  },
  {
    id: "08",
    title: "Silber / icy tech",
    note: "Kühl, modern, sport-tech.",
    shellClass:
      "border-sky-200 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(186,230,253,0.72))] shadow-[0_10px_22px_rgba(14,165,233,0.12)]",
    markClass: "text-sky-700",
  },
  {
    id: "09",
    title: "Silber / chrome glass",
    note: "Heller, klarer, teurer.",
    shellClass:
      "border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(226,232,240,0.80))] shadow-[0_12px_24px_rgba(148,163,184,0.12)]",
    markClass: "text-slate-700",
  },
  {
    id: "10",
    title: "Silber / cyan chrome",
    note: "Metall trifft Cyan-Aura. Sehr modern.",
    shellClass:
      "border-cyan-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(207,250,254,0.78))] shadow-[0_0_20px_rgba(34,211,238,0.14)]",
    markClass: "text-cyan-700 drop-shadow-[0_0_8px_rgba(34,211,238,0.34)]",
  },
  {
    id: "11",
    title: "Gold / neon dark",
    note: "Gold auf dunklem Körper. High tier.",
    shellClass:
      "border-yellow-300 bg-slate-950 shadow-[0_0_0_1px_rgba(250,204,21,0.20),0_0_26px_rgba(250,204,21,0.24)]",
    markClass: "text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.95)]",
  },
  {
    id: "12",
    title: "Gold / sick shine",
    note: "Kranker gelb-goldener Shine. Trophy-Vibe.",
    shellClass:
      "border-amber-300 bg-[linear-gradient(180deg,rgba(254,249,195,0.98),rgba(245,158,11,0.86))] shadow-[0_0_26px_rgba(245,158,11,0.22)]",
    markClass: "text-yellow-100 drop-shadow-[0_0_12px_rgba(250,204,21,0.90)]",
  },
  {
    id: "13",
    title: "Gold / reactor",
    note: "Dunkler, energischer, fast nuklear.",
    shellClass:
      "border-yellow-400 bg-[linear-gradient(180deg,rgba(120,53,15,1),rgba(17,24,39,1))] shadow-[0_0_28px_rgba(250,204,21,0.18)]",
    markClass: "text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.92)]",
  },
  {
    id: "56",
    title: "Blech / twisted scrap",
    note: "Noch verbogener, kaputter, schäbiger. Maximum Schrottplatz.",
    shellClass:
      "rotate-[-6deg] border-stone-700 bg-[linear-gradient(180deg,rgba(228,228,226,0.96),rgba(140,133,128,0.90))] shadow-[inset_0_1px_0_rgba(255,255,255,0.30),0_12px_18px_rgba(41,37,36,0.20)]",
    markClass: "text-stone-300",
    dirt: true,
    dents: true,
    ring: true,
  },
  {
    id: "57",
    title: "Blech / oily rust",
    note: "Mehr Öl, mehr Dreck, mehr kaputter Industrie-Vibe.",
    shellClass:
      "rotate-[4deg] border-stone-800 bg-[linear-gradient(180deg,rgba(168,162,158,0.92),rgba(87,83,78,0.96))] shadow-[0_12px_18px_rgba(28,25,23,0.24)]",
    markClass: "text-stone-100 drop-shadow-[0_0_4px_rgba(255,255,255,0.18)]",
    dirt: true,
    dents: true,
  },
  {
    id: "58",
    title: "Bronze / furnace core",
    note: "Nicht nur Bronze – eher Ofen, Feuer, Druck.",
    shellClass:
      "border-orange-500 bg-[linear-gradient(180deg,rgba(67,20,7,1),rgba(154,52,18,0.98),rgba(249,115,22,0.80))] shadow-[0_0_24px_rgba(249,115,22,0.24)]",
    markClass: "text-orange-100 drop-shadow-[0_0_12px_rgba(251,146,60,0.90)]",
    ring: true,
  },
  {
    id: "59",
    title: "Silber / frozen reactor",
    note: "Eisiger als icy tech, härter und wertiger.",
    shellClass:
      "border-cyan-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(186,230,253,0.82),rgba(14,165,233,0.20))] shadow-[0_0_24px_rgba(34,211,238,0.16)]",
    markClass: "text-cyan-800 drop-shadow-[0_0_10px_rgba(34,211,238,0.50)]",
    ring: true,
  },
  {
    id: "60",
    title: "Gold / crowned voltage",
    note: "Gold mit mehr Strom, weniger klassische Trophäe.",
    shellClass:
      "border-yellow-300 bg-[linear-gradient(180deg,rgba(23,23,23,1),rgba(120,53,15,1),rgba(250,204,21,0.70))] shadow-[0_0_30px_rgba(250,204,21,0.22)]",
    markClass: "text-yellow-200 drop-shadow-[0_0_14px_rgba(250,204,21,0.96)]",
    ring: true,
  },
];

const neonAndHyper: Concept[] = [
  {
    id: "14",
    title: "GOAT / neon violet",
    note: "Legendary, futuristisch, sehr krass.",
    shellClass:
      "border-violet-400 bg-slate-950 shadow-[0_0_0_1px_rgba(167,139,250,0.18),0_0_26px_rgba(139,92,246,0.26)]",
    markClass: "text-violet-300 drop-shadow-[0_0_10px_rgba(167,139,250,0.90)]",
  },
  {
    id: "15",
    title: "GOAT / neon cyan",
    note: "Sport-tech, schnell, brutal modern.",
    shellClass:
      "border-cyan-400 bg-slate-950 shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_0_26px_rgba(34,211,238,0.24)]",
    markClass: "text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.90)]",
  },
  {
    id: "16",
    title: "GOAT / black neon bloom",
    note: "Maximal Fokus auf das leuchtende Mark.",
    shellClass:
      "border-slate-800 bg-black shadow-[0_0_30px_rgba(59,130,246,0.12),0_10px_24px_rgba(0,0,0,0.30)]",
    markClass: "text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.82)]",
  },
  {
    id: "17",
    title: "GOAT / rainbow shock",
    note: "Komplett drüber, aber visuell brutal stark.",
    shellClass:
      "border-fuchsia-300 bg-[linear-gradient(135deg,rgba(251,191,36,0.84),rgba(244,114,182,0.82),rgba(129,140,248,0.82),rgba(34,211,238,0.82))] shadow-[0_0_28px_rgba(236,72,153,0.18)]",
    markClass: "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.88)]",
  },
  {
    id: "18",
    title: "GOAT / toxic green",
    note: "Giftig und ganz anders. Sehr special event.",
    shellClass:
      "border-lime-400 bg-slate-950 shadow-[0_0_24px_rgba(163,230,53,0.20)]",
    markClass: "text-lime-300 drop-shadow-[0_0_10px_rgba(163,230,53,0.88)]",
  },
  {
    id: "19",
    title: "Neon Cyan Core",
    note: "Die sichere moderne Neon-Basis.",
    shellClass:
      "border-cyan-400 bg-slate-950 shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_0_28px_rgba(34,211,238,0.26)]",
    markClass: "text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.92)]",
  },
  {
    id: "20",
    title: "Neon Violet Core",
    note: "Legendary, modern, direkt GOAT-fähig.",
    shellClass:
      "border-violet-400 bg-slate-950 shadow-[0_0_0_1px_rgba(167,139,250,0.18),0_0_28px_rgba(139,92,246,0.28)]",
    markClass: "text-violet-300 drop-shadow-[0_0_10px_rgba(167,139,250,0.94)]",
  },
  {
    id: "21",
    title: "Neon Pink Burst",
    note: "Social, laut, stylisch, sehr shareable.",
    shellClass:
      "border-pink-400 bg-slate-950 shadow-[0_0_28px_rgba(236,72,153,0.24)]",
    markClass: "text-pink-300 drop-shadow-[0_0_12px_rgba(236,72,153,0.92)]",
  },
  {
    id: "22",
    title: "Neon Lime Acid",
    note: "Toxic energy. Komplett anders, aber memorable.",
    shellClass:
      "border-lime-400 bg-slate-950 shadow-[0_0_28px_rgba(163,230,53,0.24)]",
    markClass: "text-lime-300 drop-shadow-[0_0_12px_rgba(163,230,53,0.92)]",
  },
  {
    id: "23",
    title: "Rainbow Shock",
    note: "Komplett drüber, aber visuell brutal stark.",
    shellClass:
      "border-fuchsia-300 bg-[linear-gradient(135deg,rgba(251,191,36,0.84),rgba(244,114,182,0.82),rgba(129,140,248,0.82),rgba(34,211,238,0.82))] shadow-[0_0_30px_rgba(236,72,153,0.18)]",
    markClass: "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.90)]",
  },
  {
    id: "24",
    title: "Prismatic White",
    note: "Fast weiß, aber mit irisierender Bühne.",
    shellClass:
      "border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(224,231,255,0.82),rgba(207,250,254,0.76),rgba(254,205,211,0.78))] shadow-[0_0_28px_rgba(148,163,184,0.14)]",
    markClass: "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.82)]",
    ring: true,
  },
  {
    id: "25",
    title: "Holographic Glass",
    note: "Apple x esports x luxury badge.",
    shellClass:
      "border-cyan-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(224,242,254,0.80),rgba(221,214,254,0.74),rgba(254,205,211,0.72))] shadow-[0_0_30px_rgba(34,211,238,0.12)]",
    markClass: "text-slate-950 drop-shadow-[0_0_8px_rgba(255,255,255,0.44)]",
    ring: true,
  },
  {
    id: "26",
    title: "Chrome Neon",
    note: "Chrome-artiges High-End mit kaltem Glow.",
    shellClass:
      "border-slate-300 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(148,163,184,0.82))] shadow-[0_0_26px_rgba(34,211,238,0.14)]",
    markClass: "text-cyan-900 drop-shadow-[0_0_10px_rgba(34,211,238,0.48)]",
  },
  {
    id: "27",
    title: "Liquid Metal Cyan",
    note: "Wie flüssiges Metall mit Neon-Aura.",
    shellClass:
      "border-cyan-200 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.88),transparent_28%),linear-gradient(180deg,rgba(226,232,240,0.98),rgba(125,211,252,0.74))] shadow-[0_0_26px_rgba(34,211,238,0.16)]",
    markClass: "text-cyan-800 drop-shadow-[0_0_10px_rgba(34,211,238,0.52)]",
  },
  {
    id: "61",
    title: "Neon Ultra Blue",
    note: "Kalter Arena-Glow. Sehr schnell, sehr digital.",
    shellClass:
      "border-sky-400 bg-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.28)]",
    markClass: "text-sky-300 drop-shadow-[0_0_12px_rgba(56,189,248,0.96)]",
    ring: true,
  },
  {
    id: "62",
    title: "Neon White Core",
    note: "Fast sterile Premium-Energie. Brutal clean.",
    shellClass:
      "border-white/70 bg-black shadow-[0_0_30px_rgba(255,255,255,0.16)]",
    markClass: "text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.98)]",
    ring: true,
  },
  {
    id: "63",
    title: "Holo Prism Night",
    note: "Mehr Nightclub, mehr Luxus, mehr Fashion-Tech.",
    shellClass:
      "border-fuchsia-200 bg-[linear-gradient(135deg,rgba(2,6,23,1),rgba(91,33,182,0.86),rgba(34,211,238,0.56),rgba(244,114,182,0.54))] shadow-[0_0_30px_rgba(217,70,239,0.18)]",
    markClass: "text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.92)]",
    ring: true,
  },
  {
    id: "64",
    title: "Toxic Prism",
    note: "Zwischen Acid, GOAT und Event-Badge. Voll memorable.",
    shellClass:
      "border-lime-300 bg-[linear-gradient(135deg,rgba(3,7,18,1),rgba(101,163,13,0.78),rgba(34,211,238,0.44),rgba(255,255,255,0.10))] shadow-[0_0_30px_rgba(163,230,53,0.22)]",
    markClass: "text-lime-200 drop-shadow-[0_0_12px_rgba(190,242,100,0.96)]",
  },
  {
    id: "65",
    title: "Hyper Violet Bloom",
    note: "GOAT-würdig. Voller Fokus auf violette Strahlkraft.",
    shellClass:
      "border-violet-400 bg-black shadow-[0_0_34px_rgba(168,85,247,0.28)]",
    markClass: "text-fuchsia-100 drop-shadow-[0_0_14px_rgba(168,85,247,0.98)]",
    ring: true,
  },
];

const lavaPlasmaGlitch: Concept[] = [
  {
    id: "28",
    title: "Lava Core",
    note: "Glühendes Orange-Rot. Heiß und aggressiv.",
    shellClass:
      "border-orange-500 bg-[linear-gradient(180deg,rgba(127,29,29,1),rgba(194,65,12,0.96),rgba(251,146,60,0.84))] shadow-[0_0_30px_rgba(249,115,22,0.22)]",
    markClass: "text-orange-100 drop-shadow-[0_0_12px_rgba(251,146,60,0.88)]",
  },
  {
    id: "29",
    title: "Magma Gold",
    note: "Gold, aber wie geschmolzen.",
    shellClass:
      "border-yellow-400 bg-[linear-gradient(180deg,rgba(120,53,15,1),rgba(245,158,11,0.92))] shadow-[0_0_30px_rgba(250,204,21,0.20)]",
    markClass: "text-yellow-100 drop-shadow-[0_0_14px_rgba(250,204,21,0.92)]",
  },
  {
    id: "30",
    title: "Plasma Violet",
    note: "Zwischen Magie, Tech und Legendary.",
    shellClass:
      "border-violet-400 bg-[linear-gradient(180deg,rgba(76,29,149,1),rgba(147,51,234,0.92))] shadow-[0_0_30px_rgba(168,85,247,0.22)]",
    markClass: "text-fuchsia-100 drop-shadow-[0_0_12px_rgba(217,70,239,0.84)]",
  },
  {
    id: "31",
    title: "Storm Cyan",
    note: "Wie elektrischer Himmel.",
    shellClass:
      "border-cyan-400 bg-[linear-gradient(180deg,rgba(8,47,73,1),rgba(14,116,144,0.96),rgba(34,211,238,0.72))] shadow-[0_0_28px_rgba(34,211,238,0.20)]",
    markClass: "text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.88)]",
  },
  {
    id: "32",
    title: "Aurora Borealis",
    note: "Cyan-violet-lime Mischung. Sehr besonders.",
    shellClass:
      "border-teal-200 bg-[linear-gradient(135deg,rgba(34,211,238,0.30),rgba(168,85,247,0.28),rgba(163,230,53,0.24))] shadow-[0_0_30px_rgba(34,211,238,0.14)]",
    markClass: "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.86)]",
  },
  {
    id: "33",
    title: "Glitch Pink",
    note: "Fast digital kaputt. Sehr social / youth.",
    shellClass:
      "border-pink-300 bg-[linear-gradient(135deg,rgba(17,24,39,1),rgba(236,72,153,0.68),rgba(17,24,39,1))] shadow-[0_0_30px_rgba(236,72,153,0.18)]",
    markClass: "text-pink-200 drop-shadow-[0_0_12px_rgba(236,72,153,0.90)]",
    double: true,
  },
  {
    id: "34",
    title: "Glitch Cyan",
    note: "Fast esports HUD.",
    shellClass:
      "border-cyan-300 bg-[linear-gradient(135deg,rgba(17,24,39,1),rgba(34,211,238,0.64),rgba(17,24,39,1))] shadow-[0_0_30px_rgba(34,211,238,0.18)]",
    markClass: "text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.92)]",
    double: true,
  },
  {
    id: "35",
    title: "Glitch Rainbow",
    note: "Komplett eskaliert. Sehr erinnerbar.",
    shellClass:
      "border-fuchsia-300 bg-[linear-gradient(135deg,rgba(17,24,39,1),rgba(251,191,36,0.60),rgba(244,114,182,0.60),rgba(129,140,248,0.60),rgba(17,24,39,1))] shadow-[0_0_30px_rgba(244,114,182,0.20)]",
    markClass: "text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.90)]",
    double: true,
  },
  {
    id: "66",
    title: "White Plasma",
    note: "Wie überladene Energie. Fast zu heiß zum Anfassen.",
    shellClass:
      "border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(186,230,253,0.86),rgba(217,70,239,0.28))] shadow-[0_0_30px_rgba(255,255,255,0.16)]",
    markClass: "text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.98)]",
    ring: true,
  },
  {
    id: "67",
    title: "Solar Flare",
    note: "Wie Sonne, Hitze und Trophy-Overload zusammen.",
    shellClass:
      "border-amber-300 bg-[linear-gradient(180deg,rgba(120,53,15,1),rgba(245,158,11,0.98),rgba(254,240,138,0.78))] shadow-[0_0_32px_rgba(245,158,11,0.24)]",
    markClass: "text-yellow-50 drop-shadow-[0_0_14px_rgba(250,204,21,0.98)]",
    ring: true,
  },
  {
    id: "68",
    title: "Electric Storm Purple",
    note: "Noch unruhiger, noch härter, noch mehr Legendary.",
    shellClass:
      "border-violet-400 bg-[linear-gradient(180deg,rgba(2,6,23,1),rgba(76,29,149,0.98),rgba(34,211,238,0.34))] shadow-[0_0_32px_rgba(139,92,246,0.22)]",
    markClass: "text-violet-100 drop-shadow-[0_0_14px_rgba(196,181,253,0.98)]",
    double: true,
  },
  {
    id: "69",
    title: "Glitch Whiteout",
    note: "Esports HUD trifft Luxusbrand. Sehr stark.",
    shellClass:
      "border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(226,232,240,0.90),rgba(34,211,238,0.26),rgba(255,255,255,0.98))] shadow-[0_0_30px_rgba(148,163,184,0.16)]",
    markClass: "text-slate-900 drop-shadow-[0_0_10px_rgba(255,255,255,0.88)]",
    double: true,
    ring: true,
  },
  {
    id: "70",
    title: "Plasma Rainbow Core",
    note: "Wenn GOAT wirklich komplett ausflippen darf.",
    shellClass:
      "border-fuchsia-200 bg-[linear-gradient(135deg,rgba(3,7,18,1),rgba(251,191,36,0.66),rgba(244,114,182,0.64),rgba(129,140,248,0.62),rgba(34,211,238,0.62))] shadow-[0_0_34px_rgba(236,72,153,0.22)]",
    markClass: "text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.96)]",
    ring: true,
  },
];

const floatingAndDouble: Concept[] = [
  {
    id: "36",
    title: "Floating / gold",
    note: "Kein Body, nur Mark + Glow.",
    markClass: "text-yellow-500 drop-shadow-[0_0_12px_rgba(250,204,21,0.62)]",
    floating: true,
    backdropClass: "bg-[linear-gradient(180deg,#fafafa,#f3f4f6)]",
  },
  {
    id: "37",
    title: "Floating / cyan",
    note: "Ultra modern und leicht.",
    markClass: "text-cyan-500 drop-shadow-[0_0_12px_rgba(34,211,238,0.68)]",
    floating: true,
    backdropClass: "bg-[linear-gradient(180deg,#fafafa,#f3f4f6)]",
  },
  {
    id: "38",
    title: "Floating / rainbow",
    note: "Editorial, fashion, social share vibe.",
    markClass: "text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.84)]",
    floating: true,
    backdropClass:
      "bg-[linear-gradient(135deg,rgba(251,191,36,0.14),rgba(244,114,182,0.14),rgba(129,140,248,0.14),rgba(34,211,238,0.14))]",
    ring: true,
  },
  {
    id: "39",
    title: "Floating Double Cyan",
    note: "Glow hinten, mark vorne. Sehr stark.",
    markClass: "text-cyan-500 drop-shadow-[0_0_12px_rgba(34,211,238,0.68)]",
    floating: true,
    double: true,
    backdropClass: "bg-[linear-gradient(180deg,#fafafa,#f3f4f6)]",
  },
  {
    id: "40",
    title: "Double / gold",
    note: "Hinten weich, vorne sharp.",
    shellClass:
      "border-yellow-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(254,240,138,0.78))] shadow-[0_0_22px_rgba(250,204,21,0.16)]",
    markClass: "text-yellow-700",
    double: true,
  },
  {
    id: "41",
    title: "Double / cyan",
    note: "Sehr modern. Perfekt für GOAT möglich.",
    shellClass:
      "border-cyan-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(186,230,253,0.78))] shadow-[0_0_22px_rgba(34,211,238,0.16)]",
    markClass: "text-cyan-700",
    double: true,
  },
  {
    id: "42",
    title: "Double / violet night",
    note: "Luxusiger legendary look.",
    shellClass:
      "border-violet-800 bg-[linear-gradient(180deg,rgba(15,23,42,1),rgba(76,29,149,0.98))] shadow-[0_0_24px_rgba(139,92,246,0.18)]",
    markClass: "text-violet-200 drop-shadow-[0_0_8px_rgba(196,181,253,0.36)]",
    double: true,
  },
  {
    id: "43",
    title: "Double / rainbow",
    note: "Komplett überzeichnet, aber memorable.",
    shellClass:
      "border-fuchsia-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(254,205,211,0.84),rgba(196,181,253,0.76),rgba(103,232,249,0.72))] shadow-[0_0_24px_rgba(236,72,153,0.14)]",
    markClass: "text-fuchsia-700 drop-shadow-[0_0_8px_rgba(217,70,239,0.34)]",
    double: true,
  },
  {
    id: "44",
    title: "Double Gold Luxe",
    note: "Luxusige high-tier Trophy-Richtung.",
    shellClass:
      "border-yellow-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(254,240,138,0.78))] shadow-[0_0_26px_rgba(250,204,21,0.18)]",
    markClass: "text-yellow-700 drop-shadow-[0_0_10px_rgba(250,204,21,0.48)]",
    double: true,
    ring: true,
  },
  {
    id: "45",
    title: "Double Cyan Luxe",
    note: "Sehr teuer, sehr clean, sehr modern.",
    shellClass:
      "border-cyan-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(186,230,253,0.78))] shadow-[0_0_26px_rgba(34,211,238,0.18)]",
    markClass: "text-cyan-700 drop-shadow-[0_0_10px_rgba(34,211,238,0.48)]",
    double: true,
    ring: true,
  },
  {
    id: "46",
    title: "Double Violet Night Luxe",
    note: "Legendary luxury mode.",
    shellClass:
      "border-violet-800 bg-[linear-gradient(180deg,rgba(15,23,42,1),rgba(76,29,149,0.98))] shadow-[0_0_28px_rgba(139,92,246,0.18)]",
    markClass: "text-violet-200 drop-shadow-[0_0_10px_rgba(196,181,253,0.38)]",
    double: true,
  },
  {
    id: "71",
    title: "Floating / neon violet ring",
    note: "Nur Energie, nur Aura, null Ballast.",
    markClass: "text-violet-400 drop-shadow-[0_0_14px_rgba(167,139,250,0.94)]",
    floating: true,
    ring: true,
    backdropClass:
      "bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(30,27,75,0.72))]",
  },
  {
    id: "72",
    title: "Floating / white hot",
    note: "Extrem clean, fast wie überbelichtete Energie.",
    markClass: "text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.98)]",
    floating: true,
    ring: true,
    backdropClass:
      "bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(224,231,255,0.78))]",
  },
  {
    id: "73",
    title: "Double / storm cyan ring",
    note: "High-end Tech-Look mit viel Bewegung.",
    shellClass:
      "border-cyan-200 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(186,230,253,0.76),rgba(34,211,238,0.22))] shadow-[0_0_28px_rgba(34,211,238,0.18)]",
    markClass: "text-cyan-800 drop-shadow-[0_0_12px_rgba(34,211,238,0.54)]",
    double: true,
    ring: true,
  },
  {
    id: "74",
    title: "Double / black neon cyan",
    note: "Dunkel, brutal, sportlich. Sehr STRIKR.",
    shellClass:
      "border-cyan-500/50 bg-black shadow-[0_0_30px_rgba(34,211,238,0.22)]",
    markClass: "text-cyan-300 drop-shadow-[0_0_14px_rgba(34,211,238,0.98)]",
    double: true,
    ring: true,
  },
  {
    id: "75",
    title: "Floating / aurora luxe",
    note: "Edgy, elegant, sehr sharebar.",
    markClass: "text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.94)]",
    floating: true,
    ring: true,
    backdropClass:
      "bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(168,85,247,0.20),rgba(163,230,53,0.18))]",
  },
];

const fanAndGoatEmoji: Concept[] = [
  {
    id: "47",
    title: "Germany Fan Edition",
    note: "Schwarz-Rot-Gold. WM-Modus.",
    shellClass:
      "border-yellow-300 bg-[linear-gradient(180deg,rgba(10,10,10,1),rgba(127,29,29,0.96),rgba(245,158,11,0.82))] shadow-[0_0_26px_rgba(245,158,11,0.18)]",
    markClass: "text-yellow-100 drop-shadow-[0_0_12px_rgba(250,204,21,0.80)]",
  },
  {
    id: "48",
    title: "Germany Floating",
    note: "Fan-Edition ohne Body.",
    markClass: "text-yellow-200 drop-shadow-[0_0_12px_rgba(250,204,21,0.72)]",
    floating: true,
    backdropClass:
      "bg-[linear-gradient(180deg,rgba(23,23,23,0.96),rgba(127,29,29,0.52),rgba(245,158,11,0.40))]",
  },
  {
    id: "49",
    title: "Goat Emoji / gold",
    note: "Direkt die Ziege statt Mark.",
    shellClass:
      "border-yellow-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(254,240,138,0.78))] shadow-[0_0_24px_rgba(250,204,21,0.18)]",
    goatOnly: true,
    goatClass:
      "drop-shadow-[0_0_10px_rgba(250,204,21,0.55)] saturate-125",
  },
  {
    id: "50",
    title: "Goat Emoji / neon cyan",
    note: "Ziege im Neon-Tech-Modus.",
    shellClass:
      "border-cyan-300 bg-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.22)]",
    goatOnly: true,
    goatClass:
      "drop-shadow-[0_0_12px_rgba(34,211,238,0.75)] saturate-150",
  },
  {
    id: "51",
    title: "Goat Emoji / floating",
    note: "Ziege pur, null Body.",
    floating: true,
    goatOnly: true,
    goatClass:
      "drop-shadow-[0_0_10px_rgba(250,204,21,0.45)] saturate-125",
    backdropClass: "bg-[linear-gradient(180deg,#fafafa,#f3f4f6)]",
  },
  {
    id: "52",
    title: "Goat Emoji / rainbow",
    note: "Komplett maximal over the top.",
    shellClass:
      "border-fuchsia-300 bg-[linear-gradient(135deg,rgba(251,191,36,0.84),rgba(244,114,182,0.82),rgba(129,140,248,0.82),rgba(34,211,238,0.82))] shadow-[0_0_30px_rgba(236,72,153,0.20)]",
    goatOnly: true,
    goatClass:
      "drop-shadow-[0_0_14px_rgba(255,255,255,0.55)] saturate-150",
  },
  {
    id: "53",
    title: "Goat Emoji / violet legendary",
    note: "Ziege, aber wirklich special.",
    shellClass:
      "border-violet-400 bg-slate-950 shadow-[0_0_28px_rgba(139,92,246,0.24)]",
    goatOnly: true,
    goatClass:
      "drop-shadow-[0_0_14px_rgba(168,85,247,0.70)] saturate-150",
  },
  {
    id: "54",
    title: "Goat Emoji / black neon bloom",
    note: "Ziege auf maximaler dunkler Bühne.",
    shellClass:
      "border-slate-800 bg-black shadow-[0_0_30px_rgba(59,130,246,0.12),0_10px_24px_rgba(0,0,0,0.30)]",
    goatOnly: true,
    goatClass:
      "drop-shadow-[0_0_14px_rgba(34,211,238,0.80)] saturate-150",
  },
  {
    id: "55",
    title: "Goat Emoji / germany gold",
    note: "Fan-Edition mit Ziege.",
    shellClass:
      "border-yellow-300 bg-[linear-gradient(180deg,rgba(10,10,10,1),rgba(127,29,29,0.96),rgba(245,158,11,0.82))] shadow-[0_0_26px_rgba(245,158,11,0.18)]",
    goatOnly: true,
    goatClass:
      "drop-shadow-[0_0_12px_rgba(250,204,21,0.72)] saturate-135",
  },
  {
    id: "76",
    title: "Goat Emoji / cyan inferno",
    note: "Jetzt wirklich glowig. Dunkle Bühne, kaltes Feuer, brutal stark.",
    shellClass:
      "border-cyan-300 bg-[linear-gradient(180deg,rgba(2,6,23,1),rgba(8,47,73,1),rgba(34,211,238,0.16))] shadow-[0_0_34px_rgba(34,211,238,0.26)]",
    goatOnly: true,
    goatClass:
      "text-cyan-300 drop-shadow-[0_0_16px_rgba(34,211,238,0.98)] saturate-[1.8] brightness-125",
    ring: true,
  },
  {
    id: "77",
    title: "Goat Emoji / violet plasma",
    note: "Legendary Goat. Viel mehr Sci-Fi, viel mehr Boss-Level.",
    shellClass:
      "border-violet-400 bg-[linear-gradient(180deg,rgba(2,6,23,1),rgba(76,29,149,0.98),rgba(168,85,247,0.18))] shadow-[0_0_34px_rgba(139,92,246,0.28)]",
    goatOnly: true,
    goatClass:
      "text-fuchsia-200 drop-shadow-[0_0_16px_rgba(168,85,247,0.98)] saturate-[1.9] brightness-125",
    ring: true,
  },
  {
    id: "78",
    title: "Goat Emoji / acid lime",
    note: "Toxic, komplett anders und maximal erinnerbar.",
    shellClass:
      "border-lime-300 bg-[linear-gradient(180deg,rgba(3,7,18,1),rgba(77,124,15,0.96),rgba(163,230,53,0.14))] shadow-[0_0_34px_rgba(163,230,53,0.24)]",
    goatOnly: true,
    goatClass:
      "text-lime-300 drop-shadow-[0_0_16px_rgba(190,242,100,0.98)] saturate-[2] brightness-125",
    ring: true,
  },
  {
    id: "79",
    title: "Goat Emoji / white-hot",
    note: "Fast heilig, fast überbelichtet, komplett Premium-Absurd.",
    shellClass:
      "border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(226,232,240,0.22),rgba(2,6,23,1))] shadow-[0_0_34px_rgba(255,255,255,0.18)]",
    goatOnly: true,
    goatClass:
      "text-white drop-shadow-[0_0_18px_rgba(255,255,255,1)] saturate-0 brightness-125",
    ring: true,
  },
  {
    id: "80",
    title: "Goat Emoji / prismatic ghost",
    note: "Ghost-Ziege mit irisierender Bühne. Sehr fashion, sehr editoral.",
    shellClass:
      "border-fuchsia-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(224,231,255,0.86),rgba(207,250,254,0.78),rgba(254,205,211,0.76))] shadow-[0_0_34px_rgba(148,163,184,0.18)]",
    goatOnly: true,
    goatClass:
      "text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.98)] saturate-0 brightness-125",
    ring: true,
  },
  {
    id: "81",
    title: "Goat Emoji / black rainbow shock",
    note: "Dunkles Legendary-Event-Badge mit maximalem Kontrast.",
    shellClass:
      "border-fuchsia-300 bg-[linear-gradient(135deg,rgba(2,6,23,1),rgba(251,191,36,0.30),rgba(244,114,182,0.34),rgba(129,140,248,0.34),rgba(34,211,238,0.34),rgba(2,6,23,1))] shadow-[0_0_36px_rgba(236,72,153,0.22)]",
    goatOnly: true,
    goatClass:
      "text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.96)] saturate-[2] brightness-125",
    ring: true,
  },
  {
    id: "82",
    title: "Goat Emoji / germany ultra fan",
    note: "Schwarz-Rot-Gold, aber mit echter Stadion-Legenden-Aura.",
    shellClass:
      "border-yellow-300 bg-[linear-gradient(180deg,rgba(10,10,10,1),rgba(127,29,29,1),rgba(245,158,11,0.88))] shadow-[0_0_34px_rgba(245,158,11,0.24)]",
    goatOnly: true,
    goatClass:
      "text-yellow-100 drop-shadow-[0_0_16px_rgba(250,204,21,0.98)] saturate-[1.8] brightness-125",
    ring: true,
  },
  {
    id: "83",
    title: "Goat Emoji / floating cyan godmode",
    note: "Null Body, nur Ziege und Glow. Überraschend stark.",
    floating: true,
    goatOnly: true,
    goatClass:
      "text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,1)] saturate-[2] brightness-125",
    backdropClass:
      "bg-[linear-gradient(180deg,rgba(2,6,23,1),rgba(8,47,73,0.84),rgba(34,211,238,0.12))]",
    ring: true,
  },
  {
    id: "84",
    title: "Goat Emoji / floating violet oracle",
    note: "Mystisch, special, kompletter Endgegner-Vibe.",
    floating: true,
    goatOnly: true,
    goatClass:
      "text-fuchsia-200 drop-shadow-[0_0_18px_rgba(168,85,247,1)] saturate-[2] brightness-125",
    backdropClass:
      "bg-[linear-gradient(180deg,rgba(2,6,23,1),rgba(46,16,101,0.86),rgba(168,85,247,0.12))]",
    ring: true,
  },
  {
    id: "85",
    title: "Goat Emoji / molten gold beast",
    note: "Nicht süß, sondern trophy-monster. Sehr finalwürdig.",
    shellClass:
      "border-yellow-300 bg-[linear-gradient(180deg,rgba(23,23,23,1),rgba(120,53,15,1),rgba(250,204,21,0.72))] shadow-[0_0_36px_rgba(250,204,21,0.24)]",
    goatOnly: true,
    goatClass:
      "text-yellow-100 drop-shadow-[0_0_18px_rgba(250,204,21,1)] saturate-[1.7] brightness-125",
    ring: true,
  },
];

const eventEditions: Concept[] = [
  {
    id: "86",
    title: "Event / midnight frost",
    note: "Seasonal Night Event. Eiskalt und elitär.",
    shellClass:
      "border-cyan-200 bg-[linear-gradient(180deg,rgba(2,6,23,1),rgba(15,23,42,1),rgba(186,230,253,0.18))] shadow-[0_0_32px_rgba(34,211,238,0.18)]",
    markClass: "text-cyan-100 drop-shadow-[0_0_14px_rgba(34,211,238,0.98)]",
    ring: true,
  },
  {
    id: "87",
    title: "Event / summer flare",
    note: "Sommerturnier. Heiß, hell, extrovertiert.",
    shellClass:
      "border-orange-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(253,186,116,0.84),rgba(251,146,60,0.78))] shadow-[0_0_32px_rgba(249,115,22,0.18)]",
    markClass: "text-orange-700 drop-shadow-[0_0_10px_rgba(251,146,60,0.80)]",
    ring: true,
  },
  {
    id: "88",
    title: "Event / blackout elite",
    note: "Edgy, reduziert, brutal modern. Sehr STRIKR-kompatibel.",
    shellClass:
      "border-white/10 bg-black shadow-[0_0_30px_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.30)]",
    markClass: "text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.88)]",
    ring: true,
  },
  {
    id: "89",
    title: "Event / aurora tournament",
    note: "Turnier-Sonderedition. Hochwertig und krass genug für Highlights.",
    shellClass:
      "border-teal-200 bg-[linear-gradient(135deg,rgba(2,6,23,1),rgba(34,211,238,0.30),rgba(168,85,247,0.28),rgba(163,230,53,0.18))] shadow-[0_0_34px_rgba(34,211,238,0.16)]",
    markClass: "text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.94)]",
    ring: true,
  },
  {
    id: "90",
    title: "Event / trophy hologlass",
    note: "Sehr premium. Fast eher luxury collectible als normales Badge.",
    shellClass:
      "border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(224,242,254,0.86),rgba(221,214,254,0.78),rgba(254,205,211,0.76))] shadow-[0_0_34px_rgba(148,163,184,0.16)]",
    markClass: "text-slate-950 drop-shadow-[0_0_10px_rgba(255,255,255,0.60)]",
    ring: true,
    double: true,
  },
];

const goatUltra: Concept[] = [
  {
    id: "91",
    title: "GOAT / black prismatic crown",
    note: "Mein Favorit für ein Standard-GOAT. Dunkle Bühne, weiß-heißes Mark, prismatic shock am Rand.",
    shellClass:
      "border-fuchsia-200 bg-[linear-gradient(135deg,rgba(2,6,23,1),rgba(34,211,238,0.20),rgba(168,85,247,0.22),rgba(244,114,182,0.20),rgba(2,6,23,1))] shadow-[0_0_40px_rgba(236,72,153,0.18),0_10px_24px_rgba(0,0,0,0.30)]",
    markClass: "text-white drop-shadow-[0_0_18px_rgba(255,255,255,1)]",
    double: true,
    ring: true,
  },
  {
    id: "92",
    title: "GOAT / white-hot relic",
    note: "Fast überbelichtet. Fühlt sich selten und fast verboten stark an.",
    shellClass:
      "border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(224,231,255,0.88),rgba(34,211,238,0.22),rgba(2,6,23,1))] shadow-[0_0_42px_rgba(255,255,255,0.20)]",
    markClass: "text-white drop-shadow-[0_0_20px_rgba(255,255,255,1)]",
    ring: true,
    double: true,
  },
  {
    id: "93",
    title: "GOAT / void cyan singularity",
    note: "Ultra sport-tech. Schwarz + cyan, aber deutlich seltener als normales Neon.",
    shellClass:
      "border-cyan-300 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.10),rgba(2,6,23,1)_58%)] shadow-[0_0_42px_rgba(34,211,238,0.24),0_10px_24px_rgba(0,0,0,0.30)]",
    markClass: "text-cyan-200 drop-shadow-[0_0_18px_rgba(34,211,238,1)]",
    ring: true,
    double: true,
  },
  {
    id: "94",
    title: "GOAT / violet mythic core",
    note: "Legendary, mystisch, luxuriös. Mehr Bossfight als normales Badge.",
    shellClass:
      "border-violet-300 bg-[radial-gradient(circle_at_50%_45%,rgba(168,85,247,0.12),rgba(2,6,23,1)_60%),linear-gradient(180deg,rgba(2,6,23,1),rgba(76,29,149,0.86))] shadow-[0_0_40px_rgba(168,85,247,0.24)]",
    markClass: "text-fuchsia-100 drop-shadow-[0_0_18px_rgba(168,85,247,1)]",
    ring: true,
    double: true,
  },
  {
    id: "95",
    title: "GOAT / rainbow apocalypse",
    note: "Wenn GOAT komplett ausrasten darf. Extrem shareable, extrem anders.",
    shellClass:
      "border-fuchsia-200 bg-[linear-gradient(135deg,rgba(2,6,23,1),rgba(251,191,36,0.48),rgba(244,114,182,0.52),rgba(129,140,248,0.50),rgba(34,211,238,0.50),rgba(2,6,23,1))] shadow-[0_0_44px_rgba(236,72,153,0.24)]",
    markClass: "text-white drop-shadow-[0_0_20px_rgba(255,255,255,1)]",
    ring: true,
    double: true,
  },
  {
    id: "96",
    title: "GOAT / molten gold final boss",
    note: "Falls GOAT näher an Trophy bleiben soll: Gold auf Monster-Level.",
    shellClass:
      "border-yellow-300 bg-[linear-gradient(180deg,rgba(23,23,23,1),rgba(120,53,15,1),rgba(250,204,21,0.84))] shadow-[0_0_42px_rgba(250,204,21,0.26)]",
    markClass: "text-yellow-50 drop-shadow-[0_0_18px_rgba(250,204,21,1)]",
    ring: true,
    double: true,
  },
  {
    id: "97",
    title: "GOAT / floating godmode mark",
    note: "Kein Body. Nur Aura, Ring und pure Endgame-Energie.",
    markClass: "text-white drop-shadow-[0_0_20px_rgba(255,255,255,1)]",
    floating: true,
    double: true,
    ring: true,
    backdropClass:
      "bg-[linear-gradient(135deg,rgba(2,6,23,1),rgba(34,211,238,0.18),rgba(168,85,247,0.18),rgba(244,114,182,0.16))]",
  },
  {
    id: "98",
    title: "GOAT / emoji black prismatic beast",
    note: "Beste Goat-Emoji-Finalform. Wenn die Ziege wirklich als Sonder-GOAT bleiben soll.",
    shellClass:
      "border-fuchsia-200 bg-[linear-gradient(135deg,rgba(2,6,23,1),rgba(34,211,238,0.20),rgba(168,85,247,0.22),rgba(244,114,182,0.20),rgba(2,6,23,1))] shadow-[0_0_42px_rgba(236,72,153,0.22)]",
    goatOnly: true,
    goatClass:
      "text-white drop-shadow-[0_0_20px_rgba(255,255,255,1)] saturate-[2] brightness-125",
    ring: true,
  },
  {
    id: "99",
    title: "GOAT / emoji cyan ghost beast",
    note: "Die Ziege bekommt kalten Cyan-Geist-Vibe über Filter, Glow und dunkle Bühne.",
    shellClass:
      "border-cyan-200 bg-[linear-gradient(135deg,rgba(2,6,23,1),rgba(8,47,73,1),rgba(34,211,238,0.20),rgba(2,6,23,1))] shadow-[0_0_44px_rgba(34,211,238,0.24)]",
    goatOnly: true,
    goatClass:
      "drop-shadow-[0_0_20px_rgba(34,211,238,1)] saturate-[2.4] brightness-[1.28] contrast-[1.18] hue-rotate-[150deg]",
    ring: true,
  },
  {
    id: "100",
    title: "GOAT / emoji violet spectral king",
    note: "Mehr mystisch, mehr legendary. Violetter Hallenlicht-Endgegner.",
    shellClass:
      "border-violet-200 bg-[linear-gradient(135deg,rgba(2,6,23,1),rgba(46,16,101,0.98),rgba(168,85,247,0.18),rgba(2,6,23,1))] shadow-[0_0_46px_rgba(168,85,247,0.24)]",
    goatOnly: true,
    goatClass:
      "drop-shadow-[0_0_20px_rgba(168,85,247,1)] saturate-[2.35] brightness-[1.28] contrast-[1.16] hue-rotate-[235deg]",
    ring: true,
  },
  {
    id: "101",
    title: "GOAT / emoji toxic relic",
    note: "Komplett falsch im besten Sinne. Unfassbar special und ultra merkbar.",
    shellClass:
      "border-lime-200 bg-[linear-gradient(135deg,rgba(3,7,18,1),rgba(77,124,15,0.94),rgba(163,230,53,0.20),rgba(3,7,18,1))] shadow-[0_0_46px_rgba(163,230,53,0.24)]",
    goatOnly: true,
    goatClass:
      "drop-shadow-[0_0_20px_rgba(190,242,100,1)] saturate-[2.5] brightness-[1.3] contrast-[1.2] hue-rotate-[70deg]",
    ring: true,
  },
  {
    id: "102",
    title: "GOAT / emoji white-supernova",
    note: "Fast komplett entmaterialisiert. Nur Licht, Aura und Endgame-Rarity.",
    shellClass:
      "border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(224,231,255,0.18),rgba(2,6,23,1))] shadow-[0_0_48px_rgba(255,255,255,0.22)]",
    goatOnly: true,
    goatClass:
      "drop-shadow-[0_0_22px_rgba(255,255,255,1)] saturate-0 brightness-[1.34] contrast-[1.18]",
    ring: true,
  },
  {
    id: "103",
    title: "GOAT / emoji black rainbow overdrive",
    note: "Noch krasser als 98. Mehr Party, mehr Prismatic, mehr 'holy shit'.",
    shellClass:
      "border-fuchsia-200 bg-[linear-gradient(135deg,rgba(2,6,23,1),rgba(251,191,36,0.36),rgba(244,114,182,0.40),rgba(129,140,248,0.38),rgba(34,211,238,0.38),rgba(2,6,23,1))] shadow-[0_0_48px_rgba(236,72,153,0.24)]",
    goatOnly: true,
    goatClass:
      "drop-shadow-[0_0_22px_rgba(255,255,255,1)] saturate-[2.45] brightness-[1.3] contrast-[1.18]",
    ring: true,
  },
  {
    id: "104",
    title: "GOAT / emoji molten gold relic",
    note: "Wenn die Ziege Richtung ultimative Trophy mutieren soll.",
    shellClass:
      "border-yellow-200 bg-[linear-gradient(180deg,rgba(23,23,23,1),rgba(120,53,15,1),rgba(250,204,21,0.84))] shadow-[0_0_46px_rgba(250,204,21,0.26)]",
    goatOnly: true,
    goatClass:
      "drop-shadow-[0_0_22px_rgba(250,204,21,1)] saturate-[2.15] brightness-[1.26] contrast-[1.14] sepia-[0.2]",
    ring: true,
  },
];

export default function Page() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 pb-24">
      <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
          STRIKR Badge Lab – merged chaos
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Jetzt zusammengeführt statt überschrieben: alte gute Vorschläge bleiben
          drin, neue Neon-/Rainbow-/GOAT-Ideen kommen zusätzlich dazu.
          Blech ist wieder dabei, Goat-Emoji glowt jetzt auch.
        </p>
      </div>

      <CategorySection
        title="1. Metall, Dreck, Bronze, Silber, Gold"
        description="Die bodigeren und progressionsstarken Richtungen."
        concepts={metalAndDirty}
      />

      <CategorySection
        title="2. Neon, Hyper, Holo, Chrome"
        description="Die modernen, schnellen, lauten und sehr stylischen Richtungen."
        concepts={neonAndHyper}
      />

      <CategorySection
        title="3. Lava, Plasma, Glitch"
        description="Komplett eskalierte High-Energy-Varianten."
        concepts={lavaPlasmaGlitch}
      />

      <CategorySection
        title="4. Floating & Double"
        description="Ultraleicht oder luxuriös layered."
        concepts={floatingAndDouble}
      />

      <CategorySection
        title="5. Fan-Edition & Goat-Emoji"
        description="Sondervarianten, Events und komplette GOAT-Eskalation."
        concepts={fanAndGoatEmoji}
      />

      <CategorySection
        title="6. Event Editions / Seasonal / Tournament"
        description="Sondereditionen für WM, Turniere, Seasons, Kampagnen und limitierte Drops."
        concepts={eventEditions}
      />

      <CategorySection
        title="7. GOAT ULTRA / FINAL FORM"
        description="Nicht einfach Gold+, sondern eigene Klasse: mythic, legendary, endgame."
        concepts={goatUltra}
      />

      <section className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6">
        <h2 className="text-lg font-bold text-slate-950">Wie wir jetzt finalisieren</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Dein Set steht fast:
          <strong> 57, 58, 26, 67</strong>.
          Für GOAT teste jetzt vor allem:
          <strong> 98, 99, 100, 103, 104</strong>.
          Wenn du maximale Eskalation willst, ist
          <strong> 103</strong> aktuell der wildeste Goat-Emoji-Ansatz.
        </p>
      </section>
    </main>
  );
}