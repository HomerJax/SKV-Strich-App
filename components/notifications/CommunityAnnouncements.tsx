"use client";

import { useEffect, useState } from "react";
import { Instagram, X, Beer, Trophy } from "lucide-react";

// Flip only after the beer feature has been explicitly released to all clubs.
// The club's own beerkasse_enabled setting remains opt-in.
const BEER_ANNOUNCEMENT_RELEASED = true;
const BEER_KEY = "strikr:announcement:beer-rollout-2026-11";
const INSTAGRAM_KEY = "strikr:announcement:instagram-getstrikr-2026-11";

type Notice = "beer" | "instagram";
export default function CommunityAnnouncements({ clubId }: { clubId: string }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => {
    const beerKey = `${BEER_KEY}:${clubId}`;
    const instaKey = `${INSTAGRAM_KEY}:${clubId}`;
    if (BEER_ANNOUNCEMENT_RELEASED && localStorage.getItem(beerKey) !== "seen") setNotice("beer");
    else if (localStorage.getItem(instaKey) !== "seen") setNotice("instagram");
  }, [clubId]);
  useEffect(() => {
    if (!notice) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [notice]);
  function close() {
    if (!notice) return;
    localStorage.setItem(`${notice === "beer" ? BEER_KEY : INSTAGRAM_KEY}:${clubId}`, "seen");
    if (notice === "beer" && localStorage.getItem(`${INSTAGRAM_KEY}:${clubId}`) !== "seen") setNotice("instagram");
    else setNotice(null);
  }
  if (!notice) return null;
  const beer = notice === "beer";
  return <div role="dialog" aria-modal="true" aria-labelledby="community-notice-title" className="fixed inset-0 z-[1400] flex min-h-[100dvh] flex-col overflow-y-auto bg-[#030d16] text-white">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_95%_0%,rgba(52,127,165,0.26),transparent_50%)]"/>
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <div className="flex items-center justify-between"><span className="text-sm font-black tracking-tight">strikr<span className="text-[#00b6fe]">.</span></span><button type="button" onClick={close} aria-label="Schließen" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10"><X size={22}/></button></div>
      <div className="flex flex-1 flex-col justify-center py-12">
        <div className="mb-5 text-xs font-extrabold uppercase tracking-[0.23em] text-[#00b6fe]">{beer ? "Optional für eure Mannschaft" : "Mehr von strikr"}</div>
        <h1 id="community-notice-title" className="text-[clamp(2.6rem,10vw,4rem)] font-black italic leading-[1.04] tracking-tight">{beer ? "Die Bierkasse" : "Bleib am Ball"}<span className="text-[#00b6fe]">.</span></h1>
        <p className="mt-3 text-xl italic text-white/85">{beer ? "Für euren Kreisliga-Moment." : "Folge strikr auf Instagram."}</p>
        <div className="mt-7 h-1.5 w-32 rounded-full bg-[#00b6fe]"/>
        {beer ? <div className="mt-12 space-y-5">
          <div className="flex items-center gap-4"><Beer className="shrink-0 text-[#00b6fe]" size={30}/><p className="text-lg">Bier direkt über die App bezahlen.</p></div>
          <div className="flex items-center gap-4"><Trophy className="shrink-0 text-[#00b6fe]" size={30}/><p className="text-lg">Die Bier-Rangliste entdecken.</p></div>
          <p className="mt-7 rounded-2xl border border-[#00b6fe]/30 bg-[#00b6fe]/10 p-5 text-base leading-7"><strong>Sprecht eure Team-Admins an,</strong> damit sie die Bierkasse für euren Verein aktivieren.</p>
        </div> : <div className="mt-12"><Instagram size={48} className="text-[#00b6fe]"/><p className="mt-5 text-lg leading-8 text-white/80">Neue Features, Einblicke hinter die Kulissen und echte Momente aus den Teams. Ohne Bier-Dauerwerbung. 😉</p><p className="mt-5 text-2xl font-black">@getstrikr</p></div>}
      </div>
      {beer ? <button type="button" onClick={close} className="min-h-14 rounded-2xl bg-[#00b6fe] px-5 font-black text-slate-950">Verstanden</button> : <a href="https://www.instagram.com/getstrikr/" target="_blank" rel="noopener noreferrer" onClick={close} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#00b6fe] px-5 font-black text-slate-950"><Instagram size={20}/> Auf Instagram folgen</a>}
      <button type="button" onClick={close} className="mt-3 min-h-11 text-sm font-semibold text-white/65">Schließen</button>
    </div>
  </div>;
}
