import Link from "next/link";
import { Check, Crown, LockKeyhole, CreditCard, Database, Globe2 } from "lucide-react";
import { requirePowerUser } from "@/lib/auth/power-user";
import { PRODUCT_MATRIX } from "@/lib/billing/product-matrix";

export default async function PowerUserPricingMatrixPage() {
  await requirePowerUser();

  const areas = Array.from(new Set(PRODUCT_MATRIX.map((row) => row.area)));

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div>
          <Link
            href="/power-user"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"
          >
            ← Power User
          </Link>
        </div>

        <header className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
            Produkt & Monetarisierung
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Free vs. PRO
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Aktueller Soll-Stand für strikr. Diese Seite ist die schnelle Referenz dafür,
            welche bereits vorhandenen Funktionen Free sind und welche mit PRO freigeschaltet werden.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <Check className="h-4 w-4" /> FREE
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Muss als eigenständiges Produkt gut funktionieren. Kernnutzen, Kommunikation,
                Ergebnis und Teilen bleiben drin.
              </p>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-violet-950">
                <Crown className="h-4 w-4" /> PRO
              </div>
              <p className="mt-1 text-xs leading-5 text-violet-800">
                Verkauft vor allem mehr Flexibilität, Historie, Tiefe, Auswertung und größere Teams.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-emerald-950"><Database className="h-4 w-4" /> Billing-Daten</div>
            <div className="mt-2 text-sm font-semibold text-emerald-800">✓ Vorhanden</div>
            <p className="mt-1 text-xs leading-5 text-emerald-700">club_billing kann Free, Trial, PRO und Founder bereits abbilden.</p>
          </div>
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-emerald-950"><Globe2 className="h-4 w-4" /> Produktgrenzen</div>
            <div className="mt-2 text-sm font-semibold text-emerald-800">✓ Umsetzung läuft / weitgehend drin</div>
            <p className="mt-1 text-xs leading-5 text-emerald-700">Free/PRO wird serverseitig und sichtbar getrennt; Restcheck vor Merge.</p>
          </div>
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-amber-950"><CreditCard className="h-4 w-4" /> Checkout</div>
            <div className="mt-2 text-sm font-semibold text-amber-800">◐ Backend vorbereitet</div>
            <p className="mt-1 text-xs leading-5 text-amber-700">Checkout, Webhook und automatische Club-Freischaltung sind gebaut. Offen: Stripe-Konto, finale Preise und Live-ENV/Webhook-Konfiguration.</p>
          </div>
        </section>

        {areas.map((area) => {
          const rows = PRODUCT_MATRIX.filter((row) => row.area === area);
          return (
            <section key={area} className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-black text-slate-950">{area}</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <div
                    key={row.feature}
                    className="grid gap-3 px-5 py-4 sm:grid-cols-[1.3fr_1fr_1fr] sm:items-center"
                  >
                    <div className="font-bold text-slate-900">{row.feature}</div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                      <span className="mr-2 text-[10px] font-black uppercase tracking-wide text-slate-400">Free</span>
                      {row.free}
                    </div>
                    <div className="rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-900">
                      <span className="mr-2 text-[10px] font-black uppercase tracking-wide text-violet-500">Pro</span>
                      {row.pro}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 font-black text-amber-950">
            <LockKeyhole className="h-4 w-4" />
            Noch offen
          </div>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Der konkrete Einführungspreis und die Live-Stripe-Konfiguration sind noch offen. Checkout, Webhook und automatische PRO-Synchronisierung sind im Code vorbereitet; die Produktgrenzen sind umgesetzt.
          </p>
        </div>
      </section>
    </main>
  );
}
