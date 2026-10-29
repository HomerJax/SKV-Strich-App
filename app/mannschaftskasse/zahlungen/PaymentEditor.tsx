"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { savePilotPenaltyPaymentsAction } from "./actions";

export type PenaltyPaymentValues={
 paypalMeUrl:string;
 paypalPoolUrl:string;
 sumupUrl:string;
 cashEnabled:boolean;
};

const input="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950";
export default function PaymentEditor({initial}:{initial:PenaltyPaymentValues}){
 const [payments,setPayments]=useState(initial);
 const {locale}=useI18n();const en=locale==="en";
 return <form action={savePilotPenaltyPaymentsAction} className="space-y-4">
  <input type="hidden" name="payments_json" value={JSON.stringify(payments)}/>
  <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
    <div>
      <h2 className="text-lg font-black text-slate-950">{en?"For fines only":"Nur für Strafen"}</h2>
      <p className="mt-1 text-sm text-slate-600">
        {en?"Add separate payment destinations for fines. Beer cashbox details are not used or changed."
          :"Diese Zahlungsziele gelten ausschließlich für Strafen. Die Bierkasse wird weder übernommen noch verändert."}
      </p>
    </div>
    <label className="block text-sm font-bold text-slate-900">
      PayPal.Me {en?"for fines":"für Strafen"}
      <input type="url" inputMode="url" className={input} placeholder="https://paypal.me/euername"
        value={payments.paypalMeUrl} maxLength={500}
        onChange={event=>setPayments(old=>({...old,paypalMeUrl:event.target.value}))}/>
      <span className="mt-1 block text-xs font-normal text-slate-500">
        {en?"Leave empty to disable.":"Leer lassen, falls ihr PayPal.Me nicht für Strafen nutzen möchtet."}
      </span>
    </label>
    <label className="block text-sm font-bold text-slate-900">
      PayPal-Pool {en?"for fines":"für Strafen"} <span className="font-normal text-slate-500">(optional)</span>
      <input type="url" inputMode="url" className={input} placeholder="https://www.paypal.com/pool/..."
        value={payments.paypalPoolUrl} maxLength={500}
        onChange={event=>setPayments(old=>({...old,paypalPoolUrl:event.target.value}))}/>
      <span className="mt-1 block text-xs font-normal text-slate-500">
        {en?"Only enter a pool intended for fines. The beer pool remains separate."
          :"Hier nur einen Pool eintragen, wenn er für Strafen gedacht ist. Euer Bier-Pool bleibt separat."}
      </span>
    </label>
    <label className="block text-sm font-bold text-slate-900">
      SumUp <span className="font-normal text-slate-500">(optional)</span>
      <input type="url" inputMode="url" className={input} placeholder="https://pay.sumup.com/..."
        value={payments.sumupUrl} maxLength={500}
        onChange={event=>setPayments(old=>({...old,sumupUrl:event.target.value}))}/>
    </label>
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900">
      <input type="checkbox" checked={payments.cashEnabled}
        onChange={event=>setPayments(old=>({...old,cashEnabled:event.target.checked}))}/>
      {en?"Allow cash for fines":"Barzahlung für Strafen zulassen"}
    </label>
    <p className="text-xs leading-5 text-slate-600">
      {en?"Players can report a transfer, but only a cashier's confirmation marks it paid."
        :"Ein Spieler kann seine Zahlung melden. Erst nach Prüfung und Bestätigung durch den Kassenwart wird die Strafe als bezahlt verbucht."}
    </p>
  </section>
  <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
    {en?"Save fine payment methods":"Zahlungswege für Strafen speichern"}
  </button>
 </form>;
}
