"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Banknote, ChevronDown, CreditCard, Heart, X } from "lucide-react";
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
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [poolOpening, setPoolOpening] = useState(false);
  const [poolReminderOpen, setPoolReminderOpen] = useState(false);
  const [donationCents, setDonationCents] = useState(0);
  const [donationsOpen, setDonationsOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [cashSaving, setCashSaving] = useState(false);
  const [cashError, setCashError] = useState("");
  const totalCents = useMemo(() => quantity * priceCents, [quantity, priceCents]);

  async function handleCashPayment() {
    if (cashSaving) return;
    setCashSaving(true);
    setCashError("");

    const body = new FormData();
    body.set("quantity", String(quantity));
    body.set("payment_method", "cash");

    try {
      const response = await fetch("/api/mannschaftskasse/beer", {
        method: "POST",
        body,
        credentials: "same-origin",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "Bier konnte nicht eingetragen werden.");
      }

      setOpen(false);
      setSuccessOpen(true);
    } catch (error) {
      setCashError(error instanceof Error ? error.message : "Bier konnte nicht eingetragen werden.");
    } finally {
      setCashSaving(false);
    }
  }

  function preparePaypalPoolOpen(event: React.MouseEvent<HTMLAnchorElement>) {
    if (poolOpening) {
      event.preventDefault();
      return;
    }

    setPoolOpening(true);
    recordPoolBeer(quantity, donationCents);
  }

  useEffect(() => {
    if (searchParams.get("beer_saved") !== "cash") return;
    setOpen(false);
    setSuccessOpen(true);
    window.history.replaceState({}, "", window.location.pathname);
  }, [searchParams]);

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

  useEffect(() => {
    if (!successOpen) return;
    const preventTouch = (event: TouchEvent) => event.preventDefault();
    document.addEventListener("touchmove", preventTouch, { passive: false });
    return () => document.removeEventListener("touchmove", preventTouch);
  }, [successOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuantity(1);
          setPoolOpening(false);
          setPoolReminderOpen(false);
          setDonationCents(0);
          setCashError("");
          setCashSaving(false);
          setOpen(true);
        }}
        className="group relative flex min-h-16 w-full items-center justify-between gap-2 overflow-hidden rounded-2xl border border-cyan-300/50 bg-gradient-to-br from-cyan-400 via-teal-500 to-teal-700 px-3 py-3 text-left text-sm font-extrabold text-white shadow-[0_8px_22px_-12px_rgba(6,182,212,0.85)] transition hover:brightness-110 active:scale-[0.98] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_12%_95%,rgba(255,255,255,.28)_1px,transparent_2px)] before:bg-[length:9px_9px] before:opacity-40"
      >
        <span className="relative z-10 flex items-center gap-2"><span aria-hidden="true" className="text-xl">🍺</span><span>Bier bezahlen</span></span>
        <span aria-hidden="true" className="relative z-10 text-xl font-light">›</span>
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
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-teal-700">
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

            <form action={recordBeerAction} className="mt-4">
              <input type="hidden" name="quantity" value={quantity} />
              <input type="hidden" name="return_to" value="/home" />

              <div className="rounded-2xl bg-slate-50 px-3 py-3">
                <p className="mb-2 text-center text-xs font-semibold text-slate-500">Wie viele Bier?</p>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl font-bold text-slate-900" aria-label={t("beer.less")}>−</button>
                  <div className="text-center">
                    <div className="text-3xl font-black tabular-nums text-slate-950">{quantity}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bier</div>
                  </div>
                  <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-2xl font-bold text-white" aria-label={t("beer.more")}>+</button>
                </div>
              </div>

              <div className="mt-3 border-b border-slate-100 pb-3">
                <button type="button" aria-expanded={donationsOpen} onClick={() => setDonationsOpen((value) => !value)} className="flex w-full items-center justify-between gap-2 py-2 text-left">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800"><Heart className="h-4 w-4 shrink-0 text-slate-400" /> Mannschaftskasse unterstützen</span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-500">{donationCents ? "+" + formatEuro(donationCents, locale) : "Freiwillig"}<ChevronDown className={"h-4 w-4 transition-transform " + (donationsOpen ? "rotate-180" : "")} /></span>
                </button>
                {donationsOpen ? (
                  <div className="mt-2 grid grid-cols-5 gap-1.5">
                    {[0, 100, 200, 500, 1000].map((value) => (
                      <button key={value} type="button" aria-pressed={donationCents === value} onClick={() => { setDonationCents(value); setDonationsOpen(false); }} className={"rounded-lg border px-1 py-2.5 text-xs font-bold transition " + (donationCents === value ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-600")}>
                        {value === 0 ? "Ohne" : "+" + formatEuro(value, locale)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">Gesamt</span>
                <span className="text-2xl font-black tabular-nums text-slate-950">{formatEuro(totalCents + donationCents, locale)}</span>
              </div>

              <div className="mt-3 grid gap-2">
                {paypalEnabled ? (
                  paypalPool ? (
                    <button type="button" onClick={() => setPoolReminderOpen(true)} className="flex w-full items-center justify-between rounded-2xl bg-[#0070ba] px-4 py-4 text-left text-white shadow-sm active:scale-[0.99]">
                      <span><span className="block text-[10px] font-black uppercase tracking-[.16em] text-white/70">PayPal</span><span className="block text-base font-black">Bezahlen per PayPal</span></span>
                      <span className="font-black">→</span>
                    </button>
                  ) : (
                    <button name="payment_method" value="paypal" type="submit" className="flex w-full items-center justify-between rounded-2xl bg-[#0070ba] px-4 py-4 text-left text-white shadow-sm active:scale-[0.99]">
                      <span><span className="block text-[10px] font-black uppercase tracking-[.16em] text-white/70">PayPal</span><span className="block text-base font-black">Bezahlen per PayPal</span></span>
                      <span className="font-black">→</span>
                    </button>
                  )
                ) : null}

                {paypalMeEnabled && !paypalEnabled ? (
                  <button name="payment_method" value="paypal_me" type="submit" className="flex w-full items-center justify-between rounded-2xl bg-[#0070ba] px-4 py-4 text-left text-white shadow-sm active:scale-[0.99]">
                    <span className="flex items-center gap-3"><CreditCard className="h-5 w-5" /><span><span className="block text-[10px] font-black uppercase tracking-[.16em] text-white/70">PayPal</span><span className="block text-base font-black">Bezahlen per PayPal</span></span></span><span className="font-black">→</span>
                  </button>
                ) : null}

                {cashEnabled ? (
                <button type="button" onClick={handleCashPayment} disabled={cashSaving} className="flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white/65 px-4 py-4 text-left text-slate-950 shadow-sm active:scale-[0.99] disabled:opacity-60">
                  <span className="flex items-center gap-3">
                    <Banknote className="h-5 w-5 text-emerald-700" />
                    <span>
                      <span className="block text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">{t("beer.cash")}</span>
                      <span className="block text-base font-black">{cashSaving ? "Wird eingetragen …" : "Bar bezahlen"}</span>
                    </span>
                  </span>
                  <span className="font-black">→</span>
                </button>
                ) : null}
              </div>
              <div className="mt-3 pt-1">
  
                <div aria-disabled="true" className="flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                  <CreditCard className="h-3.5 w-3.5" /> SumUp · demnächst
                </div>
              </div>

              {cashError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-bold text-red-700">{cashError}</p> : null}

              <p className="mt-3 text-center text-[11px] font-medium leading-4 text-slate-500">
                {paypalPool
                  ? t("beer.poolHint")
                  : t("beer.normalHint")}
              </p>
            </form>
          </div>
        </div>
      ) : null}

      {successOpen ? (
        <div className="fixed inset-0 z-[1200] flex touch-none items-center justify-center overscroll-none bg-slate-950/55 p-5 backdrop-blur-md" onTouchMove={(event) => event.preventDefault()}>
          <div role="dialog" aria-modal="true" className="w-full max-w-xs rounded-[28px] border border-white/60 bg-white/80 p-5 text-center shadow-2xl shadow-slate-950/25 backdrop-blur-2xl">
            <div className="text-4xl">🍻</div>
            <div className="mt-2 text-xl font-black text-slate-950">Danke!</div>
            <div className="mt-2 text-sm font-semibold leading-5 text-slate-600">
              Dein Bier wurde eingetragen.
            </div>
            <div className="mt-3 rounded-2xl bg-white/60 px-4 py-3 text-xs font-semibold leading-5 text-slate-600">
              Dein Kassenwart bestätigt die Zahlung noch. Erst danach wird sie in deiner Statistik als bezahlt gewertet.
            </div>
            <button type="button" onClick={() => setSuccessOpen(false)} className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white active:scale-[0.99]">
              Fertig
            </button>
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
            <div className="mt-3 rounded-2xl bg-white/55 px-3 py-2.5 text-[11px] font-semibold leading-4 text-slate-600">Der Eintrag wird in strikr vorgemerkt. Dein Kassenwart bestätigt die Zahlung anschließend – erst dann zählt sie in deiner Statistik als bezahlt.</div>
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
