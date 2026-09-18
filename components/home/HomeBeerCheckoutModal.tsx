"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { buyBeerAction } from "@/app/mannschaftskasse/actions";

function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default function HomeBeerCheckoutModal({
  priceCents,
}: {
  priceCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const totalCents = useMemo(() => quantity * priceCents, [quantity, priceCents]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuantity(1);
          setOpen(true);
        }}
        className="flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left shadow-sm transition active:scale-[0.99]"
      >
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-700">
            🍺 Bierkasse+
          </div>
          <div className="text-sm font-black text-slate-950">Bier zahlen</div>
        </div>
        <span className="rounded-full bg-amber-400 px-3 py-2 text-xs font-black text-slate-950">
          Öffnen →
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="beer-checkout-title"
            className="w-full rounded-t-[30px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-[30px] sm:p-6"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-700">
                  🍺 Bierkasse+
                </div>
                <h2 id="beer-checkout-title" className="mt-1 text-2xl font-black text-slate-950">
                  Wie viele Bier?
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {formatEuro(priceCents)} pro Bier
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={buyBeerAction} className="mt-6">
              <input type="hidden" name="quantity" value={quantity} />
              <input type="hidden" name="return_to" value="/home" />

              <div className="flex items-center justify-between rounded-[24px] border border-amber-200 bg-amber-50/60 p-4">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl font-black text-slate-900 shadow-sm ring-1 ring-slate-200"
                  aria-label="Ein Bier weniger"
                >
                  −
                </button>

                <div className="min-w-0 text-center">
                  <div className="text-5xl font-black tracking-tight text-slate-950">
                    {quantity}
                  </div>
                  <div className="mt-1 text-xs font-black uppercase tracking-[.14em] text-slate-500">
                    {quantity === 1 ? "Bier" : "Bier"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(99, value + 1))}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-3xl font-black text-white shadow-sm"
                  aria-label="Ein Bier mehr"
                >
                  +
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-bold text-slate-500">Gesamt</span>
                <span className="text-2xl font-black text-slate-950">
                  {formatEuro(totalCents)}
                </span>
              </div>

              <button
                type="submit"
                className="mt-4 flex w-full items-center justify-between rounded-2xl bg-[#0070ba] px-4 py-4 text-left text-white shadow-sm active:scale-[0.99]"
              >
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

              <p className="mt-3 text-center text-[11px] font-medium leading-4 text-slate-500">
                Die Bier werden beim Wechsel zu PayPal in deiner Statistik erfasst.
              </p>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
