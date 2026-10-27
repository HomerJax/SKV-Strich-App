"use client";

import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { fetchImageAsFile } from "@/lib/share/utils";
import type { WeeklyReport } from "@/lib/standings/weekly-report";
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

export default function StandingsWeeklyRecap({ report, selectedSeason, seasonName }: Props) {
  const { locale } = useI18n();
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const hasChanges = report.hasBaseline && report.completedTrainings > 0;
  const cutoffLabel = report.cutoffDate.split("-").reverse().join(".");
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
      setMessage(result === "shared" ? "Story geteilt." : "Story-Bild heruntergeladen.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "Story konnte nicht erstellt werden.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-800 bg-slate-950 p-4 text-white shadow-lg sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-300">strikr · Wochenrückblick</div>
          <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">Was hat sich in der Tabelle getan?</h2>
          <p className="mt-1 text-xs text-white/55">{seasonName} · Vergleich mit Trainingsterminen vor dem {cutoffLabel}</p>
        </div>
        <button type="button" onClick={() => void onShare()} disabled={sharing}
          className="rounded-xl bg-teal-300 px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-teal-200 disabled:opacity-50">
          {sharing ? "Story wird erstellt …" : "Wochen-Story teilen ↗"}
        </button>
      </div>

      {hasChanges && (report.biggestRiser || report.biggestFaller) ? (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {report.biggestRiser ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">↑ Größter Aufstieg</div>
              <div className="mt-1 truncate text-lg font-black">{report.biggestRiser.name}</div>
              <div className="mt-1 text-sm font-bold text-emerald-300">+{report.biggestRiser.places} Plätze <span className="text-xs text-white/60">({report.biggestRiser.fromRank} → {report.biggestRiser.toRank})</span></div>
            </div>
          ) : null}
          {report.biggestFaller ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-rose-300">↓ Größter Abstieg</div>
              <div className="mt-1 truncate text-lg font-black">{report.biggestFaller.name}</div>
              <div className="mt-1 text-sm font-bold text-rose-300">−{Math.abs(report.biggestFaller.places)} Plätze <span className="text-xs text-white/60">({report.biggestFaller.fromRank} → {report.biggestFaller.toRank})</span></div>
            </div>
          ) : null}
        </div>
      ) : null}

      {report.headlines.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {report.headlines
            .filter((headline) => !headline.startsWith("Aufsteiger:") && !headline.startsWith("Absteiger:"))
            .map((headline) => (
              <p key={headline} className="rounded-xl bg-white/[0.07] px-3 py-2.5 text-sm font-semibold text-white/90">
                {headline.startsWith("Saisonfinale:") ? "🏁 " : "🏆 "}{headline}
              </p>
            ))}
        </div>
      ) : null}

      {!report.hasBaseline ? (
        <p className="mt-4 text-sm text-white/70">Für einen echten Vergleich fehlt noch eine abgeschlossene Trainingseinheit vor der Vergleichswoche.</p>
      ) : report.completedTrainings === 0 ? (
        <p className="mt-4 text-sm text-white/70">In den letzten sieben Tagen ist noch kein abgeschlossenes Training erfasst.</p>
      ) : report.headlines.length === 0 ? (
        <p className="mt-4 text-sm text-white/70">Keine größeren Tabellenbewegungen in dieser Woche.</p>
      ) : null}

      <p className="mt-3 text-[10px] leading-4 text-white/40">
        Vergleich nach Trainingsdatum, keine gespeicherten historischen Screenshots. Spätere Ergebniskorrekturen werden rückwirkend berücksichtigt.
      </p>
      {message ? <p role="status" className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs">{message}</p> : null}
    </section>
  );
}
