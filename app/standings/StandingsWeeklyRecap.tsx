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

async function shareRecapFile(file: File, kind: "weekly" | "elfer") {
  const filename = kind === "elfer" ? "strikr-elfer-versemmelt.png" : "strikr-wochenrueckblick.png";
  const title = kind === "elfer" ? "strikr · Elfer versemmelt!" : "strikr · Wochenrückblick";
  if (Capacitor.isNativePlatform()) {
    if (!Capacitor.isPluginAvailable("Share") || !Capacitor.isPluginAvailable("Filesystem")) {
      throw new Error("Bitte die aktuelle App-Version installieren, um die Story zu teilen.");
    }
    const written = await Filesystem.writeFile({
      path: `share/${Date.now()}-${filename}`,
      data: await fileToBase64(file),
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      files: [written.uri],
      title,
      dialogTitle: kind === "elfer" ? "Elfer-Story teilen" : "Wochenrückblick teilen",
    });
    return "shared";
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function"
    && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ files: [file], title });
    return "shared";
  }

  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
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
  const [sharing, setSharing] = useState<"weekly" | "elfer" | null>(null);
  const [message, setMessage] = useState("");
  const hasChanges = report.hasBaseline && report.completedTrainings > 0;
  const cutoffLabel = report.cutoffDate.split("-").reverse().join(".");
  const race = weeklyRaceStory(report);
  const elfer = report.extraHighlight?.kind === "missed_penalty" ? report.extraHighlight : null;
  const onShare = async (kind: "weekly" | "elfer") => {
    if (sharing) return;
    setSharing(kind);
    setMessage("");
    try {
      const params = new URLSearchParams({
        season: selectedSeason,
        lang: locale,
        ts: String(Date.now()),
      });
      if (kind === "elfer") params.set("card", "elfer");
      const filename = kind === "elfer" ? "strikr-elfer-versemmelt.png" : "strikr-wochenrueckblick.png";
      const file = await fetchImageAsFile(
        `/api/share/standings/weekly/image?${params.toString()}`,
        filename,
      );
      const result = await shareRecapFile(file, kind);
      const label = kind === "elfer" ? "Elfer-Story" : "Wochenreport";
      setMessage(label + (result === "shared" ? " geteilt." : " heruntergeladen."));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "Story konnte nicht erstellt werden.");
    } finally {
      setSharing(null);
    }
  };

  return (
    <div className="space-y-3">
      <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 px-3 py-4 text-white shadow-lg sm:rounded-[24px] sm:p-5">
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-teal-300">
          strikr · Wochenrückblick
        </div>
        <h2 className="mt-1.5 break-words text-lg font-black leading-tight tracking-tight sm:text-2xl">
          Was war diese Woche los?
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

      {report.extraHighlight && report.extraHighlight.kind !== "missed_penalty" ? (
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
      {(report.newBadges?.length ?? 0) > 0 ? (
        <section className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/10 p-3" aria-label="Neue Badges dieser Woche">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs font-black uppercase tracking-wide text-amber-200">🏅 Neue Badges diese Woche</h3>
            <span className="rounded-full bg-amber-200/20 px-2 py-1 text-xs font-black text-amber-100">{report.newBadgeCount}</span>
          </div>
          <div className="space-y-2">
            {report.newBadges.map((entry) => (
              <div key={entry.playerId + ":" + entry.badgeKey + ":" + entry.earnedAt}
                className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-slate-900/55 p-2">
                <PlayerAvatar name={entry.playerName} photoUrl={entry.photoUrl}/>
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-black text-white">{entry.playerName}</div>
                  <div className="mt-0.5 break-words text-xs font-semibold text-amber-200">🏆 {entry.badgeTitle}</div>
                </div>
              </div>
            ))}
          </div>
          {report.newBadgeCount > report.newBadges.length ? (
            <p className="mt-2 text-xs font-semibold text-amber-100/80">
              Und {report.newBadgeCount - report.newBadges.length} weitere freigeschaltete {report.newBadgeCount - report.newBadges.length === 1 ? "Auszeichnung" : "Auszeichnungen"}.
            </p>
          ) : null}
        </section>
      ) : null}
      <p className="mt-3 break-words text-[10px] leading-4 text-white/45">
        {seasonName} · Vergleich seit {cutoffLabel} nach Trainingsdatum.
        Spätere Ergebniskorrekturen werden berücksichtigt.
        {report.extraHighlight?.kind === "wheel"
          ? " Ein Glücksrad-Ergebnis erlässt oder ersetzt die ursprüngliche Strafe nicht automatisch."
          : ""}
      </p>
      <div className="mt-4 border-t border-white/10 pt-4">
        <button type="button" onClick={() => void onShare("weekly")} disabled={sharing !== null}
          className="w-full rounded-xl bg-teal-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-teal-200 disabled:opacity-50">
          {sharing === "weekly" ? "Wochenreport wird erstellt …" : "Wochenreport teilen"}
        </button>
        {message ? <p role="status" className="mt-2 break-words rounded-lg bg-white/10 px-3 py-2 text-xs">{message}</p> : null}
      </div>
      </section>
      {elfer ? (
        <section className="w-full min-w-0 overflow-hidden rounded-[26px] border border-sky-400/25 bg-[#091521] text-white shadow-[0_18px_45px_rgba(9,18,50,.23)]"
          aria-label="Separater strikr Elfer-Moment">
          <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_80%_10%,rgba(170,200,220,.13),transparent_55%),linear-gradient(135deg,#08131e,#14283b_70%,#091521)] px-5 pb-6 pt-5 sm:px-7">
            <div className="flex items-center justify-between gap-2">
              <div className="text-base font-black tracking-[-.04em]">strikr</div>
              <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-amber-200">Kabinenmoment</span>
            </div>
            <div className="mt-6 text-xs font-black uppercase tracking-[.26em] text-amber-300">Moments</div>
            <div className="mt-2 text-[clamp(43px,12vw,74px)] font-black leading-[.94] tracking-[-.065em]">
              Verantwortung<br/><span className="text-sky-400">übernommen.</span>
            </div>
            <div className="mt-6 flex items-center gap-4 rounded-[20px] border border-white/15 bg-white/[.07] p-4">
              <div className="shrink-0 rounded-full border-[3px] border-amber-300/70 p-1">
                <PlayerAvatar name={elfer.playerName || "Spieler"} photoUrl={elfer.photoUrl}/>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[.15em] text-white/50">Elfmeter versemmelt. Starker Typ.</div>
                <div className="mt-1 break-words text-xl font-black leading-tight">{elfer.playerName}</div>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-sky-400/15 border border-sky-400/40 px-4 py-3 text-center text-lg font-black tracking-tight text-white">
              {/(?:1\s*kischde|1\s*kiste)/iu.test(elfer.detail ?? "") ? "Kiste Bier trotzdem fällig." : (elfer.detail || "Strafe eingetragen.")}
            </div>
            <div className="mt-4 flex justify-between text-[10px] font-bold tracking-wide text-white/45"><span>@getstrikr</span><span>strikr.team</span></div>
          </div>
          <div className="px-4 pb-4 pt-3 sm:px-6">
            <p className="text-xs leading-5 text-white/60">Ein echter Kabinenmoment. Als eigene 9:16-Story teilen.</p>
            <button type="button" onClick={() => void onShare("elfer")} disabled={sharing !== null}
              className="mt-3 w-full rounded-xl bg-sky-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200 disabled:opacity-50">
              {sharing === "elfer" ? "Elfer-Story wird erstellt …" : "Elfer-Moment separat teilen"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
