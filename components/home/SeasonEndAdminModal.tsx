"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ClipboardCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = { clubId: string; userId: string; seasonId: number; seasonName: string; endDate: string; hasNextSeason: boolean };

export default function SeasonEndAdminModal({ clubId, userId, seasonId, seasonName, endDate, hasNextSeason }: Props) {
  const [ready, setReady] = useState(false);
  const [closed, setClosed] = useState(false);
  const storageKey = ["strikr:season-end-admin:v1", clubId, userId, seasonId, endDate].join(":");
  useEffect(() => {
    try { setClosed(window.localStorage.getItem(storageKey) === "closed"); } catch { setClosed(false); }
    setReady(true);
  }, [storageKey]);
  function close() {
    try { window.localStorage.setItem(storageKey, "closed"); } catch {}
    setClosed(true);
  }
  if (!ready || closed) return null;
  const dateLabel = new Date(endDate + "T12:00:00Z").toLocaleDateString("de-DE", {day:"numeric",month:"long",year:"numeric",timeZone:"Europe/Berlin"});
  return (
    <div role="dialog" aria-modal="true" aria-label="Saisonabschluss vorbereiten"
      className="fixed inset-0 z-[175] overflow-y-auto bg-[radial-gradient(ellipse_at_75%_5%,rgba(125,95,220,.11),transparent_45%),linear-gradient(180deg,#f8fafc,#eef2f8)] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-[calc(30px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))] sm:px-8 sm:pt-9">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/icon-dark.png" alt="strikr" width={38} height={38} className="rounded-xl"/>
            <span className="text-xl font-black tracking-tight">strikr</span>
          </div>
          <button type="button" onClick={close} aria-label="Meldung schließen" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"><X className="h-5 w-5"/></button>
        </div>
        <div className="flex flex-1 flex-col justify-center py-7">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[25px] bg-gradient-to-br from-[#182752] to-[#3d287a] shadow-[0_14px_40px_rgba(56,44,127,.25)]">
            <CalendarDays className="h-10 w-10 text-amber-300"/>
          </div>
          <div className="mt-6 text-center text-[11px] font-black uppercase tracking-[0.2em] text-violet-700">STRIKR · SAISONWECHSEL</div>
          <h1 className="mt-3 text-center text-[30px] font-black leading-[1.1] tracking-[-0.05em]">Eure Saison endet bald.</h1>
          <p className="mt-3 text-center text-sm font-medium text-slate-600">{seasonName} · bis {dateLabel}</p>
          <div className="mt-6 space-y-3">
            <div className="flex gap-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
              <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-700"/>
              <div><div className="text-sm font-black">Saisonabschluss vorbereiten</div><p className="mt-1 text-xs leading-5 text-slate-600">Ergebnisse und Tabelle kontrollieren, bevor die Saison endet.</p></div>
            </div>
            <div className="flex gap-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-violet-700"/>
              <div><div className="text-sm font-black">{hasNextSeason ? "Neue Saison bereits geplant" : "Nächste Saison jetzt planen"}</div><p className="mt-1 text-xs leading-5 text-slate-600">Start, Ende und Trainingstage vorbereiten – die aktuelle Saison läuft normal weiter.</p></div>
            </div>
          </div>
          <Link href="/admin/season-transition" onClick={close} className="mt-6 flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white">
            {hasNextSeason ? "Saisonplanung öffnen" : "Neue Saison planen"}
          </Link>
          <Link href="/standings" onClick={close} className="mt-2 flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700">Tabelle prüfen</Link>
          <button type="button" onClick={close} className="mt-2 rounded-2xl py-3 text-sm font-bold text-slate-500">Später erledigen</button>
        </div>
      </div>
    </div>
  );
}
