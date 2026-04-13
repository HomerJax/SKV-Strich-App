"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Scenario = {
  id: string;
  clubName: string;
  clubColor: string;
  dateLabel: string;
  score: string;
  winnerLabel: string;
  loserLabel: string;
  goalsWinner: number;
  goalsLoser: number;
  winnerStrength: number;
  loserStrength: number;
  winnerWasShorthanded: boolean;
  upsetWin: boolean;
  dramaticFinish: boolean;
  winnerPhotoUrl?: string | null;
};

type VariantDefinition = {
  key: string;
  category: string;
  title: string;
  note: string;
  render: (scenario: Scenario) => React.ReactNode;
};

type VoteState = "like" | "dislike";

const SCENARIOS: Scenario[] = [
  {
    id: "tsv-underdog",
    clubName: "TSV Münchingen Ü32",
    clubColor: "#1d4ed8",
    dateLabel: "Do, 09. April 2026",
    score: "6:4",
    winnerLabel: "Team Blau",
    loserLabel: "Team Weiß",
    goalsWinner: 6,
    goalsLoser: 4,
    winnerStrength: 72,
    loserStrength: 77,
    winnerWasShorthanded: true,
    upsetWin: true,
    dramaticFinish: true,
    winnerPhotoUrl: "/dev/mock-winner-story.png",
  },
  {
    id: "skv-dominant",
    clubName: "SKV Rutesheim AH",
    clubColor: "#dc2626",
    dateLabel: "Di, 14. April 2026",
    score: "8:2",
    winnerLabel: "Team Rot",
    loserLabel: "Team Schwarz",
    goalsWinner: 8,
    goalsLoser: 2,
    winnerStrength: 84,
    loserStrength: 71,
    winnerWasShorthanded: false,
    upsetWin: false,
    dramaticFinish: false,
    winnerPhotoUrl: "/dev/mock-winner-story.png",
  },
];

type IdeaCategory = {
  title: string;
  items: string[];
};

const IDEA_CATEGORIES: IdeaCategory[] = [
  {
    title: "Weitere Frame / Poster Ideen",
    items: [
      "Polaroid-Edition mit handschriftlicher Note",
      "Poster mit dickem schwarzem Holzrahmen-Look",
      "Floating Poster mit Schatten und leichter Drehung",
      "Doppelrahmen mit Clubfarbe innen",
      "Off-White Fine Art Print",
      "Poster mit riesiger Typo und kleinem Bildfenster",
    ],
  },
  {
    title: "Sticker / Tape / Street Ideen",
    items: [
      "Mehrere kleine Result-Sticker gleichzeitig",
      "Score wie Stempel auf Foto",
      "Tape in Vereinsfarbe statt transparent",
      "Abgerissene Papierkante / ripped paper",
      "Graffiti-Edge nur als Akzent",
      "Marker- oder Kuli-Scribble-Notizen",
    ],
  },
  {
    title: "Editorial / Art Direction Ideen",
    items: [
      "Newspaper Cut in Schwarz-Weiß oder entsättigt",
      "Magazine Cover mit Ausgabe / Issue Number",
      "Quiet Luxury in fast monochrom",
      "Große vertikale Typo am Rand",
      "Foto asymmetrisch extrem gecroppt",
      "Hero-Line wie Titelgeschichte",
    ],
  },
  {
    title: "Neue Familien",
    items: [
      "Victory Badge / Award-Moment",
      "Match Ticket / Event-Pass",
      "Locker Room / Taktiktafel / Kabinenwand",
      "Night Floodlight / Flutlicht / Kino",
      "Fashion Sports Editorial / Magazin / High-end Sportstyle",
    ],
  },
  {
    title: "Produktideen",
    items: [
      "Zufällige Style-Auswahl aus 3 kuratierten Story-Layouts",
      "KI-Headline auf Basis von Unterzahl, Upset, Dominanz, Drama",
      "Spezial-Theme für Kantersiege",
      "Spezial-Theme für Last-Minute-Siege",
      "Clubfarbe subtil je Team mitdenken",
      "MVP als Panini-Sticker-Format",
    ],
  },
];

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

function headline(input: Scenario) {
  if (input.winnerWasShorthanded && input.upsetWin) {
    return "In Unterzahl gewonnen.";
  }
  if (input.upsetWin) {
    return "Auf dem Papier schwächer.";
  }
  if (input.dramaticFinish) {
    return "Spät entschieden.";
  }
  if (input.goalsWinner >= 7) {
    return "Heute geliefert.";
  }
  return "Abend zugemacht.";
}

function subline(input: Scenario) {
  if (input.winnerWasShorthanded && input.upsetWin) {
    return "Trotz Unterzahl. Trotzdem Siegerfoto.";
  }
  if (input.upsetWin) {
    return "Nicht favorisiert. Trotzdem vorne.";
  }
  if (input.dramaticFinish) {
    return "Eng bis zum Schluss. Dann da.";
  }
  return "Flutlicht. Foto. Feierabend.";
}

function kicker(input: Scenario) {
  if (input.winnerWasShorthanded) return "Unterzahl";
  if (input.upsetWin) return "Underdog";
  if (input.dramaticFinish) return "Late Push";
  return "Session";
}

function StoryFrame({
  children,
  background,
  shellClassName = "",
}: {
  children: React.ReactNode;
  background: string;
  shellClassName?: string;
}) {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[288px]">
        <div
          className={`rounded-[28px] bg-slate-950 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.22)] ${shellClassName}`}
        >
          <div
            className="relative aspect-[9/16] overflow-hidden rounded-[20px]"
            style={{ background }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandFooter({
  accent,
  dark = true,
}: {
  accent: string;
  dark?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div
        className={`text-[9px] uppercase tracking-[0.18em] ${
          dark ? "text-white/45" : "text-slate-400"
        }`}
      >
        powered by{" "}
        <span
          className={
            dark ? "font-black text-white/75" : "font-black text-slate-900"
          }
        >
          strikr
        </span>
      </div>

      <div
        className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
        style={{
          background: accent,
          boxShadow: `0 0 14px ${hexToRgba(accent, 0.24)}`,
        }}
      >
        <span className="text-[10px] font-black">S</span>
      </div>
    </div>
  );
}

function PhotoBlock({
  src,
  accent,
  className = "",
  imageClassName = "h-full w-full object-cover",
  overlayClassName = "absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent",
}: {
  src?: string | null;
  accent: string;
  className?: string;
  imageClassName?: string;
  overlayClassName?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        boxShadow: `0 0 0 1px ${hexToRgba(
          accent,
          0.18
        )}, 0 0 18px ${hexToRgba(accent, 0.1)}`,
      }}
    >
      <img
        src={src || "/dev/mock-winner-story.png"}
        alt="Siegerfoto"
        className={imageClassName}
      />
      <div className={overlayClassName} />
    </div>
  );
}

/* =========================
   VARIANTS
========================= */

function FramedStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame background="linear-gradient(180deg, #0b1220 0%, #121926 100%)">
      <div className="flex h-full flex-col p-3 text-white">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/45">
              {kicker(scenario)}
            </div>
            <div className="mt-1 text-[12px] font-bold">{scenario.clubName}</div>
          </div>
          <div className="text-right text-[10px] text-white/55">
            {scenario.dateLabel}
          </div>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-white/5 p-2.5">
          <PhotoBlock
            src={scenario.winnerPhotoUrl}
            accent={accent}
            className="h-[55%] rounded-[14px]"
          />

          <div className="mt-2.5">
            <div className="text-[44px] font-black leading-none tracking-[-0.08em]">
              {scenario.score}
            </div>
            <div className="mt-2 text-[24px] font-black leading-[0.92] tracking-[-0.05em]">
              {headline(scenario)}
            </div>
            <div className="mt-1.5 text-[11px] leading-5 text-white/65">
              {subline(scenario)}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-3">
          <BrandFooter accent={accent} />
        </div>
      </div>
    </StoryFrame>
  );
}

function PosterStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame
      background={`
        radial-gradient(circle at 80% 8%, ${hexToRgba(
          accent,
          0.18
        )}, transparent 20%),
        linear-gradient(180deg, #f5f3ee 0%, #efede7 100%)
      `}
      shellClassName="bg-[#f0ede6]"
    >
      <div className="flex h-full flex-col p-3 text-slate-950">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
            Story Poster
          </div>
          <div className="text-[10px] text-slate-500">{scenario.dateLabel}</div>
        </div>

        <div className="mt-2 text-[12px] font-bold">{scenario.clubName}</div>

        <div className="mt-2.5 text-[56px] font-black leading-none tracking-[-0.1em]">
          {scenario.score}
        </div>

        <div className="mt-2.5 text-[28px] font-black leading-[0.9] tracking-[-0.06em]">
          {headline(scenario)}
        </div>

        <div className="mt-1.5 text-[11px] leading-5 text-slate-600">
          {subline(scenario)}
        </div>

        <div className="mt-3.5 flex-1">
          <PhotoBlock
            src={scenario.winnerPhotoUrl}
            accent={accent}
            className="h-full rounded-[10px]"
          />
        </div>

        <div className="mt-3 border-t border-slate-300 pt-3">
          <BrandFooter accent={accent} dark={false} />
        </div>
      </div>
    </StoryFrame>
  );
}

function StickerStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame background="linear-gradient(180deg, #0d1118 0%, #151b25 100%)">
      <div className="relative h-full p-3 text-white">
        <PhotoBlock
          src={scenario.winnerPhotoUrl}
          accent={accent}
          className="h-full rounded-[20px]"
        />

        <div className="absolute left-3.5 top-3.5 rotate-[-2deg] rounded-[12px] bg-white px-3 py-2 text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.22)]">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
            {scenario.clubName}
          </div>
          <div className="mt-1 text-[24px] font-black leading-[0.92] tracking-[-0.05em]">
            {headline(scenario)}
          </div>
        </div>

        <div
          className="absolute bottom-18 right-3.5 rotate-[2deg] rounded-[12px] px-3.5 py-2 text-white shadow-[0_12px_28px_rgba(15,23,42,0.32)]"
          style={{ background: accent }}
        >
          <div className="text-[9px] uppercase tracking-[0.18em] text-white/75">
            Endstand
          </div>
          <div className="mt-1 text-[44px] font-black leading-none tracking-[-0.08em]">
            {scenario.score}
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3 rounded-[12px] bg-black/40 px-3 py-2 backdrop-blur-md">
          <BrandFooter accent={accent} />
        </div>
      </div>
    </StoryFrame>
  );
}

function EditorialStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame background="linear-gradient(180deg, #ffffff 0%, #f4f4f2 100%)">
      <div className="flex h-full flex-col text-slate-950">
        <div className="px-3 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-slate-400">
                Editorial Story
              </div>
              <div className="mt-1 text-[12px] font-bold">{scenario.clubName}</div>
            </div>
            <div className="text-[10px] text-slate-500">{scenario.dateLabel}</div>
          </div>
        </div>

        <div className="mt-3 grid flex-1 grid-rows-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden">
            <img
              src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
              alt="Siegerfoto"
              className="h-full w-full object-cover object-center"
            />
            <div
              className="absolute left-0 top-0 h-full w-2"
              style={{ background: accent }}
            />
          </div>

          <div className="flex flex-col justify-between px-3 py-3.5">
            <div>
              <div className="text-[60px] font-black leading-none tracking-[-0.1em]">
                {scenario.score}
              </div>
              <div className="mt-2.5 text-[24px] font-black leading-[0.92] tracking-[-0.05em]">
                {headline(scenario)}
              </div>
              <div className="mt-1.5 text-[11px] leading-5 text-slate-600">
                {subline(scenario)}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <BrandFooter accent={accent} dark={false} />
            </div>
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function RawStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame background="linear-gradient(180deg, #090c11 0%, #10151d 100%)">
      <div className="relative h-full">
        <img
          src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
          alt="Siegerfoto"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

        <div className="absolute left-3 top-3 right-3 flex items-start justify-between gap-3 text-white">
          <div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-white/45">
              Raw Story
            </div>
            <div className="mt-1 text-[12px] font-bold">{scenario.clubName}</div>
          </div>
          <div className="text-[10px] text-white/55">{scenario.dateLabel}</div>
        </div>

        <div className="absolute bottom-14 left-3 right-3 text-white">
          <div className="text-[66px] font-black leading-none tracking-[-0.1em]">
            {scenario.score}
          </div>
          <div className="mt-2 max-w-[210px] text-[24px] font-black leading-[0.9] tracking-[-0.05em]">
            {headline(scenario)}
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <BrandFooter accent={accent} />
        </div>
      </div>
    </StoryFrame>
  );
}

function TapedStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame background="linear-gradient(180deg, #f3f0ea 0%, #ece8df 100%)">
      <div className="relative h-full p-3 text-slate-950">
        <div className="absolute left-1/2 top-3 z-10 h-6 w-20 -translate-x-1/2 rotate-[-2deg] bg-white/50 shadow-sm backdrop-blur-sm" />

        <div className="relative">
          <div className="rounded-[8px] bg-white p-2 shadow-[0_14px_30px_rgba(15,23,42,0.14)]">
            <img
              src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
              alt="Siegerfoto"
              className="h-[49vh] w-full object-cover object-center"
            />
          </div>
        </div>

        <div className="mt-3.5">
          <div className="text-[9px] uppercase tracking-[0.2em] text-slate-400">
            {scenario.clubName}
          </div>
          <div className="mt-2 text-[24px] font-black leading-[0.92] tracking-[-0.05em]">
            {headline(scenario)}
          </div>
        </div>

        <div className="mt-3.5 flex items-end justify-between gap-4">
          <div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-slate-400">
              Endstand
            </div>
            <div
              className="mt-1 text-[48px] font-black leading-none tracking-[-0.08em]"
              style={{ color: accent }}
            >
              {scenario.score}
            </div>
          </div>

          <div className="text-right text-[10px] text-slate-500">
            {scenario.dateLabel}
          </div>
        </div>

        <div className="mt-3 border-t border-slate-300 pt-3">
          <BrandFooter accent={accent} dark={false} />
        </div>
      </div>
    </StoryFrame>
  );
}

function GlassHeroStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame background="linear-gradient(180deg,#05070c,#0b1220)">
      <div className="relative h-full">
        <img
          src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
          alt="Siegerfoto"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/35" />

        <div className="absolute bottom-4 left-3 right-3 rounded-[18px] border border-white/15 bg-white/10 p-3 text-white backdrop-blur-xl">
          <div className="text-[52px] font-black leading-none tracking-[-0.08em]">
            {scenario.score}
          </div>
          <div className="mt-2 text-[22px] font-black leading-[0.92] tracking-[-0.05em]">
            {headline(scenario)}
          </div>
          <div className="mt-1 text-[11px] text-white/70">{scenario.clubName}</div>
        </div>
      </div>
    </StoryFrame>
  );
}

function ScoreStripStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame background="#0a0f18">
      <div className="flex h-full flex-col">
        <div className="relative flex-1 overflow-hidden">
          <img
            src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
            alt="Siegerfoto"
            className="h-full w-full object-cover object-center"
          />
        </div>

        <div
          className="border-t border-white/10 px-3 py-3 text-white"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(
              accent,
              0.85
            )}, rgba(15,23,42,0.95))`,
          }}
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-white/70">
                Score Strip
              </div>
              <div className="mt-1 text-[20px] font-black leading-tight">
                {headline(scenario)}
              </div>
            </div>
            <div className="text-[48px] font-black leading-none tracking-[-0.08em]">
              {scenario.score}
            </div>
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function SplitPosterStory({ scenario }: { scenario: Scenario }) {
  return (
    <StoryFrame background="#f4f1ea" shellClassName="bg-[#efe9dd]">
      <div className="grid h-full grid-cols-[1fr_0.42fr]">
        <div className="relative overflow-hidden">
          <img
            src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
            alt="Siegerfoto"
            className="h-full w-full object-cover object-[42%_center]"
          />
        </div>

        <div className="flex flex-col justify-between p-3 text-slate-950">
          <div>
            <div className="text-[8px] uppercase tracking-[0.18em] text-slate-400">
              Split Poster
            </div>
            <div className="mt-2 text-[11px] font-bold">{scenario.clubName}</div>
          </div>

          <div className="text-right">
            <div className="text-[56px] font-black leading-none tracking-[-0.08em]">
              {scenario.score}
            </div>
            <div className="mt-2 text-[18px] font-black leading-tight">
              {headline(scenario)}
            </div>
          </div>

          <div className="text-right text-[9px] text-slate-500">
            {scenario.dateLabel}
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function MonoStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame background="linear-gradient(180deg, #07090d 0%, #11151d 100%)">
      <div className="relative h-full">
        <img
          src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
          alt="Siegerfoto"
          className="h-full w-full object-cover saturate-[0.45] contrast-[0.95]"
        />
        <div className="absolute inset-0 bg-black/35" />
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px]"
          style={{ background: accent }}
        />
        <div className="absolute bottom-4 left-3 right-3 text-white">
          <div className="text-[58px] font-black leading-none tracking-[-0.08em]">
            {scenario.score}
          </div>
          <div className="mt-1 text-[20px] font-black">{headline(scenario)}</div>
        </div>
      </div>
    </StoryFrame>
  );
}

function HardFrameStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame background="#111">
      <div className="h-full p-3">
        <div
          className="h-full rounded-[4px] border-[6px] bg-black p-2"
          style={{
            borderColor: "#111827",
            boxShadow: `0 0 0 1px ${hexToRgba(accent, 0.22)}`,
          }}
        >
          <div className="relative h-full overflow-hidden rounded-[2px]">
            <img
              src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
              alt="Siegerfoto"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function StampStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame background="#f7f5ef" shellClassName="bg-[#efe8db]">
      <div className="relative h-full p-3 text-slate-950">
        <PhotoBlock
          src={scenario.winnerPhotoUrl}
          accent={accent}
          className="h-full rounded-[16px]"
          overlayClassName="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent"
        />

        <div
          className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 rotate-[-10deg] rounded-[14px] border-[3px] px-5 py-2 text-[42px] font-black uppercase leading-none"
          style={{
            borderColor: accent,
            color: accent,
            background: "rgba(255,255,255,0.82)",
          }}
        >
          {scenario.score}
        </div>

        <div className="absolute bottom-4 left-4 right-4 rounded-[14px] bg-white/80 px-3 py-2 backdrop-blur-sm">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Stamp Story
          </div>
          <div className="mt-1 text-[18px] font-black text-slate-950">
            {headline(scenario)}
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function PolaroidStory({ scenario }: { scenario: Scenario }) {
  return (
    <StoryFrame background="#ebe7de" shellClassName="bg-[#e8e2d7]">
      <div className="flex h-full items-center justify-center p-4">
        <div className="w-[86%] rotate-[-3deg] bg-white p-3 shadow-[0_18px_36px_rgba(15,23,42,0.18)]">
          <img
            src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
            alt="Siegerfoto"
            className="h-[62%] w-full object-cover"
          />
          <div className="mt-3 text-[38px] font-black leading-none tracking-[-0.08em] text-slate-950">
            {scenario.score}
          </div>
          <div className="mt-2 text-[16px] font-bold text-slate-800">
            {headline(scenario)}
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function NewsprintStory({ scenario }: { scenario: Scenario }) {
  return (
    <StoryFrame background="#f3f1ea" shellClassName="bg-[#ede9df]">
      <div className="flex h-full flex-col p-3 text-slate-950">
        <div className="border-b border-slate-300 pb-2">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
            Newsprint
          </div>
          <div className="mt-1 text-[11px] font-bold">{scenario.clubName}</div>
        </div>

        <div className="mt-2.5 grid flex-1 grid-rows-[0.95fr_1.05fr] gap-2.5">
          <img
            src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
            alt="Siegerfoto"
            className="h-full w-full object-cover saturate-[0.5] contrast-[0.95]"
          />

          <div className="grid grid-cols-[0.42fr_1fr] gap-2">
            <div className="border-r border-slate-300 pr-2">
              <div className="text-[52px] font-black leading-none tracking-[-0.08em]">
                {scenario.score}
              </div>
            </div>
            <div>
              <div className="text-[18px] font-black leading-tight">
                {headline(scenario)}
              </div>
              <div className="mt-2 text-[10px] leading-5 text-slate-600">
                {subline(scenario)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function TrophyTapeStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame background="#121826">
      <div className="relative h-full p-3">
        <div className="absolute left-8 top-3 z-10 h-5 w-16 rotate-[-8deg] bg-yellow-100/80 shadow-sm" />
        <div className="absolute right-8 top-3 z-10 h-5 w-16 rotate-[10deg] bg-yellow-100/80 shadow-sm" />

        <div className="h-full rounded-[14px] border border-white/10 bg-white/5 p-2.5">
          <PhotoBlock
            src={scenario.winnerPhotoUrl}
            accent={accent}
            className="h-[68%] rounded-[12px]"
          />
          <div className="mt-3 text-center text-white">
            <div className="text-[48px] font-black leading-none tracking-[-0.08em]">
              {scenario.score}
            </div>
            <div className="mt-1 text-[18px] font-black">{headline(scenario)}</div>
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function BigTypeOverlayStory({ scenario }: { scenario: Scenario }) {
  return (
    <StoryFrame background="#000814">
      <div className="relative h-full">
        <img
          src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
          alt="Siegerfoto"
          className="h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-black/15" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[118px] font-black leading-none tracking-[-0.12em] text-white/88">
            {scenario.score}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="text-[18px] font-black">{headline(scenario)}</div>
        </div>
      </div>
    </StoryFrame>
  );
}

function QuietLuxuryStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame background="#f7f5f1" shellClassName="bg-[#f2eee7]">
      <div className="flex h-full flex-col p-3 text-slate-950">
        <div className="flex items-center justify-between">
          <div className="text-[8px] uppercase tracking-[0.18em] text-slate-400">
            Quiet Luxury
          </div>
          <div
            className="h-6 w-6 rounded-full"
            style={{ background: accent, opacity: 0.85 }}
          />
        </div>

        <div className="mt-3 overflow-hidden rounded-[8px]">
          <img
            src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
            alt="Siegerfoto"
            className="h-[58vh] w-full object-cover object-center"
          />
        </div>

        <div className="mt-4">
          <div className="text-[54px] font-black leading-none tracking-[-0.08em]">
            {scenario.score}
          </div>
          <div className="mt-2 text-[20px] font-black">{headline(scenario)}</div>
          <div className="mt-2 text-[10px] leading-5 text-slate-600">
            {subline(scenario)}
          </div>
        </div>

        <div className="mt-auto pt-3">
          <BrandFooter accent={accent} dark={false} />
        </div>
      </div>
    </StoryFrame>
  );
}

function BroadcastStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame background="#06080d">
      <div className="relative h-full">
        <img
          src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
          alt="Siegerfoto"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-black/80 px-3 py-3 text-white backdrop-blur-sm">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="text-[10px] font-semibold text-white/75">
              {scenario.winnerLabel}
            </div>
            <div
              className="rounded-full px-3 py-1 text-[34px] font-black leading-none tracking-[-0.08em]"
              style={{ background: hexToRgba(accent, 0.16) }}
            >
              {scenario.score}
            </div>
            <div className="text-right text-[10px] font-semibold text-white/75">
              {scenario.loserLabel}
            </div>
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function RippedPaperStory({ scenario }: { scenario: Scenario }) {
  return (
    <StoryFrame background="#f1ede4" shellClassName="bg-[#ebe5d8]">
      <div className="relative h-full p-3">
        <div className="absolute left-0 right-0 top-[54%] z-10 h-5 bg-[#f1ede4]" />

        <div className="grid h-full grid-rows-[1fr_auto] gap-0">
          <img
            src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
            alt="Siegerfoto"
            className="h-full w-full object-cover"
          />

          <div className="bg-[#f1ede4] px-3 py-4 text-slate-950">
            <div className="text-[54px] font-black leading-none tracking-[-0.08em]">
              {scenario.score}
            </div>
            <div className="mt-2 text-[20px] font-black">{headline(scenario)}</div>
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function CenterPosterStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame background="#0f141d">
      <div className="flex h-full items-center justify-center p-4">
        <div className="w-[86%] rounded-[18px] border border-white/10 bg-white/5 p-2 shadow-[0_18px_36px_rgba(15,23,42,0.22)]">
          <img
            src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
            alt="Siegerfoto"
            className="h-[52vh] w-full rounded-[12px] object-cover"
          />
          <div className="mt-3 text-white">
            <div className="text-[44px] font-black leading-none tracking-[-0.08em]">
              {scenario.score}
            </div>
            <div className="mt-1 text-[18px] font-black">{headline(scenario)}</div>
            <div
              className="mt-3 h-[2px] rounded-full"
              style={{ background: accent }}
            />
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function NeonDuskStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame
      background={`
        radial-gradient(circle at 20% 20%, rgba(255,0,140,0.28), transparent 24%),
        radial-gradient(circle at 80% 10%, rgba(0,255,220,0.24), transparent 20%),
        linear-gradient(180deg, #090a16 0%, #14162b 100%)
      `}
    >
      <div className="relative h-full p-3 text-white">
        <PhotoBlock
          src={scenario.winnerPhotoUrl}
          accent={accent}
          className="h-full rounded-[18px]"
          overlayClassName="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"
        />

        <div className="absolute bottom-4 left-4 right-4 rounded-[14px] bg-black/30 px-3 py-3 backdrop-blur-md">
          <div className="text-[46px] font-black leading-none tracking-[-0.08em] text-white">
            {scenario.score}
          </div>
          <div className="mt-1 text-[18px] font-black text-white/92">
            {headline(scenario)}
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function PastelEditorialStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame
      background={`
        linear-gradient(180deg, #fff7fb 0%, #f7f4ff 48%, #eef8ff 100%)
      `}
      shellClassName="bg-[#f4eef8]"
    >
      <div className="flex h-full flex-col p-3 text-slate-950">
        <div className="flex items-center justify-between">
          <div className="text-[8px] uppercase tracking-[0.18em] text-slate-400">
            Pastel Editorial
          </div>
          <div
            className="h-2.5 w-10 rounded-full"
            style={{ background: accent }}
          />
        </div>

        <div className="mt-3 overflow-hidden rounded-[12px]">
          <img
            src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
            alt="Siegerfoto"
            className="h-[56vh] w-full object-cover object-center"
          />
        </div>

        <div className="mt-3">
          <div className="text-[50px] font-black leading-none tracking-[-0.08em]">
            {scenario.score}
          </div>
          <div className="mt-2 text-[20px] font-black">{headline(scenario)}</div>
          <div className="mt-2 text-[10px] leading-5 text-slate-600">
            {subline(scenario)}
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function SoftWashStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame
      background={`
        radial-gradient(circle at 18% 18%, ${hexToRgba(accent, 0.24)}, transparent 24%),
        linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%)
      `}
      shellClassName="bg-[#eef3f8]"
    >
      <div className="flex h-full flex-col p-3 text-slate-950">
        <div className="text-[8px] uppercase tracking-[0.18em] text-slate-400">
          Soft Wash
        </div>

        <div className="mt-3 overflow-hidden rounded-[16px] border border-white bg-white p-2 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          <img
            src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
            alt="Siegerfoto"
            className="h-[54vh] w-full rounded-[12px] object-cover object-center"
          />
        </div>

        <div className="mt-4">
          <div className="text-[52px] font-black leading-none tracking-[-0.08em]">
            {scenario.score}
          </div>
          <div className="mt-2 text-[18px] font-black">{headline(scenario)}</div>
        </div>

        <div className="mt-auto pt-3">
          <BrandFooter accent={accent} dark={false} />
        </div>
      </div>
    </StoryFrame>
  );
}

/* =========================
   NEW 5 FAMILIES
========================= */

function VictoryBadgeStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame
      background={`
        radial-gradient(circle at 50% 22%, ${hexToRgba(accent, 0.22)}, transparent 28%),
        linear-gradient(180deg, #0b1220 0%, #131b2a 100%)
      `}
    >
      <div className="relative flex h-full flex-col items-center justify-center px-4 text-white">
        <div
          className="absolute inset-x-8 top-16 bottom-24 rounded-full blur-3xl"
          style={{ background: hexToRgba(accent, 0.18) }}
        />

        <div className="relative flex h-[78%] w-full max-w-[232px] items-center justify-center">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${hexToRgba(
                accent,
                0.2
              )} 0%, transparent 62%)`,
            }}
          />
          <div
            className="absolute inset-4 rounded-full border"
            style={{ borderColor: hexToRgba(accent, 0.34) }}
          />
          <div className="absolute inset-8 rounded-full border border-white/10" />

          <div className="relative h-[68%] w-[68%] overflow-hidden rounded-full border border-white/20 bg-white/5 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
            <img
              src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
              alt="Siegerfoto"
              className="h-full w-full rounded-full object-cover"
            />
          </div>

          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-5 py-2 text-[40px] font-black leading-none text-white shadow-[0_12px_24px_rgba(0,0,0,0.3)]"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(
                accent,
                0.95
              )}, rgba(15,23,42,0.95))`,
            }}
          >
            {scenario.score}
          </div>
        </div>

        <div className="mt-3 text-center">
          <div className="text-[9px] uppercase tracking-[0.22em] text-white/55">
            Victory Badge
          </div>
          <div className="mt-2 text-[22px] font-black leading-tight">
            {headline(scenario)}
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function MatchTicketStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame
      background={`
        linear-gradient(180deg, #f6f2ea 0%, #ece4d8 100%)
      `}
      shellClassName="bg-[#efe6d9]"
    >
      <div className="relative h-full p-4 text-slate-950">
        <div className="absolute left-0 top-[21%] z-20 h-7 w-7 -translate-x-1/2 rounded-full bg-[#efe6d9]" />
        <div className="absolute right-0 top-[21%] z-20 h-7 w-7 translate-x-1/2 rounded-full bg-[#efe6d9]" />
        <div className="absolute left-0 bottom-[26%] z-20 h-7 w-7 -translate-x-1/2 rounded-full bg-[#efe6d9]" />
        <div className="absolute right-0 bottom-[26%] z-20 h-7 w-7 translate-x-1/2 rounded-full bg-[#efe6d9]" />

        <div className="flex h-full flex-col rounded-[20px] border border-slate-300 bg-white shadow-[0_16px_34px_rgba(15,23,42,0.12)]">
          <div
            className="border-b border-dashed px-4 py-3"
            style={{ borderColor: hexToRgba(accent, 0.34) }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[8px] uppercase tracking-[0.2em] text-slate-400">
                  Match Ticket
                </div>
                <div className="mt-1 text-[13px] font-bold">{scenario.clubName}</div>
              </div>
              <div
                className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white"
                style={{ background: accent }}
              >
                Session
              </div>
            </div>
          </div>

          <div className="p-3">
            <img
              src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
              alt="Siegerfoto"
              className="h-[34vh] w-full rounded-[14px] object-cover object-center"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 px-4 pb-3 text-[10px] text-slate-500">
            <div>
              <div className="uppercase tracking-[0.16em]">Datum</div>
              <div className="mt-1 text-[11px] font-semibold text-slate-900">
                {scenario.dateLabel}
              </div>
            </div>
            <div className="text-right">
              <div className="uppercase tracking-[0.16em]">Modus</div>
              <div className="mt-1 text-[11px] font-semibold text-slate-900">
                Training
              </div>
            </div>
          </div>

          <div className="mt-auto border-t border-dashed border-slate-300 px-4 py-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[8px] uppercase tracking-[0.18em] text-slate-400">
                  Endstand
                </div>
                <div className="mt-1 text-[44px] font-black leading-none tracking-[-0.08em] text-slate-950">
                  {scenario.score}
                </div>
              </div>
              <div className="max-w-[110px] text-right text-[14px] font-black leading-tight text-slate-900">
                {headline(scenario)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function LockerRoomStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame
      background={`
        linear-gradient(180deg, #0f1722 0%, #182230 100%)
      `}
    >
      <div className="relative h-full p-3 text-white">
        <div className="absolute inset-0 opacity-[0.08]">
          <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:22px_22px]" />
        </div>

        <div className="relative h-full rounded-[18px] border border-white/10 bg-white/[0.03] p-3 backdrop-blur-[1px]">
          <div className="flex items-center justify-between">
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/45">
              Locker Room
            </div>
            <div
              className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white"
              style={{ background: hexToRgba(accent, 0.9) }}
            >
              Board
            </div>
          </div>

          <div className="relative mt-3">
            <div className="absolute -left-1 top-4 h-3 w-3 rounded-full bg-slate-200 shadow-sm" />
            <div className="absolute -right-1 top-8 h-3 w-3 rounded-full bg-slate-200 shadow-sm" />
            <div className="rotate-[-2deg] rounded-[14px] bg-white p-2 shadow-[0_18px_36px_rgba(0,0,0,0.28)]">
              <img
                src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
                alt="Siegerfoto"
                className="h-[37vh] w-full rounded-[10px] object-cover"
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="rotate-[-2deg] text-[28px] font-black tracking-[-0.06em] text-white">
                {scenario.score}
              </div>
              <div className="rotate-[1deg] rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold text-white/80">
                {kicker(scenario)}
              </div>
            </div>

            <div className="rotate-[-1deg] text-[19px] font-black leading-tight text-white">
              {headline(scenario)}
            </div>

            <div className="rounded-[12px] border border-dashed border-white/15 bg-black/10 px-3 py-2 text-[10px] leading-5 text-white/72">
              Notiz: {subline(scenario)}
            </div>
          </div>

          <div className="mt-auto pt-4">
            <BrandFooter accent={accent} />
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function NightFloodlightStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame
      background={`
        radial-gradient(circle at 50% 6%, rgba(255,255,255,0.22), transparent 18%),
        radial-gradient(circle at 15% 16%, ${hexToRgba(accent, 0.18)}, transparent 24%),
        linear-gradient(180deg, #05070b 0%, #0d1320 100%)
      `}
    >
      <div className="relative h-full">
        <img
          src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
          alt="Siegerfoto"
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/20 to-black/18" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent blur-2xl" />
        <div
          className="absolute left-[-10%] top-[8%] h-28 w-28 rounded-full blur-3xl"
          style={{ background: hexToRgba(accent, 0.26) }}
        />
        <div className="absolute right-[8%] top-[10%] h-20 w-20 rounded-full bg-white/12 blur-2xl" />

        <div className="absolute inset-x-4 top-4 flex items-center justify-between text-white">
          <div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-white/45">
              Night Floodlight
            </div>
            <div className="mt-1 text-[12px] font-bold">{scenario.clubName}</div>
          </div>
          <div className="text-[10px] text-white/55">{scenario.dateLabel}</div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div
            className="inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
            style={{
              borderColor: hexToRgba(accent, 0.36),
              background: hexToRgba(accent, 0.12),
            }}
          >
            Flutlichtmoment
          </div>

          <div
            className="mt-3 text-[64px] font-black leading-none tracking-[-0.1em]"
            style={{
              textShadow: `0 0 18px ${hexToRgba(
                accent,
                0.22
              )}, 0 10px 24px rgba(0,0,0,0.34)`,
            }}
          >
            {scenario.score}
          </div>

          <div className="mt-2 max-w-[220px] text-[22px] font-black leading-tight">
            {headline(scenario)}
          </div>
          <div className="mt-2 text-[11px] leading-5 text-white/70">
            {subline(scenario)}
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

function FashionSportsEditorialStory({ scenario }: { scenario: Scenario }) {
  const accent = scenario.clubColor;

  return (
    <StoryFrame
      background={`
        linear-gradient(180deg, #f8f7f4 0%, #efeee9 100%)
      `}
      shellClassName="bg-[#f3f2ed]"
    >
      <div className="flex h-full flex-col p-3 text-slate-950">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[8px] uppercase tracking-[0.22em] text-slate-400">
              Fashion Sports Editorial
            </div>
            <div className="mt-1.5 text-[12px] font-bold">{scenario.clubName}</div>
          </div>

          <div
            className="mt-1 h-10 w-[2px] rounded-full"
            style={{ background: accent }}
          />
        </div>

        <div className="mt-3 grid flex-1 grid-rows-[auto_1fr] gap-3">
          <div className="flex items-end justify-between gap-3">
            <div className="text-[58px] font-black leading-none tracking-[-0.1em]">
              {scenario.score}
            </div>
            <div className="max-w-[92px] text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {scenario.dateLabel}
            </div>
          </div>

          <div className="grid grid-cols-[0.52fr_1fr] gap-3">
            <div className="flex flex-col justify-between">
              <div className="text-[22px] font-black leading-[0.92] tracking-[-0.05em]">
                {headline(scenario)}
              </div>
              <div className="text-[10px] leading-5 text-slate-600">
                {subline(scenario)}
              </div>
              <div className="pt-3">
                <BrandFooter accent={accent} dark={false} />
              </div>
            </div>

            <div className="overflow-hidden rounded-[16px]">
              <img
                src={scenario.winnerPhotoUrl || "/dev/mock-winner-story.png"}
                alt="Siegerfoto"
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </div>
    </StoryFrame>
  );
}

const VARIANTS: VariantDefinition[] = [
  {
    key: "framed_story",
    category: "Frame / Poster",
    title: "Framed Story",
    note: "Rahmen + Foto + kompakter Scoreblock. Mehr Story, weniger Karte.",
    render: (scenario) => <FramedStory scenario={scenario} />,
  },
  {
    key: "poster_story",
    category: "Poster",
    title: "Poster Story",
    note: "Heller Poster-Look. Moderner, stylischer, ruhiger.",
    render: (scenario) => <PosterStory scenario={scenario} />,
  },
  {
    key: "sticker_story",
    category: "Sticker",
    title: "Sticker Story",
    note: "Headline und Score wie aufgeklebt. Mehr Spielerei, aber klar lesbar.",
    render: (scenario) => <StickerStory scenario={scenario} />,
  },
  {
    key: "editorial_story",
    category: "Editorial",
    title: "Editorial Story",
    note: "Am stärksten magazinig. Mehr Haltung, weniger klassischer Share-Post.",
    render: (scenario) => <EditorialStory scenario={scenario} />,
  },
  {
    key: "raw_story",
    category: "Raw",
    title: "Raw Story",
    note: "Bild + Score + Satz. Maximal reduziert und direkt.",
    render: (scenario) => <RawStory scenario={scenario} />,
  },
  {
    key: "taped_story",
    category: "Tape / Print",
    title: "Taped Story",
    note: "Print-/Tape-Idee. Emotional und sharebar, wenn sauber genug.",
    render: (scenario) => <TapedStory scenario={scenario} />,
  },
  {
    key: "glass_hero_story",
    category: "Glass / Modern",
    title: "Glass Hero Story",
    note: "Hero-Foto plus glasige Score-Fläche. Moderner, etwas techiger.",
    render: (scenario) => <GlassHeroStory scenario={scenario} />,
  },
  {
    key: "score_strip_story",
    category: "Sport / Broadcast",
    title: "Score Strip Story",
    note: "Unten eine harte Ergebnisleiste. Schnell verständlich und klar.",
    render: (scenario) => <ScoreStripStory scenario={scenario} />,
  },
  {
    key: "split_poster_story",
    category: "Poster / Editorial",
    title: "Split Poster Story",
    note: "Hart geteilt: Foto links, Statement rechts. Weniger Crop-Chaos.",
    render: (scenario) => <SplitPosterStory scenario={scenario} />,
  },
  {
    key: "mono_story",
    category: "Monochrom",
    title: "Mono Story",
    note: "Entsättigt statt hart schwarzweiß. Ruhig, erwachsen, leicht arty.",
    render: (scenario) => <MonoStory scenario={scenario} />,
  },
  {
    key: "hard_frame_story",
    category: "Frame",
    title: "Hard Frame Story",
    note: "Dicker, harter Rahmen. Mehr Posterprint als App-Grafik.",
    render: (scenario) => <HardFrameStory scenario={scenario} />,
  },
  {
    key: "stamp_story",
    category: "Street / Print",
    title: "Stamp Story",
    note: "Score wie ein Stempel über dem Bild. Rougher und etwas frecher.",
    render: (scenario) => <StampStory scenario={scenario} />,
  },
  {
    key: "polaroid_story",
    category: "Print / Memory",
    title: "Polaroid Story",
    note: "Fotoabzug-Feeling. Emotionaler, nostalgischer, persönlicher.",
    render: (scenario) => <PolaroidStory scenario={scenario} />,
  },
  {
    key: "newsprint_story",
    category: "Editorial / News",
    title: "Newsprint Story",
    note: "Wie eine kleine Sportseite. Jetzt entsättigt statt hart grau.",
    render: (scenario) => <NewsprintStory scenario={scenario} />,
  },
  {
    key: "trophy_tape_story",
    category: "Tape / Trophy",
    title: "Trophy Tape Story",
    note: "Siegerbild wie aufgehängt. Mehr Feiermoment als reine Info.",
    render: (scenario) => <TrophyTapeStory scenario={scenario} />,
  },
  {
    key: "big_type_overlay_story",
    category: "Type / Bold",
    title: "Big Type Overlay Story",
    note: "Score brutal groß übers Bild. Schnell, plakativ, sehr story-tauglich.",
    render: (scenario) => <BigTypeOverlayStory scenario={scenario} />,
  },
  {
    key: "quiet_luxury_story",
    category: "Luxury / Minimal",
    title: "Quiet Luxury Story",
    note: "Sehr ruhig, clean und edler. Weniger laut, mehr Designobjekt.",
    render: (scenario) => <QuietLuxuryStory scenario={scenario} />,
  },
  {
    key: "broadcast_story",
    category: "Sport / TV",
    title: "Broadcast Story",
    note: "TV-/Live-Ticker-Vibe. Direkt sportlich und sehr verständlich.",
    render: (scenario) => <BroadcastStory scenario={scenario} />,
  },
  {
    key: "ripped_paper_story",
    category: "Print / Collage",
    title: "Ripped Paper Story",
    note: "Abgerissener Papier-Look. Künstlerischer, rougher, nicht zu clean.",
    render: (scenario) => <RippedPaperStory scenario={scenario} />,
  },
  {
    key: "center_poster_story",
    category: "Poster / Centerpiece",
    title: "Center Poster Story",
    note: "Poster in der Mitte. Mehr Gallery-/Print-Gefühl als Story-Template.",
    render: (scenario) => <CenterPosterStory scenario={scenario} />,
  },
  {
    key: "neon_dusk_story",
    category: "Color / Neon",
    title: "Neon Dusk Story",
    note: "Neoniger Abendlook mit Glow-Vibe. Etwas mutiger, aber noch clean.",
    render: (scenario) => <NeonDuskStory scenario={scenario} />,
  },
  {
    key: "pastel_editorial_story",
    category: "Pastel / Editorial",
    title: "Pastel Editorial Story",
    note: "Pastelliger, weicher, stylischer. Etwas modischer und leichter.",
    render: (scenario) => <PastelEditorialStory scenario={scenario} />,
  },
  {
    key: "soft_wash_story",
    category: "Color / Soft",
    title: "Soft Wash Story",
    note: "Dezenter Farbnebel mit cleaner Foto-Bühne. Sehr angenehm modern.",
    render: (scenario) => <SoftWashStory scenario={scenario} />,
  },
  {
    key: "victory_badge_story",
    category: "Award / Status",
    title: "Victory Badge Story",
    note: "Result als Auszeichnungs-Moment. Sehr stark für Recognition und STRIKR-DNA.",
    render: (scenario) => <VictoryBadgeStory scenario={scenario} />,
  },
  {
    key: "match_ticket_story",
    category: "Event / Collectible",
    title: "Match Ticket Story",
    note: "Wie ein Spieltagsticket oder Event-Pass. Sammliger, eigenständiger Look.",
    render: (scenario) => <MatchTicketStory scenario={scenario} />,
  },
  {
    key: "locker_room_story",
    category: "Club / Atmosphere",
    title: "Locker Room Story",
    note: "Kabinenwand- und Taktiktafel-Vibe. Nahbarer, echter, amateurfußballiger Moment.",
    render: (scenario) => <LockerRoomStory scenario={scenario} />,
  },
  {
    key: "night_floodlight_story",
    category: "Cinematic / Night",
    title: "Night Floodlight Story",
    note: "Mehr Flutlicht, Energie und Kino. Sehr stark für emotionale Siegerfotos.",
    render: (scenario) => <NightFloodlightStory scenario={scenario} />,
  },
  {
    key: "fashion_sports_editorial_story",
    category: "Magazine / Fashion Sport",
    title: "Fashion Sports Editorial Story",
    note: "Mehr Designmagazin als Vereinsgrafik. Hochwertig, modern, sportlich-cool.",
    render: (scenario) => <FashionSportsEditorialStory scenario={scenario} />,
  },
];

function NumberBadge({ number }: { number: number }) {
  return (
    <div className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-slate-950 px-2 text-xs font-black text-white">
      {number}
    </div>
  );
}

function VoteButton({
  active,
  label,
  variant,
  onClick,
}: {
  active: boolean;
  label: string;
  variant: "like" | "dislike";
  onClick: () => void;
}) {
  const activeClass =
    variant === "like"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : "border-rose-300 bg-rose-50 text-rose-700";

  const idleClass =
    variant === "like"
      ? "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/50"
      : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50/50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
        active ? activeClass : idleClass
      }`}
    >
      {label}
    </button>
  );
}

function VariantBlock({
  number,
  category,
  title,
  note,
  children,
  vote,
  onVote,
}: {
  number: number;
  category: string;
  title: string;
  note: string;
  children: React.ReactNode;
  vote?: VoteState;
  onVote: (next?: VoteState) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-start gap-3">
          <NumberBadge number={number} />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {category}
            </div>
            <div className="mt-1 text-sm font-bold text-slate-950">{title}</div>
            <div className="mt-1 text-sm text-slate-600">{note}</div>

            <div className="mt-3 flex flex-wrap gap-2">
              <VoteButton
                active={vote === "like"}
                label="Gefällt mir"
                variant="like"
                onClick={() => onVote(vote === "like" ? undefined : "like")}
              />
              <VoteButton
                active={vote === "dislike"}
                label="Gefällt mir nicht"
                variant="dislike"
                onClick={() =>
                  onVote(vote === "dislike" ? undefined : "dislike")
                }
              />
            </div>
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}

export default function DevResultSharePage() {
  const [votes, setVotes] = useState<Record<number, VoteState | undefined>>({});

  const liked = useMemo(
    () =>
      Object.entries(votes)
        .filter(([, value]) => value === "like")
        .map(([key]) => Number(key))
        .sort((a, b) => a - b),
    [votes]
  );

  const disliked = useMemo(
    () =>
      Object.entries(votes)
        .filter(([, value]) => value === "dislike")
        .map(([key]) => Number(key))
        .sort((a, b) => a - b),
    [votes]
  );

  const summaryText = useMemo(() => {
    const likedText = liked.length ? liked.join(", ") : "-";
    const dislikedText = disliked.length ? disliked.join(", ") : "-";
    return `Gefällt mir: ${likedText}\nGefällt mir nicht: ${dislikedText}`;
  }, [liked, disliked]);

  function updateVote(number: number, next?: VoteState) {
    setVotes((prev) => ({
      ...prev,
      [number]: next,
    }));
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText);
    } catch {
      // no-op
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Dev Exploration
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            Result Share – Story Preview Mode
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
            Jetzt mit echter Story-Logik gedacht: 9:16, mobil lesbar, schneller
            erfassbar, weniger große Designkarte, mehr Poster, Sticker, Story
            und Editorial. Die Story-Previews sind bewusst etwas kleiner, damit
            du mehr Varianten auf einen Blick vergleichen kannst.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-bold text-slate-950">Auswahl</div>
              <div className="mt-3 text-sm text-slate-700">
                <div>
                  <span className="font-semibold text-slate-950">
                    Gefällt mir:
                  </span>{" "}
                  {liked.length ? liked.join(", ") : "-"}
                </div>
                <div className="mt-1">
                  <span className="font-semibold text-slate-950">
                    Gefällt mir nicht:
                  </span>{" "}
                  {disliked.length ? disliked.join(", ") : "-"}
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-slate-950">
                  Copy-ready für den Chat
                </div>
                <button
                  type="button"
                  onClick={copySummary}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Kopieren
                </button>
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
                {summaryText}
              </pre>
            </div>
          </div>

          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"
            >
              ← Zurück
            </Link>
          </div>
        </div>

        {SCENARIOS.map((scenario, scenarioIndex) => (
          <section key={scenario.id} className="space-y-5">
            <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Szenario
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                {scenario.clubName} · {scenario.score}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Jetzt in realistischer Story-Vorschau statt Desktop-Großfläche.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-3">
              {VARIANTS.map((variant, variantIndex) => {
                const globalNumber =
                  scenarioIndex * VARIANTS.length + variantIndex + 1;

                return (
                  <VariantBlock
                    key={`${scenario.id}-${variant.key}`}
                    number={globalNumber}
                    category={variant.category}
                    title={variant.title}
                    note={variant.note}
                    vote={votes[globalNumber]}
                    onVote={(next) => updateVote(globalNumber, next)}
                  >
                    {variant.render(scenario)}
                  </VariantBlock>
                );
              })}
            </div>
          </section>
        ))}

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Nächste Vorschläge – kategorisiert
          </h2>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {IDEA_CATEGORIES.map((category) => (
              <div
                key={category.title}
                className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
              >
                <div className="text-sm font-bold text-slate-950">
                  {category.title}
                </div>
                <div className="mt-3 space-y-2">
                  {category.items.map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}