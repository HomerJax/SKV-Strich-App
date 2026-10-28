"use client";

import type { PilotCashboxStructure, PilotAccountKind } from "@/lib/cashbox/pilot-structure";
import { useI18n } from "@/components/i18n/I18nProvider";

type Step = "accounts" | "payments";
type Props = {
  step: Step;
  value: PilotCashboxStructure;
  onChange: (next: PilotCashboxStructure) => void;
};

const KINDS: PilotAccountKind[] = ["bank", "bank_subaccount", "cash", "paypal", "sumup"];

export default function CashboxPilotStructureSteps({ step, value, onChange }: Props) {
  const { locale } = useI18n();
  const en = locale === "en";
  const labels: Record<PilotAccountKind, string> = en
    ? { bank: "Bank account", bank_subaccount: "Real bank sub-account", cash: "Cash", paypal: "PayPal", sumup: "SumUp clearing" }
    : { bank: "Bankkonto", bank_subaccount: "Echtes Bank-Unterkonto", cash: "Barkasse", paypal: "PayPal", sumup: "SumUp-Verrechnung" };
  const inputClass = "mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-slate-950 focus:outline-none";
  const sectionTitle = "mt-3 text-3xl font-black tracking-tight sm:text-4xl";
  const description = "mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500";

  if (step === "accounts") {
    return (
      <section>
        <div className="text-5xl">🏦</div>
        <p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-slate-400">{en ? "Real accounts" : "Echte Konten"}</p>
        <h1 className={sectionTitle}>{en ? "Where is the money actually held?" : "Wo liegt euer Geld tatsächlich?"}</h1>
        <p className={description}>{en
          ? "Add each real bank account, sub-account, cash box or payment account separately. A genuine bank sub-account is not just a virtual budget."
          : "Erfasse jedes echte Bankkonto, echte Unterkonto, Bargeld- oder Zahlungskonto separat. Ein echtes Ü32-Bank-Unterkonto ist kein virtueller Topf."}</p>
        <div className="mt-6 space-y-3">
          {value.accounts.map((account, index) => (
            <div key={account.key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">{en ? "Account" : "Konto"} {index + 1}</span>
                <button type="button" className="text-xs font-bold text-rose-700" onClick={() => onChange({
                  ...value, accounts: value.accounts.filter(a => a.key !== account.key),
                  routing: Object.fromEntries(Object.entries(value.routing).map(([key, route]) => [key, route === account.key ? "" : route])) as PilotCashboxStructure["routing"],
                })}>{en ? "Remove" : "Entfernen"}</button>
              </div>
              <label className="block text-xs font-black text-slate-600">{en ? "Account name" : "Kontoname"}
                <input value={account.name} maxLength={80} className={inputClass} placeholder={en ? "e.g. U32 bank sub-account" : "z. B. Ü32 Bank-Unterkonto"}
                  onChange={event => onChange({ ...value, accounts: value.accounts.map(a => a.key === account.key ? { ...a, name: event.target.value } : a) })}/>
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-black text-slate-600">{en ? "Account type" : "Kontotyp"}
                  <select className={inputClass} value={account.kind} onChange={event => onChange({
                    ...value, accounts: value.accounts.map(a => a.key === account.key ? { ...a, kind: event.target.value as PilotAccountKind } : a),
                  })}>
                    {KINDS.map(kind => <option key={kind} value={kind}>{labels[kind]}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-black text-slate-600">{en ? "Optional identifier (e.g. last 4 digits)" : "Kennung optional (z. B. letzte 4 Stellen)"}
                  <input className={inputClass} value={account.reference} maxLength={80} placeholder="…1234" onChange={event => onChange({
                    ...value, accounts: value.accounts.map(a => a.key === account.key ? { ...a, reference: event.target.value } : a),
                  })}/>
                </label>
              </div>
            </div>
          ))}
        </div>
        {value.accounts.length < 15 ? (
          <button type="button" className="mt-4 w-full rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900" onClick={() => onChange({
            ...value, accounts: [...value.accounts, { key: "account_" + crypto.randomUUID().replace(/-/g, ""), name: "", kind: "bank", reference: "" }],
          })}>{en ? "+ Add a real account" : "+ Echtes Konto hinzufügen"}</button>
        ) : null}
        {value.accounts.length === 0 ? <p className="mt-3 text-xs font-bold text-amber-800">{en ? "Add at least one real account to continue." : "Bitte mindestens ein echtes Konto anlegen."}</p> : null}
        {value.accounts.length > 0 ? (
          <div className="mt-6 space-y-3 rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <div className="text-sm font-black text-teal-950">{en ? "Default destination for each type of income" : "Standard-Zuordnung pro Einnahmeart"}</div>
            <p className="text-xs leading-5 text-teal-900/70">{en
              ? "This sets your desired target account. Money received via another payment account stays there until a real transfer is recorded. Automatic posting is not active yet."
              : "Hier legst du das gewünschte Zielkonto fest. Geht Geld tatsächlich auf einem anderen Zahlungskonto ein, bleibt es dort bis zur echten Umbuchung. Automatische Kontobuchungen sind im Pilot noch nicht aktiv."}</p>
            {([
              ["contributions", en ? "Membership fees" : "Mitgliedsbeiträge"],
              ["penalties", en ? "Penalties / FBZG" : "Strafen / FBZG"],
              ["beer", en ? "Beer income" : "Biergeld"],
            ] as const).map(([key, name]) => (
              <label key={key} className="block text-xs font-black text-teal-950">{name}
                <select value={value.routing[key]} className={inputClass} onChange={event => onChange({ ...value, routing: { ...value.routing, [key]: event.target.value } })}>
                  <option value="">{en ? "Decide later" : "Später festlegen"}</option>
                  {value.accounts.map(account => <option key={account.key} value={account.key}>{account.name || (en ? "Unnamed account" : "Unbenanntes Konto")}</option>)}
                </select>
              </label>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section>
      <div className="text-5xl">💳</div>
      <p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-slate-400">{en ? "Team cashbox payments" : "Zahlungen an die Mannschaftskasse"}</p>
      <h1 className={sectionTitle}>{en ? "How can members pay?" : "Wie können Spieler bezahlen?"}</h1>
      <p className={description}>{en
        ? "Configure payment destinations for membership fees and penalties. These are independent from the beer cashbox and can be copied there separately."
        : "Lege Zahlungsziele für Beiträge und Strafen fest. Diese Angaben sind unabhängig von der Bierkasse und können später auf Wunsch übernommen werden."}</p>
      <div className="mt-7 space-y-4">
        {([
          ["paypalPoolUrl", "PayPal-Pool", "https://www.paypal.com/pool/..."],
          ["paypalMeUrl", "PayPal.Me", "https://paypal.me/euerverein"],
          ["sumupUrl", "SumUp", "https://pay.sumup.com/..."],
        ] as const).map(([key, label, placeholder]) => (
          <label key={key} className="block text-sm font-black">{label}
            <input className={inputClass} value={value.payments[key]} type="url" inputMode="url" placeholder={placeholder}
              onChange={event => onChange({ ...value, payments: { ...value.payments, [key]: event.target.value } })}/>
          </label>
        ))}
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black">
          <input type="checkbox" checked={value.payments.cashEnabled} onChange={event => onChange({ ...value, payments: { ...value.payments, cashEnabled: event.target.checked } })}/>
          {en ? "Allow cash payments" : "Barzahlung anbieten"}
        </label>
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-500">{en
        ? "Payment links do not confirm a transfer. A treasurer must verify actual incoming money. This wizard only saves settings, without posting any money."
        : "Ein Zahlungslink bestätigt noch keinen Geldeingang. Das muss der Kassenwart prüfen. Dieser Wizard speichert zunächst nur Einstellungen und erzeugt keine Geldbuchung."}</p>
    </section>
  );
}
