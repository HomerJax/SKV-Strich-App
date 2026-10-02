import Link from "next/link";
import { ArrowRight, Check, Crown } from "lucide-react";
import { FREE_HIGHLIGHTS, PRODUCT_MATRIX, PRO_HIGHLIGHTS } from "@/lib/billing/product-matrix";

export const dynamic = "force-dynamic";

export default function ProPage() {
  const areas = Array.from(new Set(PRODUCT_MATRIX.map((row) => row.area)));

  return (
    <main className="min-h-screen bg-[#05080e] text-white">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-bold text-white/70 hover:text-white">← strikr</Link>
          <Link href="/signup?next=%2Fclub-setup" className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-950">
            Kostenlos starten
          </Link>
        </div>

        <div className="mx-auto max-w-3xl py-14 text-center sm:py-20">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-violet-200">
            <Crown className="h-4 w-4" /> strikr PRO
          </div>
          <h1 className="mt-6 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            Free reicht zum Spielen.
            <span className="block bg-gradient-to-r from-cyan-200 to-violet-300 bg-clip-text text-transparent">
              PRO macht daraus mehr.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
            Mehr Spieler, mehr Flexibilität, Saisonhistorie, Karriere-Stats und tiefere Auswertungen.
            Die Kernfunktionen bleiben bewusst auch in Free nutzbar.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-white/45">FREE</div>
            <h2 className="mt-2 text-2xl font-black">Direkt loslegen.</h2>
            <div className="mt-5 space-y-2">
              {FREE_HIGHLIGHTS.map((feature) => (
                <div key={feature} className="flex gap-3 rounded-2xl bg-white/[0.05] px-3 py-2.5 text-sm font-semibold text-white/75">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  {feature}
                </div>
              ))}
            </div>
            <Link href="/signup?next=%2Fclub-setup" className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white px-5 py-3.5 text-sm font-black text-slate-950">
              Team kostenlos starten
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-violet-300/25 bg-gradient-to-br from-violet-500/16 via-white/[0.06] to-cyan-400/10 p-6">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-400/20 blur-3xl" />
            <div className="relative text-xs font-black uppercase tracking-[0.16em] text-violet-200">PRO</div>
            <h2 className="relative mt-2 text-2xl font-black">Mehr Tiefe für euer Team.</h2>
            <div className="relative mt-5 space-y-2">
              {PRO_HIGHLIGHTS.map((feature) => (
                <div key={feature} className="flex gap-3 rounded-2xl bg-white/[0.07] px-3 py-2.5 text-sm font-semibold text-white/80">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" />
                  {feature}
                </div>
              ))}
            </div>
            <div className="relative mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <div className="text-sm font-black">Einführungspreis noch offen</div>
              <div className="mt-1 text-xs leading-5 text-white/50">
                Der Checkout wird direkt hier angebunden. Vor der Zahlung siehst du den finalen Preis und die Laufzeit.
              </div>
            </div>
          </div>
        </div>

        <section className="mt-12 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
          <div className="border-b border-white/10 px-5 py-5 sm:px-6">
            <h2 className="text-2xl font-black">Free vs. PRO im Detail</h2>
            <p className="mt-2 text-sm text-white/50">Nur bereits vorhandene bzw. jetzt technisch getrennte Funktionen.</p>
          </div>
          {areas.map((area) => (
            <div key={area} className="border-b border-white/8 last:border-b-0">
              <div className="bg-white/[0.025] px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-cyan-200 sm:px-6">
                {area}
              </div>
              <div className="divide-y divide-white/7">
                {PRODUCT_MATRIX.filter((row) => row.area === area).map((row) => (
                  <div key={row.feature} className="grid gap-2 px-5 py-4 sm:grid-cols-[1.2fr_1fr_1fr] sm:items-center sm:px-6">
                    <div className="text-sm font-bold text-white">{row.feature}</div>
                    <div className="text-sm font-semibold text-white/55"><span className="mr-2 text-[10px] font-black text-white/30">FREE</span>{row.free}</div>
                    <div className="text-sm font-semibold text-violet-200"><span className="mr-2 text-[10px] font-black text-violet-300/60">PRO</span>{row.pro}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="py-12 text-center">
          <h2 className="text-3xl font-black">Mit Free starten. PRO später dazunehmen.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/50">
            Sobald der Checkout live ist, wird ein Kauf automatisch dem aktuellen Club zugeordnet und PRO unmittelbar freigeschaltet.
          </p>
          <Link href="/signup?next=%2Fclub-setup" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-slate-950">
            Team starten <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
