import Link from "next/link";
import { requirePowerUser } from "@/lib/auth/power-user";
import SetupWizard from "@/components/admin/SetupWizard";

const definitions = [
["club","Vereinsgrunddaten","Name, Sportart, Logo und Vereinsfarbe einrichten.",true],
["season","Saison festlegen","Die strikr-Standardsaison läuft ein Jahr. Trainings und Statistiken gehören zu einer Saison. Mit PRO lassen sich Name und Zeitraum anpassen.",true],
["training","Trainingsbetrieb einrichten","Trainingstage, Uhrzeiten und regelmäßige Termine innerhalb der Saison festlegen.",true],
["rsvp","Zu- und Absagen","Rückmeldefrist festlegen: Free 30 Minuten, mit PRO individuell. Nach PRO-Ende gelten wieder Free-Regeln.",false],
["teams","Faire Teams und Spielstärken","Der Generator gleicht die Mannschaftsstärken aus und berücksichtigt eure Einstellungen.",false],
["categories","Spielerkategorien","Zum Beispiel Torhüter und Feldspieler – damit die Teams sinnvoll eingeteilt werden.",false],
["games","Spielmodus und Spieluhr","Standard: einzelnes Spiel. Turnier nur mit PRO. Spieluhr optional mit Standarddauer.",false],
["pro","PRO-Testphase und Abschluss","28 Tage PRO-Testphase für neue Vereine: Vorteile kennenlernen und Free-Grenzen nach Ablauf verstehen.",false],
] as const;
export default async function WizardSimulatorPage() {
 await requirePowerUser();
 const steps=definitions.map(([id,title,description,required])=>({id,title,description,required,done:false,href:"/power-user/onboarding-simulator/wizard"}));
 return <main className="min-h-screen bg-slate-100 px-4 py-6"><div className="mx-auto max-w-3xl"><Link href="/power-user/onboarding-simulator" className="mb-4 inline-block text-sm font-semibold">← Zurück zum Einstiegssimulator</Link><p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Power-User-Vorschau: Alle 8 Onboarding-Schritte ohne Verein und ohne Datenbankänderungen testen. Die Testdaten bleiben ausschließlich in dieser Vorschau.</p><SetupWizard clubId="power-user-preview" clubName="Testverein" steps={steps} preview allowTest /></div></main>;
}
