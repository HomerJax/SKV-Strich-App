export type ProductMatrixRow = {
  area: string;
  feature: string;
  free: string;
  pro: string;
};

export const PRODUCT_MATRIX: ProductMatrixRow[] = [
  { area: "Team", feature: "Feste Spieler", free: "Bis 25", pro: "Mehr als 25" },
  { area: "Team", feature: "Gastspieler", free: "1 pro Termin", pro: "Mehrere pro Termin" },
  { area: "Team", feature: "Spielerposition & Stärke", free: "Enthalten", pro: "Enthalten" },
  { area: "Team", feature: "Aktiv / inaktiv", free: "Enthalten", pro: "Enthalten" },
  { area: "Generator", feature: "Faire Teams generieren", free: "Enthalten", pro: "Enthalten" },
  { area: "Generator", feature: "Teams manuell verschieben", free: "Enthalten", pro: "Enthalten" },
  { area: "Generator", feature: "Aktive Kategorien", free: "Bis 2", pro: "Mehr als 2" },
  { area: "Generator", feature: "Balanced Groups", free: "1 Gruppe", pro: "Mehrere Gruppen" },
  { area: "Saison", feature: "Laufende Saison", free: "strikr Standard Saison", pro: "Individuell" },
  { area: "Saison", feature: "Eigener Name / Start / Ende", free: "🔒", pro: "Enthalten" },
  { area: "Saison", feature: "Mehrere Saisons", free: "🔒", pro: "Enthalten" },
  { area: "Saison", feature: "Saisonarchiv", free: "🔒", pro: "Enthalten" },
  { area: "Termine", feature: "1 oder 2 Trainingstage / Woche", free: "Enthalten", pro: "Enthalten" },
  { area: "Termine", feature: "Trainingszeit ändern", free: "Enthalten", pro: "Enthalten" },
  { area: "Termine", feature: "Zu- / Absage", free: "Enthalten", pro: "Enthalten" },
  { area: "Termine", feature: "RSVP-Deadline", free: "30 Min. fest", pro: "Frei konfigurierbar" },
  { area: "Termine", feature: "Pflichtgrund bei Absage", free: "🔒", pro: "Enthalten" },
  { area: "Spiel", feature: "Spiele pro Termin", free: "1", pro: "Bis 2" },
  { area: "Spiel", feature: "Spieluhr", free: "Komplett enthalten", pro: "Komplett enthalten" },
  { area: "Ergebnis", feature: "Ergebnis & Siegerfoto", free: "Enthalten", pro: "Enthalten" },
  { area: "Ergebnis", feature: "Share Cards", free: "Enthalten", pro: "Enthalten" },
  { area: "Tabelle", feature: "Aktuelle Saison", free: "Einsätze & Siege", pro: "Plus Siegquote" },
  { area: "Tabelle", feature: "All-Time / Karriere", free: "🔒", pro: "Enthalten" },
  { area: "Stats", feature: "Meine Stats", free: "Einsätze & Siege", pro: "Plus Quote, Karriere & Tiefe" },
  { area: "Stats", feature: "Aktuelle Form", free: "Letzte 3 Spiele", pro: "3 / 5 / 10 / Saison" },
  { area: "Stats", feature: "Team Impact & tiefe Vergleiche", free: "🔒", pro: "Enthalten" },
  { area: "Badges", feature: "Saison-Badges", free: "Enthalten", pro: "Enthalten" },
  { area: "Badges", feature: "Karriere-Badges", free: "Teaser / 🔒", pro: "Enthalten" },
  { area: "Hall of Fame", feature: "Basis-Vergleich", free: "Enthalten", pro: "Enthalten" },
  { area: "Hall of Fame", feature: "Siegquote / Badge-Vergleich / Historie", free: "🔒", pro: "Enthalten" },
  { area: "Kommunikation", feature: "Kabinen-Talk", free: "Enthalten", pro: "Enthalten" },
  { area: "Kommunikation", feature: "Chat", free: "Enthalten", pro: "Enthalten" },
  { area: "Kommunikation", feature: "Ankündigungen & Push", free: "Enthalten", pro: "Enthalten" },
  { area: "Kasse", feature: "Gesamtbestand", free: "Enthalten", pro: "Enthalten" },
  { area: "Kasse", feature: "PayPal / Bar getrennt", free: "🔒", pro: "Enthalten" },
  { area: "Kasse", feature: "Beitragsarten", free: "1", pro: "Mehrere" },
  { area: "Kasse", feature: "Transaktionshistorie", free: "Letzte 5", pro: "Vollständig + Filter" },
  { area: "FBZG", feature: "Einfacher FBZG-Eintrag", free: "Enthalten", pro: "Enthalten" },
  { area: "FBZG", feature: "Regeln / Vorlagen / Fälligkeit / Eskalation", free: "🔒", pro: "Enthalten" },
  { area: "Bierkasse", feature: "Bier buchen & bezahlen", free: "Enthalten", pro: "Enthalten" },
  { area: "Bierkasse", feature: "PayPal Pool / PayPal.Me / SumUp / Bar", free: "Enthalten", pro: "Enthalten" },
  { area: "Bierkasse", feature: "Statistik / Rangliste / Badges / Gönner", free: "🔒", pro: "Enthalten" },
  { area: "Admin", feature: "Admins & Kassenwart", free: "Enthalten", pro: "Enthalten" },
  { area: "Admin", feature: "Logo / Farbe / Sprache", free: "Enthalten", pro: "Enthalten" },
];

export const FREE_HIGHLIGHTS = [
  "Bis 25 feste Spieler",
  "Zusagen, faire Teams und 1 Spiel pro Training",
  "Aktuelle Saison mit Tabelle und Basis-Stats",
  "Ergebnisse, Siegerfotos und Share Cards",
  "Kabinen-Talk, Chat, Push und Ankündigungen",
  "Mannschaftskasse, Bier buchen und bezahlen",
];

export const PRO_HIGHLIGHTS = [
  "Mehr Spieler, Gäste, Kategorien und Balanced Groups",
  "Zweites Spiel und flexible RSVP-Regeln",
  "Eigene Saisons, Archiv und Karriere-Historie",
  "Siegquote, tiefere Stats, Vergleiche und Karriere-Badges",
  "Erweiterte Mannschafts- und Bierkassen-Auswertungen",
];
