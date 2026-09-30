"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard } from "lucide-react";
import { recordBeerAction } from "./actions";
import { useI18n } from "@/components/i18n/I18nProvider";

function formatEuro(cents: number, locale: "de" | "en") {
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

export default function BeerCheckoutCard({
  priceCents,
  myTotal,
  badge,
  paypalEnabled,
  paypalPool,
  paypalUrl,
  paypalMeEnabled,
  sumupEnabled,
  cashEnabled,
}: {
  priceCents: number;
  myTotal: number;
  badge: string | null;
  paypalEnabled: boolean;
  paypalPool: boolean;
  paypalUrl: string;
  paypalMeEnabled: boolean;
  sumupEnabled: boolean;
  cashEnabled: boolean;
}) {
  const { locale, t } = useI18n();
  const [quantity, setQuantity] = useState(1);
  const [poolOpening, setPoolOpening] = useState(false);
  const [poolConfirmOpen, setPoolConfirmOpen] = useState(false);
  const [donationCents, setDonationCents] = useState(0);
  const totalCents = useMemo(() => quantity * priceCents, [quantity, priceCents]);

  useEffect(() => {
    if (!poolConfirmOpen) return;

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

    return () => {
      body.style.overflow = previous.overflow;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [poolConfirmOpen]);

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
    recordPoolBeer(quantity, donationCents);
  }

  return (
    <section id="bierkasse" className="rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-700">🍺 {t("beer.title")}</div>
          <h2 className="mt-1 text-xl font-black text-slate-950">{t("cashbox.addBeer")}</h2>
          <p className="mt-1 text-xs font-medium text-slate-600">
            {t("cashbox.perBeerStand", {
              price: formatEuro(priceCents, locale),
              count: myTotal,
              badge: badge ? ` · ${badge}` : "",
            })}
          </p>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black text-white">PREMIUM</span>
      </div>

      <form action={recordBeerAction} className="mt-5">
        <input type="hidden" name="quantity" value={quantity} />
        <input type="hidden" name="return_to" value="/mannschaftskasse" />

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-white p-3">
          <div>
            <div className="text-xs font-bold text-slate-500">{t("cashbox.howManyBeer")}</div>
            <div className="mt-0.5 text-2xl font-black text-slate-950">{t("cashbox.beerCount", { count: quantity })}</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl font-black text-slate-900" aria-label={t("cashbox.oneLessBeer")}>−</button>
            <div className="w-10 text-center text-xl font-black">{quantity}</div>
            <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-xl font-black text-white" aria-label={t("cashbox.oneMoreBeer")}>+</button>
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
                      ? t("cashbox.payPaypal", { price: formatEuro(totalCents, locale) })
                      : formatEuro(totalCents, locale)}
                  </span>
                </span>
              </span>
              <span className="font-black">→</span>
            </button>
          ) : null}

          {paypalMeEnabled ? (
            <button name="payment_method" value="paypal_me" className="flex items-center justify-between rounded-2xl bg-[#0070ba] px-4 py-3.5 text-left text-white shadow-sm">
              <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /><span><span className="block text-[10px] font-black uppercase tracking-[.16em] text-white/70">PayPal.Me</span><span className="block text-sm font-black">{formatEuro(totalCents, locale)}</span></span></span><span className="font-black">→</span>
            </button>
          ) : null}
          {sumupEnabled ? (
            <button name="payment_method" value="sumup" className="flex items-center justify-between rounded-2xl border border-sky-200 bg-white px-4 py-3.5 text-left text-slate-950 shadow-sm">
              <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-sky-700" /><span><span className="block text-[10px] font-black uppercase tracking-[.16em] text-sky-700">SumUp</span><span className="block text-sm font-black">{formatEuro(totalCents, locale)} · Link öffnen</span></span></span><span className="font-black">→</span>
            </button>
          ) : (
            <button type="button" disabled className="flex cursor-not-allowed items-center justify-between rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3.5 text-left text-slate-400 opacity-70">
              <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /><span><span className="block text-[10px] font-black uppercase tracking-[.16em]">SumUp</span><span className="block text-sm font-black">Demnächst</span></span></span>
            </button>
          )}
          {cashEnabled ? (
            <button name="payment_method" value="cash" className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 text-left text-slate-950 shadow-sm">
              <span className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-emerald-700" />
                <span>
                  <span className="block text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">{t("cashbox.cash")}</span>
                  <span className="block text-sm font-black">{t("cashbox.cashOpen", { price: formatEuro(totalCents, locale) })}</span>
                </span>
              </span>
              <span className="font-black">→</span>
            </button>
          ) : null}
        </div>

        <p className="mt-2 text-[11px] font-medium leading-4 text-slate-500">
          {paypalPool
            ? t("cashbox.paypalPoolHint")
            : t("cashbox.beerCountHint")}
        </p>
      </form>
      {poolConfirmOpen ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center overflow-hidden bg-slate-950/65 p-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:items-center sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="cashbox-paypal-pool-hint-title" className="max-h-[calc(100dvh-6.5rem-env(safe-area-inset-bottom))] w-full touch-pan-y overflow-y-auto overscroll-contain rounded-t-[28px] bg-white p-5 shadow-2xl [-webkit-overflow-scrolling:touch] sm:max-h-[calc(100dvh-2rem)] sm:max-w-sm sm:rounded-[28px]">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-[#0070ba]">
              {t("cashbox.paypalPool")}
            </div>
            <h3 id="cashbox-paypal-pool-hint-title" className="mt-1 text-2xl font-black text-slate-950">
              🍺 {t("cashbox.beerCount", { count: quantity })} · {formatEuro(totalCents, locale)}
            </h3>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              {t("cashbox.paypalPoolText", { price: formatEuro(totalCents, locale) })}
            </p>
            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
              {t("cashbox.paypalTrust")}
            </div>
            <div className="mt-4">
              <div className="text-sm font-black text-slate-950">Mannschaftskasse freiwillig unterstützen?</div>
              <div className="mt-1 text-xs font-medium text-slate-500">Optional – kommt zusätzlich in eure Mannschaftskasse. </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[0, 100, 200, 500].map((value) => (
                  <button key={value} type="button" onClick={() => setDonationCents(value)} className={"rounded-xl border px-2 py-2.5 text-xs font-black " + (donationCents === value ? "border-cyan-500 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-600")}>
                    {value === 0 ? "Nein danke" : "+" + formatEuro(value, locale)}
                  </button>
                ))}
              </div>
              {donationCents > 0 ? <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">Zu zahlen: {formatEuro(totalCents + donationCents, locale)} · davon {formatEuro(donationCents, locale)} freiwillig 💚</div> : null}
            </div>
            <a
              href={paypalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={preparePaypalPoolOpen}
              className="mt-4 block w-full rounded-2xl bg-[#0070ba] px-4 py-4 text-center text-sm font-black text-white shadow-sm"
            >
              {t("cashbox.rememberPaypal", { price: formatEuro(totalCents + donationCents, locale) })}
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
    </section>
  );
}
