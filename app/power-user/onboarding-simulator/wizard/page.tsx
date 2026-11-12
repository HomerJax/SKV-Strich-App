import Link from "next/link";
import { requirePowerUser } from "@/lib/auth/power-user";
import SetupWizard from "@/components/admin/SetupWizard";

const definitions = [
["club","Vereinsgrunddaten","Name, Sportart, Logo und Vereinsfarbe festlegen.",true],
["players","Mitspieler einladen","Einladungslink per WhatsApp teilen; Mitspieler treten selbst bei.",false],
["training","Trainingsbetrieb einrichten","Wochentage und Uhrzeiten für die Saison festlegen.",true],
["leaders","Trainingsleiter","Weitere Trainingsleiter bestimmen.",false],
["teams","Faire Teams und Spielstärken","Einstellungen für die Teamaufteilung kennenlernen.",false],
["categories","Spielerkategorien","Spielgruppen und Kategorien kennenlernen.",false],
["rsvp","Zu- und Absagen","Rückmeldefristen und Regeln kennenlernen.",false],
["games","Spiele und Turniere","Spiele, Ergebnisse und Spieluhr entdecken.",false],
["stats","Statistiken","Statistiken und Auszeichnungen entdecken.",false],
["cashbox","Mannschaftskasse","Beiträge und Strafen entdecken.",false],
["notifications","Kommunikation","Ankündigungen und Benachrichtigungen entdecken.",false],
["season","Saison & individuelle Zeiträume","Die strikr-Standardsaison gilt automatisch. Individuelle Zeiträume sind PRO vorbehalten.",false],
["pro","PRO-Funktionen","Optionale PRO-Funktionen kennenlernen.",false],
] as const;
export default async function WizardSimulatorPage() {
 await requirePowerUser();
 const steps=definitions.map(([id,title,description,required])=>({id,title,description,required,done:false,href:"/power-user/onboarding-simulator/wizard"}));
 return <main className="min-h-screen bg-slate-100 px-4 py-6"><div className="mx-auto max-w-3xl"><Link href="/power-user/onboarding-simulator" className="mb-4 inline-block text-sm font-semibold">← Zurück zum Einstiegssimulator</Link><p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Power-User-Vorschau: Alle 13 Bereiche ohne Verein und ohne Datenbankänderungen testen. Die Testdaten bleiben ausschließlich in dieser Vorschau.</p><SetupWizard clubId="power-user-preview" clubName="Testverein" steps={steps} preview allowTest /></div></main>;
}
