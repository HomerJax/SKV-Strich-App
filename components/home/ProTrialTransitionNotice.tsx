"use client";

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
    playerBeforeTitle: "Euer PRO-Test endet bald.",
    playerBeforeBody: "Eure Mannschaft kann kostenlos mit strikr Free weitermachen. Einige Extras könnt ihr mit PRO behalten.",
    adminThreeTitle: "Eure PRO-Testphase endet bald.",
    adminOneTitle: "Letzter Tag eurer PRO-Testphase.",
    adminBeforeBody: "Euer Team kann kostenlos mit Free weiterspielen. Möchtet ihr alle PRO-Extras behalten, entscheidet ihr selbst.",
    playerAfterTitle: "Ihr spielt jetzt mit strikr Free.",
    playerAfterBody: "Die wichtigsten Funktionen bleiben kostenlos. Eure bisherigen Daten bleiben erhalten.",
    adminAfterTitle: "Euer Team ist jetzt auf Free.",
    adminAfterBody: "Alles Wichtige bleibt nutzbar und eure Daten sind weiterhin da. Wenn ihr mehr möchtet, könnt ihr PRO jederzeit aktivieren.",
    freeHeader: "Das bleibt kostenlos",
    freeLine: "Zu- und Absagen, faire Teams, Ergebnisse, aktuelle Tabelle und Basis-Statistiken.",
    proHeader: "Mit PRO behaltet ihr zusätzlich",
    proExtras: ["Siegquote & Karriere-Statistiken", "Saisonarchiv & Karriere-Badges", "Turniermodus & bis zu 2 Spiele pro Termin", "Erweiterte Vergleiche und Auswertungen"],
    playerAction: "Sprecht euren Team-Admin an, wenn ihr PRO behalten möchtet.",
    adminCta: "PRO behalten · Tarife ansehen",
    detailCta: "Free und PRO vergleichen",
    noPayment: "Keine automatische Abbuchung. Eure Daten bleiben erhalten.",
    close: "Hinweis schließen",
    expiry: "Danach automatisch Free.",
  },
  en: {
    playerBeforeTitle: "Your PRO trial ends soon.",
    playerBeforeBody: "Your team can continue with strikr Free. You can keep the optional extras with PRO.",
    adminThreeTitle: "Your PRO trial ends soon.",
    adminOneTitle: "Last day of your PRO trial.",
    adminBeforeBody: "Your team can keep playing for free. It's up to you whether to keep PRO extras.",
    playerAfterTitle: "Your team is now on strikr Free.",
    playerAfterBody: "The essentials stay free and your previous data remains available.",
    adminAfterTitle: "Your team is now on Free.",
    adminAfterBody: "The essentials remain available, and your data is retained. You can upgrade any time.",
    freeHeader: "Still free",
    freeLine: "RSVPs, fair teams, results, current standings and basic stats.",
    proHeader: "Keep these extras with PRO",
    proExtras: ["Win rates & career statistics", "Season archive & career badges", "Tournament mode & up to 2 games per session", "Advanced comparisons and insights"],
    playerAction: "Talk to your team admin if you'd like to keep PRO.",
    adminCta: "Keep PRO · See plans",
    detailCta: "Compare Free and PRO",
    noPayment: "No automatic payment. Your data is retained.",
    close: "Dismiss notice",
    expiry: "Then automatically Free.",
  },
} as const;

export default function ProTrialTransitionNotice({
  clubId, userId, trialEnd, role, phase, locale = "de", preview = false,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const key = ["strikr:pro-trial-notice:v1", clubId, userId, trialEnd, role, phase].join(":");
  useEffect(() => {
    if (preview) { setDismissed(false); return; }
    try { setDismissed(window.localStorage.getItem(key) === "dismissed"); }
    catch { setDismissed(false); }
  }, [key, preview]);
  if (dismissed) return null;
  const t = copy[locale];
  const admin = role === "admin";
  const after = phase === "free";
  const title = after
    ? (admin ? t.adminAfterTitle : t.playerAfterTitle)
    : admin ? (phase === "one_day" ? t.adminOneTitle : t.adminThreeTitle) : t.playerBeforeTitle;
  const body = after
    ? (admin ? t.adminAfterBody : t.playerAfterBody)
    : (admin ? t.adminBeforeBody : t.playerBeforeBody);
  const endText = new Date(trialEnd).toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric",
  });

  function dismiss() {
    if (!preview) { try { window.localStorage.setItem(key, "dismissed"); } catch {} }
    setDismissed(true);
  }

  return (
    <section aria-label="PRO-Testphase" className="relative overflow-hidden rounded-[26px] border border-violet-300/25 bg-gradient-to-br from-slate-950 via-[#152758] to-[#31236b] p-4 text-white shadow-[0_12px_28px_-14px_rgba(30,41,94,.65)] sm:p-5">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-400/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">
            <Crown className="h-4 w-4 text-amber-300" />
            {after ? "STRIKR FREE" : "STRIKR PRO · 28 TAGE TEST"}
          </div>
          <button onClick={dismiss} type="button" aria-label={t.close} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/75 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 className="mt-2 pr-6 text-xl font-black tracking-tight sm:text-2xl">{title}</h2>
        <p className="mt-1.5 text-sm leading-6 text-white/75">{body}</p>
        {!after ? (
          <p className="mt-1 text-xs font-semibold text-violet-200">
            {locale === "de" ? "Ende am " : "Ends "} {endText} · {t.expiry}
          </p>
        ) : null}

        <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] p-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-200">
            <Check className="h-4 w-4" /> {t.freeHeader}
          </div>
          <p className="mt-1 text-xs leading-5 text-white/85">{t.freeLine}</p>
        </div>
        {!after && (
          <div className="mt-3 rounded-2xl border border-violet-300/15 bg-white/[0.06] p-3">
            <div className="text-sm font-extrabold text-violet-100">{t.proHeader}</div>
            <div className="mt-2 grid gap-1.5">
              {t.proExtras.map(feature => (
                <div key={feature} className="flex items-start gap-2 text-xs leading-5 text-white/80">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" /> {feature}
                </div>
              ))}
            </div>
          </div>
        )}
        {admin ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {preview ? <span className="inline-flex rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-950">{t.adminCta}</span> : (
              <Link href="/pro" className="inline-flex rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-violet-100">{t.adminCta}</Link>
            )}
            <span className="text-xs text-white/65">{locale === "de" ? "4,99 €/Monat oder 49,99 €/Jahr" : "€4.99/month or €49.99/year"}</span>
          </div>
        ) : (
          <p className="mt-3 text-xs font-semibold leading-5 text-amber-200">{t.playerAction}</p>
        )}
        {!admin && (preview ? (
          <span className="mt-2 inline-block text-xs font-bold text-violet-200 underline">{t.detailCta}</span>
        ) : (
          <Link href="/pro" className="mt-2 inline-block text-xs font-bold text-violet-200 underline">{t.detailCta}</Link>
        ))}
        <p className="mt-3 text-[11px] leading-5 text-white/50">{t.noPayment}</p>
      </div>
    </section>
  );
}
