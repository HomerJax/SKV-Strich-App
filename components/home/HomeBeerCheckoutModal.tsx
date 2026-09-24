"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, X } from "lucide-react";
import { recordBeerAction } from "@/app/mannschaftskasse/actions";

function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

async function copyPoolAmount(cents: number) {
  const amount = (cents / 100).toFixed(2).replace(".", ",");

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(amount);
      return true;
    }
  } catch {}

  const textarea = document.createElement("textarea");
  textarea.value = amount;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "0";
  textarea.style.top = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {}

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

export default function HomeBeerCheckoutModal({
  priceCents,
  paypalEnabled,
  paypalPool,
  paypalUrl,
}: {
  priceCents: number;
  paypalEnabled: boolean;
  paypalPool: boolean;
  paypalUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [poolOpening, setPoolOpening] = useState(false);
  const [poolConfirmOpen, setPoolConfirmOpen] = useState(false);
  const [poolAmountCopied, setPoolAmountCopied] = useState<boolean | null>(null);
  const totalCents = useMemo(() => quantity * priceCents, [quantity, priceCents]);

  function handlePaypalClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (!paypalPool || poolOpening) return;

    event.preventDefault();
    setPoolAmountCopied(null);
    setPoolConfirmOpen(true);
  }

  async function copyAmount() {
    const copied = await copyPoolAmount(totalCents);
    setPoolAmountCopied(copied);
  }

  function preparePaypalPoolOpen() {
    if (poolOpening) return;

    setPoolOpening(true);
    recordPoolBeer(quantity);
  }

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
          setPoolOpening(false);
          setPoolConfirmOpen(false);
          setPoolAmountCopied(null);
          setOpen(true);
        }}
        className="flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left shadow-sm transition active:scale-[0.99]"
      >
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-700">
            🍺 Bierkasse+
          </div>
          <div className="text-sm font-black text-slate-950">Bier eintragen</div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-500">
            Verbrauch erfassen · PayPal oder bar
          </div>
        </div>
        <span className="rounded-full bg-amber-400 px-3 py-2 text-xs font-black text-slate-950">
          Öffnen →
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="beer-checkout-title"
            className="max-h-[calc(100dvh-6.5rem-env(safe-area-inset-bottom))] w-full touch-pan-y overflow-y-auto overscroll-contain rounded-t-[30px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl [-webkit-overflow-scrolling:touch] sm:max-h-[calc(100dvh-2rem)] sm:max-w-md sm:rounded-[30px] sm:p-6"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-700">
                  🍺 Bierkasse+
                </div>
                <h2 id="beer-checkout-title" className="mt-1 text-2xl font-black text-slate-950">
                  Wie viele hattest du?
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {formatEuro(priceCents)} pro Bier
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600" aria-label="Schließen">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={recordBeerAction} className="mt-6">
              <input type="hidden" name="quantity" value={quantity} />
              <input type="hidden" name="return_to" value="/home" />

              <div className="flex items-center justify-between rounded-[24px] border border-amber-200 bg-amber-50/60 p-4">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl font-black text-slate-900 shadow-sm ring-1 ring-slate-200" aria-label="Ein Bier weniger">−</button>
                <div className="min-w-0 text-center">
                  <div className="text-5xl font-black tracking-tight text-slate-950">{quantity}</div>
                  <div className="mt-1 text-xs font-black uppercase tracking-[.14em] text-slate-500">Bier</div>
                </div>
                <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-3xl font-black text-white shadow-sm" aria-label="Ein Bier mehr">+</button>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-bold text-slate-500">Wert</span>
                <span className="text-2xl font-black text-slate-950">{formatEuro(totalCents)}</span>
              </div>

              <div className="mt-4 grid gap-2">
                {paypalEnabled ? (
                  <button name="payment_method" value="paypal" type={paypalPool ? "button" : "submit"} onClick={handlePaypalClick} className="flex w-full items-center justify-between rounded-2xl bg-[#0070ba] px-4 py-4 text-left text-white shadow-sm active:scale-[0.99]">
                    <span className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5" />
                      <span>
                        <span className="block text-[10px] font-black uppercase tracking-[.16em] text-white/70">PayPal</span>
                        <span className="block text-base font-black">
                          {paypalPool
                            ? `${formatEuro(totalCents)} · mit PayPal zahlen`
                            : "Eintragen & PayPal öffnen"}
                        </span>
                      </span>
                    </span>
                    <span className="font-black">→</span>
                  </button>
                ) : null}

                <button name="payment_method" value="cash" type="submit" className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left text-slate-950 shadow-sm active:scale-[0.99]">
                  <span className="flex items-center gap-3">
                    <Banknote className="h-5 w-5 text-emerald-700" />
                    <span>
                      <span className="block text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Bar</span>
                      <span className="block text-base font-black">Eintragen · Zahlung offen</span>
                    </span>
                  </span>
                  <span className="font-black">→</span>
                </button>
              </div>

              <p className="mt-3 text-center text-[11px] font-medium leading-4 text-slate-500">
                {paypalPool
                  ? "Beim PayPal-Pool kopiert strikr den Betrag automatisch. In PayPal nur noch „Beteiligen“, Betrag einfügen und zahlen."
                  : "Verbrauch und Zahlung werden getrennt geführt. Bar gilt erst nach Bestätigung als bezahlt."}
              </p>
            </form>
          </div>
        </div>
      ) : null}

      {poolConfirmOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-[2px]">
          <div role="dialog" aria-modal="true" aria-labelledby="paypal-pool-hint-title" className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-[#0070ba]">
              PayPal-Pool
            </div>
            <h3 id="paypal-pool-hint-title" className="mt-1 text-xl font-black text-slate-950">
              {poolAmountCopied === true
                ? `${formatEuro(totalCents)} kopiert ✓`
                : `${formatEuro(totalCents)} für den PayPal-Pool`}
            </h3>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              {poolAmountCopied === true
                ? "Perfekt. Tippe jetzt auf „Zu PayPal“. Dort auf „Beteiligen“, Betrag einfügen und Zahlung bestätigen."
                : poolAmountCopied === false
                  ? "iOS hat das automatische Kopieren blockiert. Merke dir den Betrag oben und gib ihn nach „Beteiligen“ in PayPal ein."
                  : "Kopiere zuerst den Betrag. Danach wirst du zu PayPal weitergeleitet: „Beteiligen“ → Betrag einfügen → Zahlung bestätigen."}
            </p>
            <button
              type="button"
              onClick={copyAmount}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-950 shadow-sm"
            >
              {poolAmountCopied === true ? "✓ Betrag kopiert" : `${formatEuro(totalCents)} kopieren`}
            </button>
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
              {poolAmountCopied === true ? "Zu PayPal →" : "Weiter zu PayPal →"}
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
    </>
  );
}
