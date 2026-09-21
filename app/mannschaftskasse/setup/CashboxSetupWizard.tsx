"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { saveCashboxSetupAction } from "./actions";

type PlayerOption = {
  id: number;
  userId: string;
  name: string;
  selected: boolean;
};

type Props = {
  premiumBeer: boolean;
  initialPenaltiesEnabled: boolean;
  initialContributionsEnabled: boolean;
  initialBeerEnabled: boolean;
  initialBeerPrice: string;
  initialPaypalUrl: string;
  initialBeerHomeEnabled: boolean;
  players: PlayerOption[];
  error?: string;
  isExistingSetup: boolean;
};

type StepId =
  | "penalties"
  | "contributions"
  | "beer"
  | "beer_price"
  | "paypal"
  | "beer_home"
  | "managers"
  | "review";

function ChoiceButton({
  active,
  title,
  text,
  onClick,
}: {
  active: boolean;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-[24px] border-2 p-5 text-left transition",
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-lg"
          : "border-slate-200 bg-white text-slate-950 hover:border-slate-300",
      ].join(" ")}
    >
      <div className="text-lg font-black">{title}</div>
      <div
        className={[
          "mt-1 text-sm font-medium leading-6",
          active ? "text-white/65" : "text-slate-500",
        ].join(" ")}
      >
        {text}
      </div>
    </button>
  );
}

function ToggleQuestion({
  value,
  onChange,
  yesTitle = "Ja, nutzen",
  noTitle = "Nein, nicht nutzen",
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  yesTitle?: string;
  noTitle?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ChoiceButton
        active={value}
        title={yesTitle}
        text="Wird für euren Club aktiviert."
        onClick={() => onChange(true)}
      />
      <ChoiceButton
        active={!value}
        title={noTitle}
        text="Bleibt ausgeblendet und kann später jederzeit aktiviert werden."
        onClick={() => onChange(false)}
      />
    </div>
  );
}

export default function CashboxSetupWizard({
  premiumBeer,
  initialPenaltiesEnabled,
  initialContributionsEnabled,
  initialBeerEnabled,
  initialBeerPrice,
  initialPaypalUrl,
  initialBeerHomeEnabled,
  players,
  error,
  isExistingSetup,
}: Props) {
  const [penaltiesEnabled, setPenaltiesEnabled] = useState(initialPenaltiesEnabled);
  const [contributionsEnabled, setContributionsEnabled] = useState(
    initialContributionsEnabled,
  );
  const [beerEnabled, setBeerEnabled] = useState(
    premiumBeer && initialBeerEnabled,
  );
  const [beerPrice, setBeerPrice] = useState(initialBeerPrice);
  const [paypalUrl, setPaypalUrl] = useState(initialPaypalUrl);
  const [beerHomeEnabled, setBeerHomeEnabled] = useState(
    initialBeerHomeEnabled,
  );
  const [managerIds, setManagerIds] = useState<string[]>(
    players.filter((player) => player.selected).map((player) => player.userId),
  );
  const [stepId, setStepId] = useState<StepId>("penalties");

  const steps = useMemo<StepId[]>(() => {
    const result: StepId[] = ["penalties", "contributions", "beer"];
    if (premiumBeer && beerEnabled) {
      result.push("beer_price", "paypal", "beer_home");
    }
    result.push("managers", "review");
    return result;
  }, [beerEnabled, premiumBeer]);

  const safeStepId = steps.includes(stepId) ? stepId : "managers";
  const safeStepIndex = Math.max(0, steps.indexOf(safeStepId));
  const progress = ((safeStepIndex + 1) / steps.length) * 100;

  function goNext() {
    const currentIndex = steps.indexOf(safeStepId);
    const next = steps[Math.min(currentIndex + 1, steps.length - 1)];
    setStepId(next);
  }

  function goBack() {
    const currentIndex = steps.indexOf(safeStepId);
    const previous = steps[Math.max(currentIndex - 1, 0)];
    setStepId(previous);
  }

  function toggleManager(userId: string) {
    setManagerIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  const canContinue =
    safeStepId !== "beer_price" ||
    /^\d+(?:[,.]\d{1,2})?$/.test(beerPrice.trim());

  return (
    <main className="fixed inset-0 z-[500] h-[100dvh] overflow-hidden bg-[#f5f6f8] text-slate-950">
      <form action={saveCashboxSetupAction} className="flex h-full min-h-0 flex-col">
        {penaltiesEnabled ? (
          <input type="hidden" name="penalties_enabled" value="on" />
        ) : null}
        {contributionsEnabled ? (
          <input type="hidden" name="contributions_enabled" value="on" />
        ) : null}
        {premiumBeer && beerEnabled ? (
          <input type="hidden" name="beer_enabled" value="on" />
        ) : null}
        <input type="hidden" name="beer_price" value={beerPrice} />
        <input type="hidden" name="paypal_url" value={paypalUrl} />
        {premiumBeer && beerEnabled && beerHomeEnabled ? (
          <input type="hidden" name="beer_home_enabled" value="on" />
        ) : null}
        {managerIds.map((userId) => (
          <input
            key={userId}
            type="hidden"
            name="manager_user_ids"
            value={userId}
          />
        ))}

        <div className="z-10 shrink-0 border-b border-slate-200 bg-[#f5f6f8]/95 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <Link
              href="/mannschaftskasse"
              className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-200"
            >
              ✕ Abbrechen
            </Link>
            <div className="text-center">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">
                Mannschaftskasse
              </div>
              <div className="text-xs font-black text-slate-700">
                Schritt {safeStepIndex + 1} von {steps.length}
              </div>
            </div>
            <div className="w-[82px]" />
          </div>

          <div className="mx-auto mt-3 h-1.5 max-w-3xl overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-slate-950 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-y-auto px-5 py-8 sm:justify-center sm:px-8 sm:py-10">
          {error ? (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
              {error}
            </div>
          ) : null}

          {safeStepId === "penalties" ? (
            <section>
              <div className="text-5xl">🤝</div>
              <div className="mt-6 text-xs font-black uppercase tracking-[.2em] text-slate-400">
                FBZG
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Wollt ihr FBZG nutzen?
              </h1>
              <p className="mt-3 max-w-xl text-base font-medium leading-7 text-slate-500">
                FBZG steht für „Freiwilliger Beitrag zur Gemeinschaft“ – euer augenzwinkernder Sammelbegriff für Kisten, Kuchen, Geldbeträge oder andere Teamregeln. Spieler können Vorfälle selbst melden.
              </p>
              <div className="mt-8">
                <ToggleQuestion
                  value={penaltiesEnabled}
                  onChange={setPenaltiesEnabled}
                />
              </div>
            </section>
          ) : null}

          {safeStepId === "contributions" ? (
            <section>
              <div className="text-5xl">💶</div>
              <div className="mt-6 text-xs font-black uppercase tracking-[.2em] text-slate-400">
                Beiträge
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Sammelt ihr Mannschaftsbeiträge?
              </h1>
              <p className="mt-3 max-w-xl text-base font-medium leading-7 text-slate-500">
                Beiträge anlegen und pro Spieler als offen, bezahlt oder befreit führen.
              </p>
              <div className="mt-8">
                <ToggleQuestion
                  value={contributionsEnabled}
                  onChange={setContributionsEnabled}
                />
              </div>
            </section>
          ) : null}

          {safeStepId === "beer" ? (
            <section>
              <div className="text-5xl">🍺</div>
              <div className="mt-6 text-xs font-black uppercase tracking-[.2em] text-slate-400">
                Bierkasse
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Wollt ihr eine Bierkasse nutzen?
              </h1>
              <p className="mt-3 max-w-xl text-base font-medium leading-7 text-slate-500">
                Bier eintragen, offene Beträge sehen und Barzahlung oder PayPal nutzen.
              </p>

              {premiumBeer ? (
                <div className="mt-8">
                  <ToggleQuestion value={beerEnabled} onChange={setBeerEnabled} />
                </div>
              ) : (
                <div className="mt-8 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
                  <div className="font-black text-amber-950">
                    Bierkasse+ ist für diesen Club noch nicht freigeschaltet.
                  </div>
                  <p className="mt-1 text-sm font-medium leading-6 text-amber-800/70">
                    Die restliche Mannschaftskasse kannst du trotzdem vollständig einrichten.
                  </p>
                </div>
              )}
            </section>
          ) : null}

          {safeStepId === "beer_price" ? (
            <section>
              <div className="text-5xl">💰</div>
              <div className="mt-6 text-xs font-black uppercase tracking-[.2em] text-slate-400">
                Bierpreis
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Was kostet ein Bier?
              </h1>
              <p className="mt-3 max-w-xl text-base font-medium leading-7 text-slate-500">
                Dieser Preis wird beim Eintragen automatisch verwendet.
              </p>
              <div className="relative mt-8 max-w-sm">
                <input
                  value={beerPrice}
                  onChange={(event) => setBeerPrice(event.target.value)}
                  inputMode="decimal"
                  autoFocus
                  className="w-full rounded-[24px] border-2 border-slate-200 bg-white px-5 py-5 pr-16 text-3xl font-black outline-none transition focus:border-slate-950"
                  placeholder="2,00"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">
                  €
                </span>
              </div>
            </section>
          ) : null}

          {safeStepId === "paypal" ? (
            <section>
              <div className="text-5xl">📲</div>
              <div className="mt-6 text-xs font-black uppercase tracking-[.2em] text-slate-400">
                PayPal
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Soll PayPal angeboten werden?
              </h1>
              <p className="mt-3 max-w-xl text-base font-medium leading-7 text-slate-500">
                Optional. Ohne Link bleibt Barzahlung möglich. Mit paypal.me kann strikr den Betrag direkt mitgeben.
              </p>
              <input
                value={paypalUrl}
                onChange={(event) => setPaypalUrl(event.target.value)}
                inputMode="url"
                className="mt-8 w-full rounded-[24px] border-2 border-slate-200 bg-white px-5 py-5 text-base font-bold outline-none transition focus:border-slate-950"
                placeholder="https://paypal.me/..."
              />
              <button
                type="button"
                onClick={() => setPaypalUrl("")}
                className="mt-3 text-sm font-black text-slate-500"
              >
                Ohne PayPal weitermachen
              </button>
            </section>
          ) : null}

          {safeStepId === "beer_home" ? (
            <section>
              <div className="text-5xl">🏠</div>
              <div className="mt-6 text-xs font-black uppercase tracking-[.2em] text-slate-400">
                Schnellzugriff
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                „Bier eintragen“ direkt auf Home?
              </h1>
              <p className="mt-3 max-w-xl text-base font-medium leading-7 text-slate-500">
                Damit ist die häufigste Aktion ohne Umweg direkt auf der Startseite erreichbar.
              </p>
              <div className="mt-8">
                <ToggleQuestion
                  value={beerHomeEnabled}
                  onChange={setBeerHomeEnabled}
                  yesTitle="Ja, auf Home"
                  noTitle="Nein, nur in der Kasse"
                />
              </div>
            </section>
          ) : null}

          {safeStepId === "managers" ? (
            <section>
              <div className="text-5xl">🔑</div>
              <div className="mt-6 text-xs font-black uppercase tracking-[.2em] text-slate-400">
                Kassenwart
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Wer darf die Kasse verwalten?
              </h1>
              <p className="mt-3 max-w-xl text-base font-medium leading-7 text-slate-500">
                Club-Admins dürfen das immer. Weitere Kassenwarte sind optional.
              </p>

              <div className="mt-8 max-h-[42vh] space-y-2 overflow-y-auto pr-1">
                {players.map((player) => {
                  const selected = managerIds.includes(player.userId);
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => toggleManager(player.userId)}
                      className={[
                        "flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition",
                        selected
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-900",
                      ].join(" ")}
                    >
                      <span className="font-black">{player.name}</span>
                      <span className="text-lg">{selected ? "✓" : "+"}</span>
                    </button>
                  );
                })}
                {players.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-500">
                    Noch keine verknüpften Mitglieder vorhanden. Club-Admins können die Kasse trotzdem verwalten.
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {safeStepId === "review" ? (
            <section>
              <div className="text-5xl">✅</div>
              <div className="mt-6 text-xs font-black uppercase tracking-[.2em] text-emerald-600">
                Fertig
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                So richtet ihr eure Mannschaftskasse ein.
              </h1>
              <p className="mt-3 max-w-xl text-base font-medium leading-7 text-slate-500">
                Du kannst den Wizard später jederzeit erneut öffnen und alles ändern.
              </p>

              <div className="mt-8 space-y-2">
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <span className="font-bold">FBZG</span>
                  <b>{penaltiesEnabled ? "An" : "Aus"}</b>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <span className="font-bold">Beiträge</span>
                  <b>{contributionsEnabled ? "An" : "Aus"}</b>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <span className="font-bold">Bierkasse</span>
                  <b>{premiumBeer && beerEnabled ? "An" : "Aus"}</b>
                </div>
                {premiumBeer && beerEnabled ? (
                  <>
                    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                      <span className="font-bold">Bierpreis</span>
                      <b>{beerPrice || "–"} €</b>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                      <span className="font-bold">PayPal</span>
                      <b>{paypalUrl.trim() ? "An" : "Aus"}</b>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                      <span className="font-bold">Home-Button</span>
                      <b>{beerHomeEnabled ? "An" : "Aus"}</b>
                    </div>
                  </>
                ) : null}
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <span className="font-bold">Zusätzliche Kassenwarte</span>
                  <b>{managerIds.length}</b>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <div className="z-10 shrink-0 border-t border-slate-200 bg-[#f5f6f8]/95 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={safeStepIndex === 0}
              className="min-h-12 flex-1 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Zurück
            </button>

            {safeStepId === "review" ? (
              <button
                type="submit"
                className="min-h-12 flex-[1.7] rounded-2xl bg-emerald-500 px-4 text-sm font-black text-white shadow-lg shadow-emerald-500/20"
              >
                {isExistingSetup ? "Änderungen speichern" : "Mannschaftskasse starten"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={!canContinue}
                className="min-h-12 flex-[1.7] rounded-2xl bg-slate-950 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Weiter
              </button>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}
