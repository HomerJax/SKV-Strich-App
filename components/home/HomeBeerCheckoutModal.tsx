"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, X } from "lucide-react";
import { recordBeerAction } from "@/app/mannschaftskasse/actions";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/config";

function formatEuro(cents: number, locale: AppLocale) {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
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
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [poolOpening, setPoolOpening] = useState(false);
  const [poolConfirmOpen, setPoolConfirmOpen] = useState(false);
  const totalCents = useMemo(() => quantity * priceCents, [quantity, priceCents]);

  function handlePaypalClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (!paypalPool || poolOpening) return;

    event.preventDefault();
    setPoolConfirmOpen(true);
  }

  function preparePaypalPoolOpen(event: React.MouseEvent<HTMLAnchorElement>) {
    if (poolOpening) {
      event.preventDefault();
      return;
    }

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
          setOpen(true);
        }}
        className="flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left shadow-sm transition active:scale-[0.99]"
      >
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-700">
            🍺 {t("beer.title")}
          </div>
          <div className="text-sm font-black text-slate-950">{t("beer.add")}</div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-500">
            {t("beer.hint")}
          </div>
        </div>
        <span className="rounded-full bg-amber-400 px-3 py-2 text-xs font-black text-slate-950">
          {t("beer.open")}
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
                  🍺 {t("beer.title")}
                </div>
                <h2 id="beer-checkout-title" className="mt-1 text-2xl font-black text-slate-950">
                  {t("beer.question")}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {t("beer.perBeer", { price: formatEuro(priceCents, locale) })}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600" aria-label={t("beer.close")}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={recordBeerAction} className="mt-6">
              <input type="hidden" name="quantity" value={quantity} />
              <input type="hidden" name="return_to" value="/home" />

              <div className="flex items-center justify-between rounded-[24px] border border-amber-200 bg-amber-50/60 p-4">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl font-black text-slate-900 shadow-sm ring-1 ring-slate-200" aria-label={t("beer.less")}>−</button>
                <div className="min-w-0 text-center">
                  <div className="text-5xl font-black tracking-tight text-slate-950">{quantity}</div>
                  <div className="mt-1 text-xs font-black uppercase tracking-[.14em] text-slate-500">{t("beer.beer")}</div>
                </div>
                <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-3xl font-black text-white shadow-sm" aria-label={t("beer.more")}>+</button>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-bold text-slate-500">{t("beer.value")}</span>
                <span className="text-2xl font-black text-slate-950">{formatEuro(totalCents, locale)}</span>
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
                            ? t("beer.payPaypal", { price: formatEuro(totalCents, locale) })
                            : t("beer.recordPaypal")}
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
                      <span className="block text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">{t("beer.cash")}</span>
                      <span className="block text-base font-black">{t("beer.cashOpen")}</span>
                    </span>
                  </span>
                  <span className="font-black">→</span>
                </button>
              </div>

              <p className="mt-3 text-center text-[11px] font-medium leading-4 text-slate-500">
                {paypalPool
                  ? t("beer.poolHint")
                  : t("beer.normalHint")}
              </p>
            </form>
          </div>
        </div>
      ) : null}

      {poolConfirmOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-[2px]">
          <div role="dialog" aria-modal="true" aria-labelledby="paypal-pool-hint-title" className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-[#0070ba]">
              {t("beer.poolTitle")}
            </div>
            <h3 id="paypal-pool-hint-title" className="mt-1 text-2xl font-black text-slate-950">
              🍺 {quantity} {t("beer.beer")} · {formatEuro(totalCents, locale)}
            </h3>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              {t("beer.poolText", { price: formatEuro(totalCents, locale) })}
            </p>
            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
              {t("beer.poolWarning")}
            </div>
            <a
              href={paypalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={preparePaypalPoolOpen}
              className="mt-4 block w-full rounded-2xl bg-[#0070ba] px-4 py-4 text-center text-sm font-black text-white shadow-sm"
            >
              {t("beer.rememberPaypal", { price: formatEuro(totalCents, locale) })}
            </a>
            <button
              type="button"
              onClick={() => {
                setPoolConfirmOpen(false);
                setPoolOpening(false);
              }}
              className="mt-2 w-full rounded-2xl px-4 py-3 text-xs font-black text-slate-500"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
