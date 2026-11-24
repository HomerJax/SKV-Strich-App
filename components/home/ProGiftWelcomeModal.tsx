"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Gift, X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = { clubId: string; userId: string; trialEnd: string; locale?: "de" | "en" };

export default function ProGiftWelcomeModal({ clubId, userId, trialEnd, locale = "de" }: Props) {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const key = ["strikr:pro-gift:v1", clubId, userId, trialEnd].join(":");
  useEffect(() => {
    try { setDismissed(window.localStorage.getItem(key) === "seen"); }
    catch { setDismissed(false); }
    setReady(true);
  }, [key]);

  if (!ready || dismissed) return null;
  const de = locale === "de";
  const ends = new Date(trialEnd).toLocaleDateString(de ? "de-DE" : "en-GB", {
    timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric",
  });
  function dismiss() {
    try { window.localStorage.setItem(key, "seen"); } catch {}
    setDismissed(true);
  }

  return (
    <div className="fixed inset-0 z-[160] overflow-y-auto bg-[radial-gradient(ellipse_at_75%_5%,rgba(125,95,220,.11),transparent_45%),linear-gradient(180deg,#f8fafc,#eef2f8)] text-slate-950" role="dialog" aria-modal="true" aria-label={de ? "28 Tage PRO geschenkt" : "28 days of PRO free"}>
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-[calc(30px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))] sm:px-8 sm:pt-9">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/icon-dark.png" alt="strikr" width={38} height={38} className="rounded-xl"/>
            <span className="text-xl font-black tracking-tight">strikr</span>
          </div>
          <button onClick={dismiss} type="button" aria-label={de ? "Schließen" : "Close"} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"><X className="h-5 w-5"/></button>
        </div>

        <div className="flex flex-1 flex-col justify-center py-7 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[25px] bg-gradient-to-br from-[#182752] to-[#3d287a] shadow-[0_14px_40px_rgba(56,44,127,.25)]">
            <Gift className="h-10 w-10 text-amber-300" />
          </div>
          <div className="mt-6 text-[11px] font-black uppercase tracking-[0.2em] text-violet-700">STRIKR PRO · {de ? "GESCHENK" : "GIFT"}</div>
          <h1 className="mt-3 text-[34px] font-black leading-[1.1] tracking-[-0.05em] sm:text-4xl">{de ? "28 Tage PRO. Für euch!" : "28 days of PRO. On us!"}</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-slate-600">{de ? "TVN kann ab sofort alle PRO-Extras kostenlos ausprobieren." : "TVN can now try all PRO features for free."}</p>
          <div className="mt-6 rounded-[24px] border border-violet-200 bg-white p-5 text-left shadow-sm">
            <div className="text-sm font-black">{de ? "Jetzt für euer Team freigeschaltet" : "Now unlocked for your team"}</div>
            <div className="mt-3 space-y-3">
              {(de ? ["Karriere-Stats & Siegquoten", "Saisons, Badges & Historie", "Turniere & mehr Flexibilität"] : ["Career stats & win rates", "Seasons, badges & history", "Tournaments & extra flexibility"]).map(item => (
                <div key={item} className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
                  <Check className="h-4 w-4 shrink-0 text-violet-600"/>{item}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-5 text-sm font-bold text-violet-800">{de ? "Kostenlos bis " : "Free until "}{ends}</p>
          <p className="mt-1 text-xs text-slate-500">{de ? "Danach automatisch Free. Ohne Abo oder Zahlung." : "Then automatically Free. No subscription or payment."}</p>
          <button onClick={dismiss} className="mt-6 flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white">
            {de ? "PRO entdecken" : "Explore PRO"}
          </button>
          <Link href="/pro" onClick={dismiss} className="mt-3 py-2 text-xs font-bold text-violet-700 underline">{de ? "Free und PRO vergleichen" : "Compare Free and PRO"}</Link>
        </div>
      </div>
    </div>
  );
}
