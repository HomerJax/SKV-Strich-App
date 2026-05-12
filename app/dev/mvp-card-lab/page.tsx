const badgeUrl = "/badges/hero/blech.webp";
const strikrLogo = "/brand/strikr-mark.png";

function TopBar() {
  return (
    <div className="absolute left-7 right-7 top-7 z-20 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-black/35 px-4 py-3 backdrop-blur">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xs font-black text-black">
          SKV
        </div>
        <div>
          <div className="text-sm font-black text-white">SKV Rutesheim AH</div>
          <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
            Training Moment
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-black/35 px-4 py-3 backdrop-blur">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={strikrLogo} alt="" className="h-10 w-10 rounded-xl" />
        <div>
          <div className="text-sm font-black text-white">strikr</div>
          <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
            @getstrikr
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer({ text = "created with strikr" }: { text?: string }) {
  return (
    <div className="absolute bottom-7 left-7 right-7 z-20 flex items-center justify-between rounded-[22px] border border-white/10 bg-white/10 px-5 py-4 text-xs font-black text-white/70 backdrop-blur">
      <span>{text}</span>
      <span>www.strikr.team</span>
    </div>
  );
}

function Badge({ size = "h-56 w-56" }: { size?: string }) {
  return (
    <div className={`relative flex ${size} items-center justify-center`}>
      <div className="absolute h-2/3 w-2/3 rounded-full bg-white/15 blur-3xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={badgeUrl}
        alt=""
        className="relative h-full w-full object-contain drop-shadow-[0_35px_55px_rgba(0,0,0,0.75)]"
      />
    </div>
  );
}

function CardShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">
        {title}
      </div>
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function ConceptOne() {
  return (
    <CardShell title="01 — Result DNA / Team MVP">
      <div className="absolute inset-0 bg-[#020617]" />
      <div className="absolute inset-x-0 top-0 h-[34%] bg-gradient-to-br from-sky-500 via-blue-700 to-slate-950" />
      <div className="absolute left-[-20%] top-[20%] h-[42%] w-[140%] rotate-[-8deg] rounded-full bg-sky-300/20 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-transparent" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(90deg,#fff_0px,#fff_1px,transparent_1px,transparent_34px)]" />

      <TopBar />

      <div className="absolute left-7 right-7 top-[18%] z-10">
        <div className="text-[72px] font-black uppercase leading-[0.78] tracking-[-0.08em] text-white">
          MVP
        </div>
        <div className="mt-1 text-[48px] font-black uppercase leading-[0.82] tracking-[-0.07em] text-white">
          gewählt.
        </div>
      </div>

      <div className="absolute left-1/2 top-[35%] z-10 -translate-x-1/2">
        <Badge size="h-64 w-64" />
      </div>

      <div className="absolute left-7 right-7 top-[61%] z-10">
        <div className="text-xs font-black uppercase tracking-[0.25em] text-white/45">
          Glückwunsch
        </div>
        <div className="mt-2 text-[42px] font-black leading-[0.95] tracking-[-0.06em] text-white">
          Marcello Testa
        </div>
        <div className="mt-3 text-sm font-bold text-white/60">
          Spieler des Trainings · Dienstag, 18:00 Uhr
        </div>

        <div className="mt-5 flex gap-2">
          <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-black">
            MVP #1
          </div>
          <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white/75">
            Blech
          </div>
        </div>
      </div>

      <Footer />
    </CardShell>
  );
}

function ConceptTwo() {
  return (
    <CardShell title="02 — Editorial Award Poster">
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-x-0 top-0 h-[44%] bg-gradient-to-br from-zinc-300 via-zinc-600 to-slate-950" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
      <div className="absolute right-[-18%] top-[22%] h-[44%] w-[85%] rounded-full bg-white/15 blur-3xl" />

      <TopBar />

      <div className="absolute left-7 right-7 top-[18%] z-10">
        <div className="text-[58px] font-black uppercase leading-[0.85] tracking-[-0.075em] text-black/80 mix-blend-overlay">
          Award
        </div>
        <div className="text-[74px] font-black uppercase leading-[0.78] tracking-[-0.09em] text-white">
          Night.
        </div>
      </div>

      <div className="absolute left-7 right-7 top-[38%] z-10 flex items-center justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-white/45">
            MVP
          </div>
          <div className="mt-2 text-[42px] font-black leading-[0.92] tracking-[-0.065em] text-white">
            Marcello
            <br />
            wurde gewählt.
          </div>
        </div>
        <Badge size="h-44 w-44" />
      </div>

      <div className="absolute left-7 right-7 top-[64%] z-10 rounded-[24px] bg-white p-5 text-black">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-black/40">
          Voting Ergebnis
        </div>
        <div className="mt-4 space-y-3 text-sm font-black">
          <div className="flex justify-between">
            <span>1. Marcello</span>
            <span>5 Stimmen</span>
          </div>
          <div className="flex justify-between text-black/55">
            <span>2. Julian</span>
            <span>3 Stimmen</span>
          </div>
          <div className="flex justify-between text-black/55">
            <span>3. Marcus</span>
            <span>2 Stimmen</span>
          </div>
        </div>
      </div>

      <Footer />
    </CardShell>
  );
}

function ConceptThree() {
  return (
    <CardShell title="03 — Winner / Personal Award">
      <div className="absolute inset-0 bg-[#020617]" />
      <div className="absolute inset-x-0 top-0 h-[38%] bg-gradient-to-br from-neutral-300 via-zinc-600 to-black" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
      <div className="absolute left-[-20%] top-[26%] h-[45%] w-[140%] rotate-[-8deg] rounded-full bg-white/14 blur-3xl" />

      <TopBar />

      <div className="absolute left-7 right-7 top-[18%] z-10">
        <div className="text-[44px] font-black uppercase leading-[0.88] tracking-[-0.06em] text-white/90">
          Ich wurde
        </div>
        <div className="mt-1 text-[92px] font-black uppercase leading-[0.76] tracking-[-0.1em] text-white">
          MVP.
        </div>
        <div className="mt-4 text-xl font-black text-white/65">
          Ab jetzt zählt’s.
        </div>
      </div>

      <div className="absolute left-1/2 top-[39%] z-10 -translate-x-1/2">
        <Badge size="h-72 w-72" />
      </div>

      <div className="absolute left-7 right-7 top-[68%] z-10 text-center">
        <div className="text-lg font-black uppercase tracking-[0.16em] text-zinc-300">
          blechernes strikr badge
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-black">
            MVP #1
          </div>
          <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white/75">
            0 → 1
          </div>
        </div>
        <div className="mt-5 rounded-[22px] border border-white/10 bg-white/10 px-4 py-4 text-sm font-bold text-white/65">
          Marcello Testa · SKV Rutesheim AH
        </div>
      </div>

      <Footer text="earned with strikr" />
    </CardShell>
  );
}

function ConceptFour() {
  return (
    <CardShell title="04 — Bold Result-Style MVP">
      <div className="absolute inset-0 bg-[#020617]" />
      <div className="absolute inset-x-0 top-0 h-[52%] bg-gradient-to-br from-emerald-400 via-sky-600 to-slate-950" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-transparent" />

      <TopBar />

      <div className="absolute left-7 top-[18%] z-10">
        <div className="text-[78px] font-black uppercase leading-[0.76] tracking-[-0.1em] text-white">
          Heute
          <br />
          MVP.
        </div>
      </div>

      <div className="absolute bottom-[34%] right-[-3%] z-10">
        <Badge size="h-80 w-80" />
      </div>

      <div className="absolute bottom-[20%] left-7 right-7 z-20">
        <div className="text-[48px] font-black leading-[0.9] tracking-[-0.07em] text-white">
          Marcello Testa
        </div>
        <div className="mt-3 max-w-[75%] text-sm font-bold text-white/65">
          gewählt von seinem Team. Aus Training wird Wettbewerb.
        </div>
      </div>

      <Footer />
    </CardShell>
  );
}

export default function MvpCardLabPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
            strikr dev
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            MVP Card Lab
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Schnelle visuelle Richtungen für MVP Share Cards. Erst Richtung
            wählen, dann sauber in TeamLayout/WinnerLayout übertragen.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <ConceptOne />
          <ConceptTwo />
          <ConceptThree />
          <ConceptFour />
        </div>
      </div>
    </main>
  );
}
