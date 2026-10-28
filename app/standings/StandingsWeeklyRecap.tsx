"use client";

import { useState } from "react";
import Image from "next/image";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { fetchImageAsFile } from "@/lib/share/utils";
import type { WeeklyReport } from "@/lib/standings/weekly-report";
import { weeklyRaceStory } from "@/lib/standings/weekly-race-story";
import { useI18n } from "@/components/i18n/I18nProvider";

type Props = { report: WeeklyReport; selectedSeason: string; seasonName: string };

async function fileToBase64(file: File) {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buffer.length; i += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function shareRecapFile(file: File) {
  if (Capacitor.isNativePlatform()) {
    if (!Capacitor.isPluginAvailable("Share") || !Capacitor.isPluginAvailable("Filesystem")) {
      throw new Error("Bitte die aktuelle App-Version installieren, um die Story zu teilen.");
    }
    const written = await Filesystem.writeFile({
      path: `share/${Date.now()}-strikr-wochenrueckblick.png`,
      data: await fileToBase64(file),
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      files: [written.uri],
      title: "strikr · Wochenrückblick",
      dialogTitle: "Wochenrückblick teilen",
    });
    return "shared";
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function"
    && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ files: [file], title: "strikr · Wochenrückblick" });
    return "shared";
  }

  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "strikr-wochenrueckblick.png";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return "downloaded";
}

function PlayerAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return (
    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-slate-700 text-sm font-black text-white sm:h-14 sm:w-14">
      {photoUrl ? (
        <Image src={photoUrl} unoptimized alt={`Foto von ${name}`} fill sizes="56px"
          className="object-cover" />
      ) : <span aria-label={`Kein Foto für ${name}`}>{initials || "?"}</span>}
    </span>
  );
}

export default function StandingsWeeklyRecap({ report, selectedSeason, seasonName }: Props) {
  const { locale } = useI18n();
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const hasChanges = report.hasBaseline && report.completedTrainings > 0;
  const cutoffLabel = report.cutoffDate.split("-").reverse().join(".");
  const race = weeklyRaceStory(report);
  const onShare = async () => {
    if (sharing) return;
    setSharing(true);
    setMessage("");
    try {
      const params = new URLSearchParams({
        season: selectedSeason,
        lang: locale,
        ts: String(Date.now()),
      });
      const file = await fetchImageAsFile(
        `/api/share/standings/weekly/image?${params.toString()}`,
        "strikr-wochenrueckblick.png",
      );
      const result = await shareRecapFile(file);
      setMessage(result === "shared" ? "Wochenreport geteilt." : "Wochenreport heruntergeladen.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "Story konnte nicht erstellt werden.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-3 py-4 text-white shadow-lg sm:rounded-[24px] sm:p-5">
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-teal-300">
          strikr · Wochenrückblick
        </div>
        <h2 className="mt-1.5 break-words text-lg font-black leading-tight tracking-tight sm:text-2xl">
          Was hat sich in der Tabelle getan?
        </h2>
      </div>

      {hasChanges ? (
        <>
          <div className="mt-3 flex min-w-0 flex-col gap-2">
            {report.biggestRiser ? (
              <div className="flex min-w-0 items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                <PlayerAvatar name={report.biggestRiser.name} photoUrl={report.biggestRiser.photoUrl} />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black uppercase tracking-wide text-emerald-300">↑ Größter Aufstieg</div>
                  <div className="mt-1 truncate text-base font-black">{report.biggestRiser.name}</div>
                  <div className="text-xs font-bold text-emerald-300">
                    +{report.biggestRiser.places} Plätze <span className="font-medium text-white/60">({report.biggestRiser.fromRank} → {report.biggestRiser.toRank})</span>
                  </div>
                </div>
              </div>
            ) : null}
            {report.biggestFaller ? (
              <div className="flex min-w-0 items-center gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3">
                <PlayerAvatar name={report.biggestFaller.name} photoUrl={report.biggestFaller.photoUrl} />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black uppercase tracking-wide text-rose-300">↓ Größter Abstieg</div>
                  <div className="mt-1 truncate text-base font-black">{report.biggestFaller.name}</div>
                  <div className="text-xs font-bold text-rose-300">
                    −{Math.abs(report.biggestFaller.places)} Plätze <span className="font-medium text-white/60">({report.biggestFaller.fromRank} → {report.biggestFaller.toRank})</span>
                  </div>
                </div>
              </div>
            ) : null}
            {race ? (
              <div className="min-w-0 rounded-xl border border-violet-400/20 bg-violet-400/10 p-3">
                <div className="break-words text-sm font-black leading-5 text-violet-200">
                  {race.headline}
                </div>
                <p className="mt-1 break-words text-xs font-semibold leading-5 text-white/75">
                  {race.detail}
                </p>
              </div>
            ) : null}
          </div>
          {!report.biggestRiser && !report.biggestFaller ? (
            <p className="mt-3 text-xs text-white/65">Keine größeren Platzveränderungen in der letzten Woche.</p>
          ) : null}
        </>
      ) : (
        <p className="mt-4 text-sm leading-6 text-white/70">
          {!report.hasBaseline
            ? "Für einen echten Vergleich fehlt eine abgeschlossene Einheit vor der Vergleichswoche."
            : "In den letzten sieben Tagen ist noch kein abgeschlossenes Training erfasst."}
        </p>
      )}

      {report.extraHighlight ? (
        <div className="mt-3 flex min-w-0 items-center gap-3 rounded-xl border border-sky-400/20 bg-sky-400/10 p-3">
          {report.extraHighlight.playerId ? (
            <PlayerAvatar name={report.extraHighlight.playerName || report.extraHighlight.text}
              photoUrl={report.extraHighlight.photoUrl} />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-wide text-sky-300">★ {report.extraHighlight.title}</div>
            <p className="mt-1 break-words text-sm font-bold">{report.extraHighlight.text}</p>
            {report.extraHighlight.detail ? (
              <p className="mt-1 break-words text-xs font-semibold leading-5 text-white/70">
                {report.extraHighlight.detail}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <p className="mt-3 break-words text-[10px] leading-4 text-white/45">
        {seasonName} · Vergleich seit {cutoffLabel} nach Trainingsdatum.
        Spätere Ergebniskorrekturen werden berücksichtigt.
        {report.extraHighlight?.kind === "wheel"
          ? " Ein Glücksrad-Ergebnis erlässt oder ersetzt die ursprüngliche Strafe nicht automatisch."
          : ""}
      </p>
      <div className="mt-4 border-t border-white/10 pt-4">
        <button type="button" onClick={() => void onShare()} disabled={sharing}
          className="w-full rounded-xl bg-teal-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-teal-200 disabled:opacity-50">
          {sharing ? "Wochenreport wird erstellt …" : "Wochenreport teilen"}
        </button>
        {message ? <p role="status" className="mt-2 break-words rounded-lg bg-white/10 px-3 py-2 text-xs">{message}</p> : null}
      </div>
    </section>
  );
}
