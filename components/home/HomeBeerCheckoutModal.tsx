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

function recordPoolBeer(quantity: number, donationCents: number) {
  const body = new FormData();
  body.set("quantity", String(quantity));
  body.set("payment_method", "paypal");
  body.set("donation_cents", String(donationCents));

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
  paypalMeEnabled,
  sumupEnabled,
  cashEnabled,
}: {
  priceCents: number;
  paypalEnabled: boolean;
  paypalPool: boolean;
  paypalUrl: string;
  paypalMeEnabled: boolean;
  sumupEnabled: boolean;
  cashEnabled: boolean;
}) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [poolOpening, setPoolOpening] = useState(false);
  const [poolReminderOpen, setPoolReminderOpen] = useState(false);
  const [donationCents, setDonationCents] = useState(0);
  const totalCents = useMemo(() => quantity * priceCents, [quantity, priceCents]);

  function preparePaypalPoolOpen(event: React.MouseEvent<HTMLAnchorElement>) {
    if (poolOpening) {
      event.preventDefault();
      return;
    }

    setPoolOpening(true);
    recordPoolBeer(quantity, donationCents);
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      body.style.overflow = previous.overflow;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const preventBackgroundTouch = (event: TouchEvent) => {
      const target = event.target as Element | null;
      if (poolReminderOpen || !target?.closest("[data-beer-checkout-scroll]")) {
        event.preventDefault();
      }
    };

    document.addEventListener("touchmove", preventBackgroundTouch, { passive: false });
    return () => document.removeEventListener("touchmove", preventBackgroundTouch);
  }, [open, poolReminderOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuantity(1);
          setPoolOpening(false);
          setPoolReminderOpen(false);
          setDonationCents(0);
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
          className="fixed inset-0 z-[1000] flex items-end justify-center overflow-hidden bg-slate-950/35 p-0 backdrop-blur-md sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          onTouchMove={(event) => {
            if (event.target === event.currentTarget) event.preventDefault();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="beer-checkout-title"
            data-beer-checkout-scroll
            className="max-h-[calc(100dvh-2rem)] w-full touch-pan-y overflow-y-auto overscroll-contain rounded-t-[30px] border border-white/60 bg-white/80 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl [-webkit-overflow-scrolling:touch] sm:max-w-md sm:rounded-[30px] sm:p-6"
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

            <form action={recordBeerAction} className="mt-5">
              <input type="hidden" name="quantity" value={quantity} />
              <input type="hidden" name="return_to" value="/home" />

              <div className="flex items-center justify-between rounded-[20px] border border-amber-200 bg-amber-50/70 px-3 py-2.5">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-2xl font-black text-slate-900 shadow-sm ring-1 ring-slate-200" aria-label={t("beer.less")}>−</button>
                <div className="min-w-0 text-center">
                  <div className="text-3xl font-black tracking-tight text-slate-950">{quantity}</div>
                  <div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{t("beer.beer")}</div>
                </div>
                <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-2xl font-black text-white shadow-sm" aria-label={t("beer.more")}>+</button>
              </div>

              <div className="mt-3">
                <div className="text-sm font-black text-slate-950">Mannschaftskasse unterstützen?</div>
                <div className="mt-1 text-xs font-medium text-slate-500">Optional – einfach zum Bierbetrag dazu.</div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[0, 100, 200, 500].map((value) => (
                    <button key={value} type="button" onClick={() => setDonationCents(value)} className={"rounded-xl border px-2 py-2 text-xs font-black transition " + (donationCents === value ? "border-cyan-500 bg-cyan-50 text-cyan-800" : "border-white/70 bg-white/65 text-slate-600")}>
                      {value === 0 ? "Nein" : "+" + formatEuro(value, locale)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <span className="text-xs font-black uppercase tracking-[.16em] text-white/55">Gesamt</span>
                <span className="text-2xl font-black">{formatEuro(totalCents + donationCents, locale)}</span>
              </div>

              <div className="mt-4 grid gap-2">
                {sumupEnabled ? (
                  <button name="payment_method" value="sumup" type="submit" className="flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/65 px-4 py-4 text-left text-slate-950 shadow-sm active:scale-[0.99]">
                    <span className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-sky-700" /><span><span className="block text-[10px] font-black uppercase tracking-[.16em] text-sky-700">SumUp</span><span className="block text-base font-black">{formatEuro(totalCents, locale)} · Link öffnen</span></span></span><span className="font-black">→</span>
                  </button>
                ) : (
                  <button type="button" disabled className="flex w-full cursor-not-allowed items-center justify-between rounded-2xl border border-slate-200 bg-slate-100 px-4 py-4 text-left text-slate-400 opacity-70">
                    <span className="flex items-center gap-3"><CreditCard className="h-5 w-5" /><span><span className="block text-[10px] font-black uppercase tracking-[.16em]">SumUp</span><span className="block text-base font-black">Demnächst</span></span></span>
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Coming soon</span>
                  </button>
                )}

                {paypalEnabled ? (
                  paypalPool ? (
                    <button type="button" onClick={() => setPoolReminderOpen(true)} className="flex w-full items-center justify-between rounded-2xl bg-[#0070ba] px-4 py-4 text-left text-white shadow-sm active:scale-[0.99]">
                      <span><span className="block text-[10px] font-black uppercase tracking-[.16em] text-white/70">PayPal Pool</span><span className="block text-base font-black">{formatEuro(totalCents + donationCents, locale)} zahlen</span></span>
                      <span className="font-black">→</span>
                    </button>
                  ) : (
                    <button name="payment_method" value="paypal" type="submit" className="flex w-full items-center justify-between rounded-2xl bg-[#0070ba] px-4 py-4 text-left text-white shadow-sm active:scale-[0.99]">
                      <span><span className="block text-[10px] font-black uppercase tracking-[.16em] text-white/70">PayPal</span><span className="block text-base font-black">{formatEuro(totalCents, locale)} zahlen</span></span>
                      <span className="font-black">→</span>
                    </button>
                  )
                ) : null}

                {paypalMeEnabled ? (
                  <button name="payment_method" value="paypal_me" type="submit" className="flex w-full items-center justify-between rounded-2xl bg-[#0070ba] px-4 py-4 text-left text-white shadow-sm active:scale-[0.99]">
                    <span className="flex items-center gap-3"><CreditCard className="h-5 w-5" /><span><span className="block text-[10px] font-black uppercase tracking-[.16em] text-white/70">PayPal.Me</span><span className="block text-base font-black">{formatEuro(totalCents, locale)}</span></span></span><span className="font-black">→</span>
                  </button>
                ) : null}

                {cashEnabled ? (
                <button name="payment_method" value="cash" type="submit" className="flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/65 px-4 py-4 text-left text-slate-950 shadow-sm active:scale-[0.99]">
                  <span className="flex items-center gap-3">
                    <Banknote className="h-5 w-5 text-emerald-700" />
                    <span>
                      <span className="block text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">{t("beer.cash")}</span>
                      <span className="block text-base font-black">{t("beer.cashOpen")}</span>
                    </span>
                  </span>
                  <span className="font-black">→</span>
                </button>
                ) : null}
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

      {poolReminderOpen ? (
        <div className="fixed inset-0 z-[1100] flex touch-none items-center justify-center overscroll-none bg-slate-950/55 p-5 backdrop-blur-md" onMouseDown={(event) => { if (event.target === event.currentTarget) setPoolReminderOpen(false); }} onTouchMove={(event) => event.preventDefault()}>
          <div role="dialog" aria-modal="true" className="w-full max-w-xs rounded-[28px] border border-white/60 bg-white/80 p-5 text-center shadow-2xl shadow-slate-950/25 backdrop-blur-2xl">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-[#0070ba]">PayPal Pool</div>
            <div className="mt-2 text-sm font-bold text-slate-500">Merk dir den Betrag</div>
            <div className="mt-1 text-4xl font-black tracking-tight text-slate-950">{formatEuro(totalCents + donationCents, locale)}</div>
            <div className="mt-1 text-xs font-medium text-slate-500">Diesen Betrag gleich im Pool eingeben.</div>
            <a href={paypalUrl} onClick={preparePaypalPoolOpen} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0070ba] px-4 py-3.5 text-base font-black text-white active:scale-[0.99]">
              Zu PayPal <span>→</span>
            </a>
            <button type="button" onClick={() => setPoolReminderOpen(false)} className="mt-2 px-4 py-2 text-xs font-black text-slate-500">Abbrechen</button>
          </div>
        </div>
      ) : null}

    </>
  );
}
