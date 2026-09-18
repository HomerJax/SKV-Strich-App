"use client";

import { useMemo, useState } from "react";
import { buyBeerAction } from "./actions";

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
}: {
  priceCents: number;
  myTotal: number;
  badge: string | null;
}) {
  const [quantity, setQuantity] = useState(1);
  const totalCents = useMemo(() => quantity * priceCents, [quantity, priceCents]);

  return (
    <section
      id="bierkasse"
      className="rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-700">
            🍺 Bierkasse+
          </div>
          <h2 className="mt-1 text-xl font-black text-slate-950">Bier buchen & zahlen</h2>
          <p className="mt-1 text-xs font-medium text-slate-600">
            {formatEuro(priceCents)} pro Bier · dein Stand: {myTotal} Bier
            {badge ? ` · ${badge}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black text-white">
          PREMIUM
        </span>
      </div>

      <form action={buyBeerAction} className="mt-5">
        <input type="hidden" name="quantity" value={quantity} />
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-white p-3">
          <div>
            <div className="text-xs font-bold text-slate-500">Wie viele?</div>
            <div className="mt-0.5 text-2xl font-black text-slate-950">
              {quantity} {quantity === 1 ? "Bier" : "Bier"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl font-black text-slate-900"
              aria-label="Ein Bier weniger"
            >
              −
            </button>
            <div className="w-10 text-center text-xl font-black">{quantity}</div>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(99, value + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-xl font-black text-white"
              aria-label="Ein Bier mehr"
            >
              +
            </button>
          </div>
        </div>

        <button className="mt-3 flex w-full items-center justify-between rounded-2xl bg-[#0070ba] px-4 py-3.5 text-left text-white shadow-sm">
          <span>
            <span className="block text-[10px] font-black uppercase tracking-[.16em] text-white/70">
              PayPal
            </span>
            <span className="block text-base font-black">
              {quantity} Bier · {formatEuro(totalCents)}
            </span>
          </span>
          <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#0070ba]">
            Bezahlen →
          </span>
        </button>

        <p className="mt-2 text-[11px] font-medium leading-4 text-slate-500">
          Beim Klick werden die Bier in deiner Statistik erfasst und PayPal mit dem berechneten Betrag geöffnet.
        </p>
      </form>
    </section>
  );
}
