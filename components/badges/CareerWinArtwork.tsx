"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { getBadgeDefinition } from "@/lib/badges/catalog";

type Props = { badgeKey: string; px: number; grayscale?: boolean; className?: string };
type WinConfig = { value: number; tier: string; artwork: string };

const CONFIG: Record<string, WinConfig> = {
  career_wins_1: { value: 1, tier: "Blech", artwork: "/badges/career-wins-1-blech.png" },
  career_wins_10: { value: 10, tier: "Bronze", artwork: "/badges/career-wins-10-bronze.png" },
  career_wins_25: { value: 25, tier: "Silber", artwork: "/badges/career-wins-25-silver.png" },
  career_wins_50: { value: 50, tier: "Gold", artwork: "/badges/career-wins-50-gold.png" },
  career_wins_100: { value: 100, tier: "Legende", artwork: "/badges/career-wins-100-legend.png" },
  career_wins_250: { value: 250, tier: "GOAT", artwork: "/badges/career-wins-250-goat.png" },
};

export default function CareerWinArtwork({ badgeKey, px, grayscale=false, className="" }: Props) {
  const [open,setOpen]=useState(false);
  const c=CONFIG[badgeKey];
  const definition=useMemo(()=>getBadgeDefinition(badgeKey),[badgeKey]);

  useEffect(()=>{
    if(!open)return;
    const prev=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const key=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false)};
    window.addEventListener("keydown",key);
    return()=>{document.body.style.overflow=prev;window.removeEventListener("keydown",key)};
  },[open]);

  if(!c)return null;

  return <>
    <button type="button" onClick={()=>!grayscale&&setOpen(true)} className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border-0 bg-transparent p-0 ${grayscale?"cursor-default":"cursor-zoom-in"} ${className}`} style={{width:px,height:px}} aria-label={`${definition?.title??badgeKey} groß anzeigen`}>
      <div className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[22%] ${grayscale?"grayscale opacity-45":""}`}>
        <img src={c.artwork} alt={`${c.value} Siege · ${c.tier}`} className="absolute left-1/2 top-1/2 block max-w-none" style={{width:"166%",height:"auto",transform:"translate(-50%, -43%)"}} />
      </div>
    </button>
    {open?<div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 p-0 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={definition?.title??badgeKey} onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false)}}>
      <button type="button" onClick={()=>setOpen(false)} className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur" aria-label="Vollbild schließen"><X className="h-5 w-5"/></button>
      <img src={c.artwork} alt={`${c.value} Siege · ${c.tier}`} className="max-h-[100dvh] max-w-full object-contain"/>
    </div>:null}
  </>;
}
