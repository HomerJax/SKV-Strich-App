"use client";
import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import CashboxPilotStructureSteps from "@/components/cashbox/CashboxPilotStructureSteps";
import type { PilotCashboxStructure } from "@/lib/cashbox/pilot-structure";
import { savePilotPenaltyPaymentsAction } from "./actions";
export default function PaymentEditor({initial}:{initial:PilotCashboxStructure}){
 const [structure,setStructure]=useState(initial);
 const {locale}=useI18n();
 return <form action={savePilotPenaltyPaymentsAction} className="space-y-4">
  <input type="hidden" name="payments_json" value={JSON.stringify(structure.payments)}/>
  <section className="rounded-2xl border border-slate-200 bg-white p-4">
   <CashboxPilotStructureSteps step="payments" value={structure} onChange={setStructure}/>
  </section>
  <button className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">{locale==="en"?"Save payment methods":"Zahlungswege speichern"}</button>
 </form>;
}