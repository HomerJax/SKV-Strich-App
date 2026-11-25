import { requirePowerUser } from "@/lib/auth/power-user";

export const dynamic = "force-dynamic";

function Celebration({ x, flip = false }: { x: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} 0) scale(${flip ? -1 : 1} 1)`} fill="none" stroke="#c7d3df" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity=".8">
      <g><circle cx="0" cy="188" r="10"/><path d="M-10 204 L-13 254 M10 204 L13 254 M-11 211 L-32 179 L-39 159 M11 211 L29 180 L34 158 M-12 254 L-20 285 M13 254 L23 284"/></g>
      <g transform="translate(48 18)" opacity=".66"><circle cx="0" cy="188" r="9"/><path d="M-10 204 L-11 254 M10 204 L11 254 M-9 215 L-31 195 L-32 164 M9 215 L28 195 L31 176 M-11 254 L-19 281 M11 254 L20 281"/></g>
      <g transform="translate(90 9)" opacity=".72"><circle cx="0" cy="188" r="9"/><path d="M-10 204 L-12 254 M10 204 L12 254 M-10 215 L-28 185 L-31 163 M10 215 L31 187 L34 163 M-12 254 L-20 283 M12 254 L20 283"/></g>
    </g>
  );
}

function PenaltyScene() {
  return (
    <svg viewBox="0 0 820 530" role="img" aria-label="Nach dem Elfmeter: Der Schütze steht am Elfmeterpunkt. Der Ball liegt deutlich rechts neben dem Tor; die Mitspieler jubeln." className="w-full overflow-visible">
      <defs>
        <linearGradient id="pitch" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#1a2b3c" stopOpacity=".05"/><stop offset="1" stopColor="#526c80" stopOpacity=".27"/></linearGradient>
        <linearGradient id="post" x1="0" x2="1"><stop stopColor="#dbe8f3"/><stop offset="1" stopColor="#7c94a8"/></linearGradient>
      </defs>
      <path d="M0 304 H820 V530 H0 Z" fill="url(#pitch)"/>
      <g opacity=".15" stroke="#9eafbf" strokeWidth="1"><path d="M0 376 H820 M0 416 H820 M0 468 H820"/><path d="M410 304 L42 530 M410 304 L778 530"/></g>
      <Celebration x={45}/><Celebration x={777} flip/>
      <g fill="none" stroke="#8ca5b7" strokeWidth="1.6" opacity=".47">
        {Array.from({length:13},(_,i)=><path key={i} d={`M${263+i*24} 173 L${263+i*24} 307`}/>)}
        {Array.from({length:8},(_,i)=><path key={i} d={`M263 ${177+i*18} H551`}/>)}
      </g>
      <path d="M260 308 V171 H553 V308" fill="none" stroke="url(#post)" strokeWidth="9" strokeLinejoin="round"/>
      <path d="M268 309 H545" stroke="#667c8c" strokeWidth="2"/>
      {/* One quiet, anatomically simple keeper silhouette, not an action pose. */}
      <g fill="#101b27" stroke="#b9cbd8" strokeWidth="2.7" strokeLinejoin="round">
        <circle cx="407" cy="236" r="11"/>
        <path d="M395 250 Q407 246 419 250 L426 280 L417 286 L397 286 L389 280 Z"/>
        <path d="M394 258 L373 277 L370 291 M420 258 L441 277 L443 291" fill="none" strokeWidth="7" strokeLinecap="round"/>
        <path d="M398 283 L389 307 M416 283 L427 307" fill="none" strokeWidth="8" strokeLinecap="round"/>
      </g>
      {/* The real penalty spot is directly in front of goal; shooter has already struck. */}
      <path d="M185 444 Q408 406 635 444" fill="none" stroke="#70889b" strokeWidth="2" opacity=".48"/>
      <ellipse cx="399" cy="441" rx="8" ry="3" fill="#e5eff7"/>
      <g fill="#101923" stroke="#d6e5ee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="397" cy="344" r="15"/>
        <path d="M379 363 Q397 356 414 363 L424 401 L414 414 L381 414 L371 401 Z"/>
        {/* Hands on head: readable regret, no anatomically implausible kicking leg. */}
        <path d="M375 372 L348 353 L367 326 L383 333 M419 372 L444 351 L426 326 L412 332" fill="none" strokeWidth="10"/>
        <path d="M385 412 L379 443 L371 464 M410 412 L415 443 L425 464" fill="none" strokeWidth="11"/>
      </g>
      <text x="397" y="391" fontSize="25" fill="#f1f6fa" fontWeight="700" textAnchor="middle">9</text>
      <path d="M506 335 Q584 325 664 299" fill="none" stroke="#a6becf" strokeWidth="2.5" strokeDasharray="7 10" opacity=".75"/>
      <g transform="translate(680 293)" fill="none" stroke="#ecf4f8" strokeWidth="2.4"><circle r="13" fill="#0d1a25"/><path d="M-5 -2 L0 -7 L6 -3 L4 5 L-4 6 L-8 0 Z M-12 -3 L-6 -10 M9 -8 L12 0 M-5 10 L3 12"/></g>
      <path d="M716 274 L726 260 M727 285 L744 280" stroke="#f1f8fc" strokeWidth="4" strokeLinecap="round"/>
      <path d="M0 474 H820" stroke="#c4d4df" strokeWidth="2" opacity=".43"/>
    </svg>
  );
}

function BeerCrate() {
  return (
    <svg viewBox="0 0 110 95" aria-hidden="true" className="h-16 w-20 shrink-0">
      <g fill="none" stroke="#e6f1f7" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 33 L58 16 L99 31 L52 50 Z M12 33 V74 L52 91 V50 M52 91 L99 72 V31"/>
        <path d="M20 54 L31 59 V65 L20 60 Z"/>
        <path d="M41 24 V14 L45 11 V6 H51 V11 L55 14 V19 M60 21 V10 L64 8 V3 H70 V8 L74 11 V24 M79 26 V16 L83 13 V8 H89 V13 L92 16 V29" />
        <path d="M61 59 l4 7 l8 -14 M69 70 l4 7 l8 -14" stroke="#20a8f8" strokeWidth="3"/>
      </g>
    </svg>
  );
}

export default async function Page() {
  await requirePowerUser();
  return (
    <main className="min-h-screen bg-[#081018] px-3 py-8 text-white">
      <div className="mx-auto max-w-[440px]">
        <div className="mb-4 text-center text-xs text-slate-400">strikr Moments · Entwurf · Nur Power User</div>
        <article className="relative aspect-[9/16] w-full overflow-hidden rounded-[22px] border border-white/10 bg-[#08121d] shadow-2xl" aria-label="Instagram-Story-Vorschau: Elfmeter verschossen">
          <div className="pointer-events-none absolute inset-0" style={{background:"radial-gradient(ellipse at 84% 5%, rgba(148,174,195,.22), transparent 30%), linear-gradient(180deg,#07111b 0%,#101b29 49%,#060e16 100%)"}}/>
          <div className="relative flex h-full flex-col px-[8%] pb-[11%] pt-[9%]">
            <header className="shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[clamp(19px,5vw,34px)] font-black tracking-tighter leading-none" aria-hidden="true">╱╱╱╱╱</span>
                <span className="text-[clamp(26px,7vw,44px)] font-extrabold leading-none tracking-tight">strikr</span>
              </div>
              <div className="mt-3 h-[5px] w-28 rounded-full bg-[#0da5f7]"/>
              <div className="mt-2 text-[clamp(17px,5vw,27px)] font-light tracking-wide">Moments</div>
            </header>
            <section className="mt-[5%] min-h-0 flex-1">
              <PenaltyScene/>
            </section>
            <section className="relative shrink-0">
              <h1 className="text-[clamp(28px,8vw,48px)] font-black leading-[.99] tracking-tight">Verantwortung<br/>übernommen<span className="text-[#0da5f7]">.</span></h1>
              <p className="mt-3 text-[clamp(13px,3.3vw,19px)] leading-snug">Elfmeter versemmelt. <strong>Starker Typ.</strong></p>
              <div className="mt-6 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-[#233748] text-sm font-bold">SW</span>
                <span className="h-8 w-px bg-white/50"/>
                <strong className="text-[clamp(15px,4vw,22px)]">Steffen Widmair</strong>
              </div>
              <div className="my-5 h-[4px] w-24 rounded-full bg-[#0da5f7]"/>
              <div className="flex items-center gap-3">
                <BeerCrate/>
                <span className="h-12 w-px shrink-0 bg-white/50"/>
                <p className="text-[clamp(19px,5.5vw,31px)] font-extrabold leading-[1.05] tracking-tight">Kiste Bier<br/>trotzdem fällig<span className="text-[#0da5f7]">.</span></p>
              </div>
            </section>
          </div>
        </article>
        <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">Designvorschau mit Beispieldaten. Später ersetzt die App die Initialen durch das echte Spielerprofilbild. Keine Strafe wird durch diese Vorschau angelegt.</p>
      </div>
    </main>
  );
}
