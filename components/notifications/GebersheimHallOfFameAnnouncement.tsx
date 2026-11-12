"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function GebersheimHallOfFameAnnouncement({clubId}:{clubId:string}) {
 const key=`strikr:geb-hall-of-fame-launch-2026-11:${clubId}`;
 const [open,setOpen]=useState(false);
 useEffect(()=>{setOpen(window.localStorage.getItem(key)!=="seen");},[key]);
 useEffect(()=>{if(!open)return;const before=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=before;};},[open]);
 function dismiss(){window.localStorage.setItem(key,"seen");setOpen(false);}
 if(!open)return null;
 return <div role="dialog" aria-modal="true" aria-labelledby="geb-hof-title" className="fixed inset-0 z-[1200] flex h-[100dvh] flex-col overflow-hidden bg-slate-950 text-white">
 <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
 <div className="text-lg font-black tracking-tight">strikr <span className="text-amber-300">× SV Gebersheim AG</span></div>
 <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto py-8">
 <div className="mb-5 text-6xl">🏆</div>
 <div className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Neu für eure Mannschaft</div>
 <h2 id="geb-hof-title" className="mt-3 text-4xl font-black leading-tight tracking-tight sm:text-6xl">Eure Hall of Fame ist da!</h2>
 <p className="mt-5 text-lg leading-8 text-white/75">Ab sofort ist die Hall of Fame auch für die Gebersheimer Truppe freigeschaltet. Entdeckt eure Erfolge, sammelt Trophäen und schaut, wer in eurer Mannschaft Geschichte schreibt.</p>
 <div className="mt-7 rounded-2xl border border-white/15 bg-white/5 p-5 text-sm leading-7 text-white/80"><strong className="text-white">Das erwartet euch:</strong> Saison-Badges, persönliche Meilensteine und der Vergleich mit euren Mitspielern. Erweiterte Karriere-Auswertungen gibt es mit PRO.</div>
 </div>
 <div className="shrink-0 space-y-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
 <Link href="/badges" onClick={dismiss} className="flex min-h-14 items-center justify-center rounded-2xl bg-amber-300 px-5 text-sm font-black text-slate-950">Hall of Fame entdecken</Link>
 <button type="button" onClick={dismiss} className="w-full py-3 text-sm font-semibold text-white/70">Später ansehen</button>
 </div></div></div>;
}