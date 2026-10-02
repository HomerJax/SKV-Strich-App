import Link from "next/link";
import { ArrowRight, Check, Crown } from "lucide-react";
import { FREE_HIGHLIGHTS, PRODUCT_MATRIX, PRO_HIGHLIGHTS } from "@/lib/billing/product-matrix";
import { getAuthContext, isActiveClubAdmin } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { getClubBillingAccess } from "@/lib/billing/club-billing";
import { isStripeCheckoutConfigured } from "@/lib/billing/stripe";
import { INTRO_PRICING, getAnnualSavingsPercent } from "@/lib/billing/pricing";

export const dynamic = "force-dynamic";

export default async function ProPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const areas = Array.from(new Set(PRODUCT_MATRIX.map((row) => row.area)));
  const params = (await searchParams) ?? {};
  const checkoutState = typeof params.checkout === "string" ? params.checkout : "";
  const billingState = typeof params.billing === "string" ? params.billing : "";

  const ctx = await getAuthContext();
  const canBuyForActiveClub = Boolean(ctx.user && ctx.activeClubId && isActiveClubAdmin(ctx));
  const supabase = await createClient();
  const billingAccess = ctx.activeClubId
    ? await getClubBillingAccess(supabase, ctx.activeClubId)
    : null;
  const [monthlyConfigured, yearlyConfigured] = await Promise.all([
    isStripeCheckoutConfigured("pro_monthly"),
    isStripeCheckoutConfigured("pro_yearly"),
  ]);
  const hasStripeSubscription = Boolean(
    billingAccess?.billing.billing_provider === "stripe" &&
      billingAccess.billing.stripe_customer_id,
  );

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

        {checkoutState === "success" ? (
          <div className="mb-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
            Zahlung erfolgreich. Stripe schaltet PRO jetzt automatisch für euren Club frei.
          </div>
        ) : checkoutState === "cancelled" ? (
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/70">
            Checkout abgebrochen – es wurde nichts geändert.
          </div>
        ) : checkoutState ? (
          <div className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">
            PRO konnte gerade nicht gestartet werden. Bitte später erneut versuchen.
          </div>
        ) : billingState === "failed" ? (
          <div className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">
            Das Abo-Portal konnte gerade nicht geöffnet werden.
          </div>
        ) : null}

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
            <div className="relative mt-4 rounded-2xl border border-violet-300/15 bg-violet-300/[0.08] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">{INTRO_PRICING.badge}</div>
              <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
                <div><span className="text-3xl font-black">{INTRO_PRICING.monthly.label}</span><span className="ml-1 text-sm font-bold text-white/45">{INTRO_PRICING.monthly.suffix}</span></div>
                <div className="text-sm font-black text-violet-200">{INTRO_PRICING.yearly.label} {INTRO_PRICING.yearly.suffix} · ca. {getAnnualSavingsPercent()}% günstiger</div>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/45">Günstiger Startpreis für die ersten Teams. Für spätere Neukunden kann der Preis steigen.</p>
            </div>
            <div className="relative mt-5 space-y-2">
              {PRO_HIGHLIGHTS.map((feature) => (
                <div key={feature} className="flex gap-3 rounded-2xl bg-white/[0.07] px-3 py-2.5 text-sm font-semibold text-white/80">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" />
                  {feature}
                </div>
              ))}
            </div>
            <div className="relative mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              {billingAccess?.isPro ? (
                <div className="text-center">
                  <div className="text-sm font-black text-emerald-200">✓ PRO ist für euren Club aktiv</div>
                  <div className="mt-1 text-xs leading-5 text-white/50">
                    {billingAccess.planLabel}
                    {billingAccess.billing.cancel_at_period_end ? " · Kündigung zum Periodenende vorgemerkt" : ""}
                  </div>
                  {hasStripeSubscription ? (
                    <form method="post" action="/api/billing/portal" className="mt-3">
                      <button className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-black text-slate-950">
                        Abo verwalten
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : canBuyForActiveClub ? (
                <div>
                  <div className="text-center text-sm font-black">PRO für euren Club freischalten</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <form method="post" action="/api/billing/checkout">
                      <input type="hidden" name="plan" value="pro_monthly" />
                      <button
                        disabled={!monthlyConfigured}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {monthlyConfigured ? `${INTRO_PRICING.monthly.label} monatlich` : `${INTRO_PRICING.monthly.label} · noch nicht live`}
                      </button>
                    </form>
                    <form method="post" action="/api/billing/checkout">
                      <input type="hidden" name="plan" value="pro_yearly" />
                      <button
                        disabled={!yearlyConfigured}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-violet-500 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {yearlyConfigured ? `${INTRO_PRICING.yearly.label} jährlich` : `${INTRO_PRICING.yearly.label} · noch nicht live`}
                      </button>
                    </form>
                  </div>
                  {!monthlyConfigured && !yearlyConfigured ? (
                    <div className="mt-2 text-center text-xs leading-5 text-white/45">
                      Preis und Stripe-Produkt werden noch eingerichtet.
                    </div>
                  ) : null}
                </div>
              ) : ctx.user ? (
                <div className="text-center">
                  <div className="text-sm font-black">Nur ein Team-Admin kann PRO buchen.</div>
                  <div className="mt-1 text-xs leading-5 text-white/50">
                    Wähle zuerst den Club, für den du PRO aktivieren möchtest.
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-sm font-black">Einloggen, Club wählen, PRO aktivieren.</div>
                  <Link
                    href="/login?next=%2Fpro"
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950"
                  >
                    Einloggen
                  </Link>
                </div>
              )}
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
