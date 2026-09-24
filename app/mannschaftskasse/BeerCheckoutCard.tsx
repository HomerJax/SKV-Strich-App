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

function copyPoolAmount(cents: number) {
  const amount = (cents / 100).toFixed(2).replace(".", ",");
  const textarea = document.createElement("textarea");

  textarea.value = amount;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  const copied = document.execCommand("copy");
  textarea.remove();

  return copied;
}

function recordPoolBeer(quantity: number) {
  const body = new FormData();
  body.set("quantity", String(quantity));
  body.set("payment_method", "paypal");

  if (navigator.sendBeacon("/api/mannschaftskasse/beer", body)) {
    return;
  }

  void fetch("/api/mannschaftskasse/beer", {
    method: "POST",
    body,
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined);
}

export default function BeerCheckoutCard({
  priceCents,
  myTotal,
  badge,
  paypalEnabled,
  paypalPool,
  paypalUrl,
}: {
  priceCents: number;
  myTotal: number;
  badge: string | null;
  paypalEnabled: boolean;
  paypalPool: boolean;
  paypalUrl: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const [poolOpening, setPoolOpening] = useState(false);
  const [poolConfirmOpen, setPoolConfirmOpen] = useState(false);
  const [poolAmountCopied, setPoolAmountCopied] = useState<boolean | null>(null);
  const totalCents = useMemo(() => quantity * priceCents, [quantity, priceCents]);

  function handlePaypalClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (!paypalPool || poolOpening) return;

    event.preventDefault();
    const copied = copyPoolAmount(totalCents);
    setPoolAmountCopied(copied);
    setPoolConfirmOpen(true);
  }

  function preparePaypalPoolOpen() {
    if (poolOpening) return;

    setPoolOpening(true);
    copyPoolAmount(totalCents);
    recordPoolBeer(quantity);
  }

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
            <button name="payment_method" value="paypal" type={paypalPool ? "button" : "submit"} onClick={handlePaypalClick} className="flex items-center justify-between rounded-2xl bg-[#0070ba] px-4 py-3.5 text-left text-white shadow-sm">
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>
                  <span className="block text-[10px] font-black uppercase tracking-[.16em] text-white/70">PayPal</span>
                  <span className="block text-sm font-black">
                    {paypalPool
                      ? `${formatEuro(totalCents)} · mit PayPal zahlen`
                      : formatEuro(totalCents)}
                  </span>
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
          {paypalPool
            ? "Pool-Zahlung: strikr kopiert den Betrag. In PayPal nur noch Beteiligen → Einfügen → Zahlen."
            : "Die Bier zählen sofort für deine Statistik. Bezahlt zählt getrennt davon."}
        </p>
      </form>
      {poolConfirmOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-[2px]">
          <div role="dialog" aria-modal="true" aria-labelledby="cashbox-paypal-pool-hint-title" className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-[#0070ba]">
              PayPal-Pool
            </div>
            <h3 id="cashbox-paypal-pool-hint-title" className="mt-1 text-xl font-black text-slate-950">
              {poolAmountCopied === false
                ? `${formatEuro(totalCents)} bitte kurz merken · Bierstatistik aktualisiert 🍺`
                : `${formatEuro(totalCents)} kopiert ✓ · Bierstatistik aktualisiert 🍺`}
            </h3>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              {poolAmountCopied === false
                ? "Du wirst jetzt zu PayPal weitergeleitet. Tippe dort auf „Beteiligen“ und gib den angezeigten Betrag ein."
                : "Du wirst jetzt zu PayPal weitergeleitet. Tippe dort auf „Beteiligen“, füge den Betrag aus deiner Zwischenablage ein und bestätige die Zahlung."}
            </p>
            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
              😉 Hier setzen wir auf dein Vertrauen. Schummeln lohnt sich eh nicht – ein Schiefstand fällt spätestens bei der Kassenprüfung auf.
            </div>
            <a
              href={paypalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={preparePaypalPoolOpen}
              className="mt-4 block w-full rounded-2xl bg-[#0070ba] px-4 py-4 text-center text-sm font-black text-white shadow-sm"
            >
              Zu PayPal →
            </a>
            <button
              type="button"
              onClick={() => {
                setPoolConfirmOpen(false);
                setPoolOpening(false);
              }}
              className="mt-2 w-full rounded-2xl px-4 py-3 text-xs font-black text-slate-500"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
