"use client";

import { useMemo, useState } from "react";
import { Banknote, CreditCard } from "lucide-react";
import { recordBeerAction } from "./actions";

function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default function BeerCheckoutCard({
  priceCents,
  myTotal,
  badge,
  paypalEnabled,
}: {
  priceCents: number;
  myTotal: number;
  badge: string | null;
  paypalEnabled: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const totalCents = useMemo(() => quantity * priceCents, [quantity, priceCents]);

  return (
    <section id="bierkasse" className="rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-700">🍺 Bierkasse+</div>
          <h2 className="mt-1 text-xl font-black text-slate-950">Bier eintragen</h2>
          <p className="mt-1 text-xs font-medium text-slate-600">
            {formatEuro(priceCents)} pro Bier · dein Stand: {myTotal} Bier{badge ? ` · ${badge}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black text-white">PREMIUM</span>
      </div>

      <form action={recordBeerAction} className="mt-5">
        <input type="hidden" name="quantity" value={quantity} />
        <input type="hidden" name="return_to" value="/mannschaftskasse" />

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-white p-3">
          <div>
            <div className="text-xs font-bold text-slate-500">Wie viele hattest du?</div>
            <div className="mt-0.5 text-2xl font-black text-slate-950">{quantity} Bier</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl font-black text-slate-900" aria-label="Ein Bier weniger">−</button>
            <div className="w-10 text-center text-xl font-black">{quantity}</div>
            <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-xl font-black text-white" aria-label="Ein Bier mehr">+</button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {paypalEnabled ? (
            <button name="payment_method" value="paypal" className="flex items-center justify-between rounded-2xl bg-[#0070ba] px-4 py-3.5 text-left text-white shadow-sm">
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>
                  <span className="block text-[10px] font-black uppercase tracking-[.16em] text-white/70">PayPal</span>
                  <span className="block text-sm font-black">{formatEuro(totalCents)}</span>
                </span>
              </span>
              <span className="font-black">→</span>
            </button>
          ) : null}

          <button name="payment_method" value="cash" className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 text-left text-slate-950 shadow-sm">
            <span className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-700" />
              <span>
                <span className="block text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Bar</span>
                <span className="block text-sm font-black">{formatEuro(totalCents)} offen</span>
              </span>
            </span>
            <span className="font-black">→</span>
          </button>
        </div>

        <p className="mt-2 text-[11px] font-medium leading-4 text-slate-500">
          Die Bier zählen sofort für deine Statistik. Bezahlt zählt getrennt davon.
        </p>
      </form>
    </section>
  );
}
