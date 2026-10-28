"use client";

import Link from "next/link";
import { useState } from "react";
import CashboxPilotStructureSteps from "@/components/cashbox/CashboxPilotStructureSteps";
import type { PilotCashboxStructure } from "@/lib/cashbox/pilot-structure";
import { useI18n } from "@/components/i18n/I18nProvider";
import { saveCashboxAccountsAction } from "./actions";

export default function CashboxAccountsEditor({
  initialStructure,
}: {
  initialStructure: PilotCashboxStructure;
}) {
  const { locale } = useI18n();
  const en = locale === "en";
  const [structure, setStructure] = useState(initialStructure);
  const namesValid = structure.accounts.length <= 15 &&
    structure.accounts.every(account => account.name.trim().length > 0);
  return (
    <form action={saveCashboxAccountsAction} className="space-y-4">
      <input type="hidden" name="accounts_json" value={JSON.stringify({
        accounts: structure.accounts, routing: structure.routing,
      })}/>
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 sm:px-6">
        <CashboxPilotStructureSteps step="accounts" value={structure} onChange={setStructure}/>
      </div>
      <p className="text-xs leading-5 text-slate-600">{en
        ? "These entries describe real accounts and preferred destinations only. No bank is automatically connected, no live balance is imported, and saving does not post money."
        : "Diese Angaben beschreiben echte Konten und gewünschte Zielkonten. Es wird keine Bank automatisch verbunden, kein Live-Kontostand importiert und keine Geldbuchung ausgelöst."}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/mannschaftskasse" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800">
          {en ? "Back to cashbox" : "Zur Mannschaftskasse"}
        </Link>
        <button type="submit" disabled={!namesValid}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
          {en ? "Save accounts" : "Konten speichern"}
        </button>
      </div>
    </form>
  );
}
