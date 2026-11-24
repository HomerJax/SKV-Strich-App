"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Crown, X } from "lucide-react";
import { useEffect, useState } from "react";

export type ProTrialNoticePhase = "three_days" | "one_day" | "free";
export type ProTrialNoticeRole = "admin" | "player";

type Props = {
  clubId: string;
  userId: string;
  trialEnd: string;
  role: ProTrialNoticeRole;
  phase: ProTrialNoticePhase;
  locale?: "de" | "en";
  preview?: boolean;
};

const copy = {
  de: {
    title: {
      three_days: "Eure PRO-Zeit endet bald.",
      one_day: "Letzter Tag mit PRO.",
      free: "Ihr kickt jetzt mit Free.",
    },
    intro: "Free bleibt. Die Extras könnt ihr behalten.",
    after: "Eure Daten bleiben. Alle Basis-Funktionen auch.",
    freeTitle: "Mit Free bleibt",
    freeText: "Zusagen · faire Teams · Ergebnisse · Basis-Stats",
    proTitle: "Mit PRO behaltet ihr",
    proItems: ["Siegquote & Karriere-Stats", "Saisonarchiv & Badges", "Turniere & zweites Spiel"],
    sponsor: "Jeder Spieler kann PRO fürs Team übernehmen.",
    adminSponsor: "Ein Spieler oder Admin kann PRO fürs Team übernehmen.",
    cta: "PRO fürs Team sichern",
    ctaAfter: "PRO freischalten",
    close: "Meldung schließen",
    later: "Weiter mit Free",
    noCharge: "Ohne Buchung kostenlos weiter. Keine automatische Zahlung.",
    on: "Bis",
    readMore: "Free und PRO vergleichen",
  },
  en: {
    title: {
      three_days: "Your PRO trial ends soon.",
      one_day: "Last day with PRO.",
      free: "Your team is now on Free.",
    },
    intro: "Free stays. You can keep the extras.",
    after: "Your data and core features stay.",
    freeTitle: "Still free",
    freeText: "RSVPs · fair teams · results · basic stats",
    proTitle: "Keep with PRO",
    proItems: ["Win rate & career stats", "Season archive & badges", "Tournaments & second game"],
    sponsor: "Any player can sponsor PRO for the team.",
    adminSponsor: "Any team member can sponsor PRO.",
    cta: "Keep PRO for your team",
    ctaAfter: "Activate PRO",
    close: "Dismiss",
    later: "Continue on Free",
    noCharge: "Free unless purchased. No automatic payment.",
    on: "Until",
    readMore: "Compare Free and PRO",
  },
} as const;

export default function ProTrialTransitionNotice({
  clubId, userId, trialEnd, role, phase, locale = "de", preview = false,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const key = ["strikr:pro-trial-fullscreen:v2", clubId, userId, trialEnd, role, phase].join(":");
  useEffect(() => {
    if (preview) { setDismissed(false); return; }
    try { setDismissed(window.localStorage.getItem(key) === "dismissed"); }
    catch { setDismissed(false); }
  }, [key, preview]);

  if (dismissed) return null;
  const t = copy[locale];
  const after = phase === "free";
  const endText = new Date(trialEnd).toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric",
  });
  const showProExtras = !after;
  function dismiss() {
    if (!preview) { try { window.localStorage.setItem(key, "dismissed"); } catch {} }
    setDismissed(true);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={t.title[phase]}
      className="fixed inset-0 z-[150] overflow-y-auto bg-[radial-gradient(ellipse_at_75%_5%,rgba(125,95,220,.11),transparent_45%),linear-gradient(180deg,#f8fafc,#eef2f8)] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-[calc(30px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))] sm:px-8 sm:pt-9">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/icon-dark.png" alt="strikr" width={38} height={38} className="rounded-xl" />
            <span className="text-xl font-black tracking-tight">strikr</span>
          </div>
          <button type="button" onClick={dismiss} aria-label={t.close}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center py-7">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#182752] to-[#3d287a] text-white shadow-[0_12px_32px_rgba(56,44,127,.24)]">
            <Crown className="h-8 w-8 text-amber-300" />
          </div>
          <div className="mt-5 text-center text-[11px] font-black uppercase tracking-[0.20em] text-violet-700">
            {after ? "STRIKR FREE" : "STRIKR PRO · 28 TAGE TEST"}
          </div>
          <h1 className="mx-auto mt-2 max-w-sm text-center text-[29px] font-black leading-tight tracking-[-0.045em] sm:text-4xl">{t.title[phase]}</h1>
          <p className="mt-2 text-center text-sm font-medium text-slate-600">{after ? t.after : t.intro}</p>
          {!after && <p className="mt-1 text-center text-xs font-bold text-violet-700">{t.on} {endText}</p>}

          <div className="mt-6 space-y-3">
            <section className="rounded-[22px] border border-emerald-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[15px] font-black text-slate-950">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><Check className="h-4 w-4"/></span>
                {t.freeTitle}
              </div>
              <p className="mt-1 pl-9 text-[13px] font-medium leading-5 text-slate-600">{t.freeText}</p>
            </section>
            {showProExtras && (
              <section className="rounded-[22px] border border-violet-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-[15px] font-black text-slate-950">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Crown className="h-4 w-4"/></span>
                  {t.proTitle}
                </div>
                <div className="mt-2 space-y-1.5 pl-9">
                  {t.proItems.map(item => <div key={item} className="flex items-center gap-2 text-[13px] font-semibold text-slate-700"><Check className="h-3.5 w-3.5 shrink-0 text-violet-600"/>{item}</div>)}
                </div>
              </section>
            )}
          </div>

          <p className="mt-5 text-center text-[13px] font-semibold text-slate-700">
            {role === "admin" ? t.adminSponsor : t.sponsor}
          </p>
          {preview ? (
            <div className="mt-4 flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white">
              {after ? t.ctaAfter : t.cta}
            </div>
          ) : (
            <Link href="/pro" onClick={dismiss}
              className="mt-4 flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-slate-800">
              {after ? t.ctaAfter : t.cta}
            </Link>
          )}
          <button onClick={dismiss} type="button" className="mt-2.5 rounded-2xl py-3 text-sm font-bold text-slate-500 hover:bg-slate-100">{t.later}</button>
          <p className="mt-2 text-center text-[11px] leading-5 text-slate-500">{t.noCharge}</p>
        </div>
      </div>
    </div>
  );
}
