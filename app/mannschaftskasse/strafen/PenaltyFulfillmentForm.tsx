"use client";

import { useState } from "react";
import { pilotPenaltyAction } from "./actions";

export type PenaltyPaymentMethod = {
  key: string;
  label: string;
  url: string;
};

export default function PenaltyFulfillmentForm({
  penaltyId, methods, isMoney, amountLabel,
}: {
  penaltyId: number;
  methods: PenaltyPaymentMethod[];
  isMoney: boolean;
  amountLabel?: string | null;
}) {
  const [method, setMethod] = useState(methods[0]?.key ?? "");
  const selected = methods.find((m) => m.key === method);
  return <form action={pilotPenaltyAction}
    className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
    <input type="hidden" name="penalty_id" value={penaltyId}/>
    <input type="hidden" name="action" value="report"/>
    {amountLabel ? <p className="rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-950">
      Zu zahlen: {amountLabel}
    </p> : null}
    {isMoney ? <label className="block text-xs font-black text-slate-800">
      Zahlungsweg für die Geldstrafe
      <select name="payment_method" value={method}
        onChange={(event) => setMethod(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
        {methods.length === 0 ? <option value="">Kein Zahlungsweg aktiviert</option> : null}
        {methods.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
      </select>
    </label> : <p className="rounded-lg bg-white px-3 py-3 text-xs font-semibold text-slate-800">Keine Geldzahlung erforderlich. Melde bitte die erfüllte Aufgabe oder den Joker.</p>}
    {isMoney && selected?.url ? (
      <a href={selected.url} target="_blank" rel="noopener noreferrer"
        className="block rounded-xl bg-teal-100 px-4 py-3 text-center text-sm font-black text-teal-950">
        {selected.label} öffnen ↗
      </a>
    ) : isMoney && selected?.key === "cash" ? (
      <p className="text-xs text-slate-700">Barzahlung zuerst persönlich übergeben und danach hier melden.</p>
    ) : isMoney ? (
      <p className="text-xs font-semibold text-amber-800">
        Für Geldstrafen muss der Admin zuerst einen Zahlungsweg aktivieren.
      </p>
    ) : null}
    <label className="block text-xs font-bold text-slate-700">
      Notiz für den Kassenwart (optional)
      <input name="note" maxLength={500} placeholder="z. B. via PayPal gerade bezahlt"
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"/>
    </label>
    <button disabled={isMoney && !methods.length}
      className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
      {isMoney ? "Zahlung melden" : "Erfüllung / Joker melden"}
    </button>
    <p className="text-xs leading-5 text-slate-600">
      Der Klick auf PayPal ist keine Zahlungsbestätigung. Erst wenn der Kassenwart
      den Eingang geprüft hat, wird die Strafe als bezahlt markiert und in der
      Mannschaftskasse gebucht. Bitte nicht allein durch Öffnen des Links melden.
    </p>
  </form>;
}
