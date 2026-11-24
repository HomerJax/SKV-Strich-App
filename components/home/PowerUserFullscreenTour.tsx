"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import ProTrialTransitionNotice, { type ProTrialNoticePhase, type ProTrialNoticeRole } from "@/components/home/ProTrialTransitionNotice";
import ProGiftWelcomeModal from "@/components/home/ProGiftWelcomeModal";
import SeasonEndAdminModal from "@/components/home/SeasonEndAdminModal";

const TOUR_VERSION = "2026-11-24-v1";
const steps: Array<
  | { kind:"trial"; title:string; phase:ProTrialNoticePhase; role:ProTrialNoticeRole }
  | { kind:"gift"; title:string }
  | { kind:"season"; title:string }
> = [
  {kind:"gift", title:"TVN · 28 Tage PRO geschenkt"},
  {kind:"trial",title:"Spieler · 3 Tage vor PRO-Ende",phase:"three_days",role:"player"},
  {kind:"trial",title:"Admin · 3 Tage vor PRO-Ende",phase:"three_days",role:"admin"},
  {kind:"trial",title:"Admin · letzter Tag",phase:"one_day",role:"admin"},
  {kind:"trial",title:"Spieler · nach Wechsel zu Free",phase:"free",role:"player"},
  {kind:"trial",title:"Admin · nach Wechsel zu Free",phase:"free",role:"admin"},
  {kind:"season",title:"Admin · 14 Tage vor Saisonende"},
];

export default function PowerUserFullscreenTour({ userId }: {userId:string}) {
  const [index,setIndex] = useState<number | null>(null);
  const key = "strikr:power-user-fullscreen-tour:"+TOUR_VERSION+":"+userId;
  useEffect(() => {
    try {
      if (window.localStorage.getItem(key) !== "done") setIndex(0);
    } catch { setIndex(0); }
  }, [key]);
  function closeStep() {
    setIndex(current => {
      if (current === null) return null;
      if (current >= steps.length-1) {
        try { window.localStorage.setItem(key,"done"); } catch {}
        return null;
      }
      return current+1;
    });
  }
  function finish() {
    try { window.localStorage.setItem(key,"done"); } catch {}
    setIndex(null);
  }
  function startAgain() {
    try { window.localStorage.removeItem(key); } catch {}
    setIndex(0);
  }
  const step = index !== null ? steps[index] : null;
  return <>
    <button type="button" onClick={startAgain}
      className="flex w-full items-center justify-between gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-left text-sm font-bold text-violet-950">
      <span>🎬 Alle Fullscreen-Meldungen testen</span>
      <span>›</span>
    </button>
    {step && index !== null ? (
      <div className="fixed inset-0 z-[2400] bg-slate-50">
        {step.kind === "trial" ? (
          <ProTrialTransitionNotice key={index}
            clubId="qa-preview" userId={userId} trialEnd="2026-12-22T09:10:15Z"
            role={step.role} phase={step.phase} preview onPreviewClose={closeStep}/>
        ) : step.kind === "gift" ? (
          <ProGiftWelcomeModal key={index} clubId="qa-preview" userId={userId}
            trialEnd="2026-12-22T09:10:15Z" preview onPreviewClose={closeStep}/>
        ) : (
          <SeasonEndAdminModal key={index} clubId="qa-preview" userId={userId}
            seasonId={-1} seasonName="Saison 2026" endDate="2026-12-31"
            hasNextSeason={false} preview onPreviewClose={closeStep}/>
        )}
        <div className="fixed inset-x-0 bottom-0 z-[500] border-t border-slate-200 bg-white/95 px-4 pb-[calc(13px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,.1)]">
          <div className="mx-auto max-w-lg">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black text-slate-900">TEST {index+1} / {steps.length}</span>
              <button type="button" onClick={finish} className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                Tour beenden <X className="h-4 w-4"/>
              </button>
            </div>
            <div className="mt-1 text-xs font-medium text-slate-600">{step.title}</div>
            <button type="button" onClick={closeStep}
              className="mt-2 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              {index === steps.length-1 ? "Tour abschließen" : "Nächste Meldung →"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
  </>;
}
