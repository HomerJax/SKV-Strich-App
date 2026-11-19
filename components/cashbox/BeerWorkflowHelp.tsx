type Audience = "player" | "manager" | "ranking" | "setup";

const help: Record<Audience, { title: string; steps: string[] }> = {
  player: {
    title: "So funktioniert die Bierkasse",
    steps: [
      "Wähle die Anzahl deiner Biere und eine angebotene Zahlungsart.",
      "Bei Barzahlung gibst du das Geld an den Kassenwart. Bei PayPal oder SumUp führst du die Zahlung im geöffneten Zahlungsdienst aus.",
      "Deine Buchung bleibt zunächst offen. Der Kassenwart prüft den tatsächlichen Zahlungseingang und bestätigt sie.",
      "Erst bestätigte, nicht stornierte Biere zählen für die Rangliste. Eine Buchung allein ist kein Zahlungsnachweis.",
    ],
  },
  manager: {
    title: "So prüfst du Bierzahlungen",
    steps: [
      "Offen bedeutet: Die Buchung ist erfasst, der Zahlungseingang aber noch nicht bestätigt.",
      "Bei Barzahlung kontrollierst du, ob du das Geld tatsächlich erhalten hast. Bei PayPal oder SumUp prüfst du den Eingang direkt beim Zahlungsanbieter.",
      "Klicke erst danach auf „Geprüft & bestätigt“. Nur bestätigte Buchungen zählen für die Rangliste.",
      "Bei Fehlern kannst du die Bieranzahl korrigieren, eine Buchung stornieren oder eine bereits bestätigte Zahlung wieder öffnen. Prüfe gegebenenfalls auch abweichende digitale Zahlungsbeträge.",
      "Die Zahlungseingänge werden derzeit nicht automatisch mit PayPal oder SumUp abgeglichen.",
    ],
  },
  ranking: {
    title: "Wie wird die Bier-Rangliste berechnet?",
    steps: [
      "Gezählt wird die Summe der Biere aus bestätigten, nicht stornierten Buchungen – nicht die Anzahl der Zahlungsvorgänge.",
      "Offene Buchungen zählen erst nach Prüfung und Bestätigung durch den Kassenwart.",
      "Free zeigt die Rangliste der aktuellen Saison. Mit Pro lassen sich vergangene Saisons und die ewige Tabelle ansehen.",
      "In der aufgeklappten Spielerzeile siehst du Buchungsdatum, Anzahl und Zahlungsart. Das Buchungsdatum ist nicht zwingend der Trink- oder Zahlungszeitpunkt.",
    ],
  },
  setup: {
    title: "So läuft die Bierkasse im Verein",
    steps: [
      "Admins aktivieren die Bierkasse und legen Preis, Zahlungswege und Kassenwarte fest.",
      "Spieler buchen ihre Biere und bezahlen über den ausgewählten Weg.",
      "Kassenwarte kontrollieren den tatsächlichen Geldeingang und bestätigen die Buchung manuell.",
      "Erst bestätigte Biere zählen in der Saison-Rangliste (Free und Pro). Vergangene Saisons und die ewige Tabelle sind Pro-Funktionen.",
    ],
  },
};

export default function BeerWorkflowHelp({ audience, className = "" }: { audience: Audience; className?: string }) {
  const item = help[audience];
  return (
    <details className={`group rounded-xl border border-slate-200 bg-white text-slate-800 ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-400 text-xs">i</span>
        <span>{item.title}</span>
        <span aria-hidden="true" className="ml-auto text-slate-400 group-open:rotate-180">⌄</span>
      </summary>
      <ol className="list-decimal space-y-2 border-t border-slate-100 px-7 py-3 text-xs font-medium leading-5 text-slate-600">
        {item.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
    </details>
  );
}
