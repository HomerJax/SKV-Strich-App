"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { X } from "lucide-react";
import { getBadgeDefinition } from "@/lib/badges/catalog";
import { getBadgeVisualMeta } from "@/lib/badges/visual-catalog";

type Props = { badgeKey: string; px: number; grayscale?: boolean; className?: string };
type Ring = { rx: number; ry: number; rotate: number; width: number; opacity: number };
type ArtConfig = { value: number; tier: string; hero: string; glow: string; colors: string[]; rings: Ring[]; badgeSize: number; artwork?: string };

const CONFIG: Record<string, ArtConfig> = {
  career_appearances_10: { value: 10, tier: "Blech", hero: "/badges/hero/blech.webp", glow: "#94a3b8", colors: ["#f8fafc", "#a1a1aa", "#3f3f46", "#09090b", "#d4d4d8"], rings: [{ rx: 176, ry: 82, rotate: -9, width: 22, opacity: .94 }], badgeSize: 272 },
  career_appearances_25: { value: 25, tier: "Bronze", hero: "/badges/hero/bronze.webp", glow: "#f97316", colors: ["#ffedd5", "#fb923c", "#9a3412", "#431407", "#fdba74"], rings: [{ rx: 176, ry: 82, rotate: -9, width: 22, opacity: 1 }], badgeSize: 276 },
  career_appearances_50: { value: 50, tier: "Silber", hero: "/badges/hero/silber.webp", glow: "#bfdbfe", colors: ["#fff", "#e2e8f0", "#94a3b8", "#475569", "#f8fafc"], rings: [{ rx: 178, ry: 83, rotate: -9, width: 22, opacity: 1 }], badgeSize: 280 },
  career_appearances_100: { value: 100, tier: "Gold", hero: "/badges/hero/gold.webp", glow: "#facc15", colors: ["#fff7c2", "#fde047", "#ca8a04", "#713f12", "#fef08a"], rings: [], badgeSize: 288, artwork: "/badges/career-appearances-100-gold.png" },
  career_appearances_250: { value: 250, tier: "Legendär", hero: "/badges/hero/goat.webp", glow: "#a855f7", colors: ["#67e8f9", "#60a5fa", "#8b5cf6", "#ec4899", "#fb7185", "#facc15"], rings: [{ rx:184, ry:82, rotate:-10, width:21, opacity:1 }, { rx:169, ry:101, rotate:15, width:17, opacity:.86 }], badgeSize:304 },
  career_appearances_500: { value: 500, tier: "GOAT", hero: "/badges/hero/goat.webp", glow: "#22d3ee", colors: ["#22d3ee", "#2563eb", "#7c3aed", "#ec4899", "#fb7185", "#facc15", "#2dd4bf"], rings: [{ rx:190, ry:84, rotate:-10, width:22, opacity:1 }, { rx:175, ry:105, rotate:15, width:18, opacity:.92 }, { rx:160, ry:121, rotate:-22, width:15, opacity:.78 }], badgeSize:322 },
};

function CareerArtwork({ badgeKey, className = "" }: { badgeKey: string; className?: string }) {
  const c = CONFIG[badgeKey];
  const uid = useId().replace(/:/g, "");
  if (!c) return null;
  if (c.artwork) return <img src={c.artwork} alt={`${c.value} Einsätze · ${c.tier}`} className={`h-full w-full object-cover ${className}`} />;
  const metalId=`metal-${uid}`, glowId=`glow-${uid}`, shadowId=`shadow-${uid}`;
  const badgeXY=(480-c.badgeSize)/2;
  return <svg viewBox="0 0 480 480" className={className} role="img" aria-label={`${c.value} Einsätze · ${c.tier}`}>
    <defs>
      <radialGradient id={glowId}><stop offset="0%" stopColor={c.glow} stopOpacity=".48"/><stop offset="100%" stopColor="#020617" stopOpacity="0"/></radialGradient>
      <linearGradient id={metalId}>{c.colors.map((color,i)=><stop key={color+i} offset={`${i/(c.colors.length-1)*100}%`} stopColor={color}/>)}</linearGradient>
      <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000" floodOpacity=".6"/></filter>
    </defs>
    <rect width="480" height="480" fill={`url(#${glowId})`}/>
    {c.rings.map((r,i)=><ellipse key={i} cx="240" cy="240" rx={r.rx} ry={r.ry} fill="none" stroke={`url(#${metalId})`} strokeWidth={r.width} opacity={r.opacity} transform={`rotate(${r.rotate} 240 240)`} filter={`url(#${shadowId})`}/>) }
    <image href={c.hero} x={badgeXY} y={badgeXY-4} width={c.badgeSize} height={c.badgeSize} preserveAspectRatio="xMidYMid meet" filter={`url(#${shadowId})`}/>
  </svg>;
}

export default function CareerAppearanceArtwork({ badgeKey, px, grayscale=false, className="" }: Props) {
  const [open,setOpen]=useState(false); const c=CONFIG[badgeKey];
  const definition=useMemo(()=>getBadgeDefinition(badgeKey),[badgeKey]); const visual=useMemo(()=>getBadgeVisualMeta(badgeKey),[badgeKey]);
  useEffect(()=>{ if(!open)return; const prev=document.body.style.overflow; document.body.style.overflow="hidden"; const key=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false)}; window.addEventListener("keydown",key); return()=>{document.body.style.overflow=prev;window.removeEventListener("keydown",key)} },[open]);
  if(!c)return null;
  const renderedPreview = Boolean(c.artwork);
  return <>
    <button type="button" onClick={()=>!grayscale&&setOpen(true)} className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border-0 bg-transparent p-0 ${grayscale?"cursor-default":"cursor-zoom-in"} ${className}`} style={{width:px,height:px}} aria-label={`${definition?.title??badgeKey} groß anzeigen`}>
      {renderedPreview ? (
        <div className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[22%] ${grayscale?"grayscale opacity-45":""}`}>
          <img
            src={c.artwork}
            alt={`${c.value} Einsätze · ${c.tier}`}
            className="absolute left-1/2 top-1/2 block max-w-none"
            style={{ width: "166%", height: "auto", transform: "translate(-50%, -43%)" }}
          />
        </div>
      ) : (
        <span className={`pointer-events-none block ${grayscale?"grayscale opacity-45":""}`} style={{width:px*1.72,height:px*1.72}}><CareerArtwork badgeKey={badgeKey} className="h-full w-full"/></span>
      )}
    </button>
    {open?<div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 p-0 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={definition?.title??badgeKey} onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false)}}>
      <button type="button" onClick={()=>setOpen(false)} className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur" aria-label="Vollbild schließen"><X className="h-5 w-5"/></button>
      {c.artwork?<img src={c.artwork} alt={`${c.value} Einsätze · ${c.tier}`} className="max-h-[100dvh] max-w-full object-contain"/>:<div className="flex max-h-[92dvh] w-full max-w-3xl flex-col items-center overflow-y-auto rounded-[32px] border border-white/10 bg-slate-950 px-5 pb-7 pt-8 text-center"><div className="text-[10px] font-black uppercase tracking-[.32em] text-white/40">Hall of Fame · Karriere · Einsätze</div><div className="mt-1 text-sm font-black uppercase tracking-[.18em] text-white/65">{c.tier}</div><div className="mt-2 aspect-square w-full max-w-[560px]"><CareerArtwork badgeKey={badgeKey} className="h-full w-full"/></div><div className="-mt-5 text-5xl font-black text-white">{c.value}</div><div className="mt-1 text-xs font-black uppercase tracking-[.34em] text-white/60">Einsätze</div>{definition?.description?<p className="mt-4 text-sm text-white/55">{definition.description}</p>:null}<p className="mt-2 text-xs text-white/35">{visual.motifLabel}</p></div>}
    </div>:null}
  </>;
}
