import Link from "next/link";
import type { Metadata } from "next";
import type { AppLocale } from "@/lib/i18n/config";
import LandingPageTracker from "@/components/analytics/LandingPageTracker";

type FeatureKey = "fair-teams" | "training" | "team-fund";

type FeatureCopy = {
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  intro: string;
  pointsHeading: string;
  points: string[];
  detailHeading: string;
  detail: string;
  cta: string;
  related: Array<{ href: string; label: string }>;
};

const pages: Record<FeatureKey, Record<AppLocale, FeatureCopy>> = {
  "fair-teams": {
    de: {
      path: "/faire-fussballteams",
      title: "Fußballteams fair einteilen – ausgewogene Teams | strikr",
      description: "Teilt Fußballteams für Training und Hobbyrunde möglichst ausgeglichen ein. strikr berücksichtigt eure Spielerstärken und unterstützt die Organisation vom Zusagen bis zum Ergebnis.",
      eyebrow: "Faire Teams für eure Fußballrunde",
      heading: "Fußballteams fair einteilen – ohne lange Diskussion",
      intro: "Wer spielt mit wem? strikr hilft Freizeit- und Amateurteams dabei, aus den anwesenden Spielern möglichst ausgeglichene Mannschaften zu bilden. Hinterlegte Stärken und Positionen geben dem Teamgenerator eine Orientierung; das Ergebnis bleibt jederzeit anpassbar.",
      pointsHeading: "So kommt ihr schneller zum Anpfiff",
      points: [
        "Anwesenheiten sammeln und nur die Zusagen für die Einteilung verwenden.",
        "Spielerstärken und Positionen für einen ausgewogeneren Vorschlag berücksichtigen.",
        "Teams prüfen, Spieler verschieben und die Aufstellung gemeinsam anpassen.",
        "Ergebnis festhalten und Tabelle sowie persönliche Werte weiterführen.",
      ],
      detailHeading: "Für Training, Alte Herren und Hobbyfußball",
      detail: "Ihr braucht keinen Ligabetrieb und keine komplizierte Planung. strikr verbindet Zu- und Absagen, faire Teamvorschläge und Ergebnisse in einem Ablauf, den euer Verein vor Ort oder schon vor dem Training nutzen kann.",
      cta: "Teams kostenlos starten",
      related: [
        { href: "/training-organisieren", label: "Trainingsorganisation ansehen" },
        { href: "/mannschaftskasse-app", label: "Mannschaftskasse ansehen" },
      ],
    },
    en: {
      path: "/faire-fussballteams",
      title: "Balance football teams fairly | strikr",
      description: "Create more balanced teams for football training and casual matches. strikr uses your roster, player ratings and positions, then lets organizers adjust the result.",
      eyebrow: "Fair teams for your football group",
      heading: "Split football teams fairly, without the debate",
      intro: "Who plays on which side? strikr helps amateur and recreational teams build more balanced lineups from the players who are attending. Saved ratings and positions guide the team generator, and organizers can always make adjustments.",
      pointsHeading: "Get from attendance to kick-off",
      points: [
        "Collect RSVPs and use the players who are actually attending.",
        "Use player ratings and positions to guide a more balanced suggestion.",
        "Review the teams, move players and adjust the lineup together.",
        "Save the result and keep your standings and player records up to date.",
      ],
      detailHeading: "For training, veterans and casual football",
      detail: "You do not need a league or a complicated setup. strikr brings RSVPs, balanced team suggestions and results into one workflow your club can use before or during training.",
      cta: "Start a team for free",
      related: [
        { href: "/training-organisieren", label: "See training organization" },
        { href: "/mannschaftskasse-app", label: "See the team fund" },
      ],
    },
  },
  training: {
    de: {
      path: "/training-organisieren",
      title: "Fußballtraining organisieren & Anwesenheit verwalten | strikr",
      description: "Organisiert Fußballtraining, Zu- und Absagen und faire Teams an einem Ort. strikr hält Ergebnisse, Tabellen und Statistiken auch ohne Ligabetrieb fest.",
      eyebrow: "Trainingsorganisation für Fußballteams",
      heading: "Fußballtraining organisieren – vom Termin bis zum Ergebnis",
      intro: "Wer kommt zum Training? Wer sagt ab? Mit strikr planen Freizeit- und Amateurteams ihre Termine, sammeln Zu- und Absagen und sehen auf einen Blick, mit wie vielen Spielern sie rechnen können.",
      pointsHeading: "Ein einfacher Ablauf für euren Trainingsabend",
      points: [
        "Trainingstermine planen – regelmäßig oder als einzelne Einheit.",
        "Zu- und Absagen im Team sammeln, statt Antworten aus dem Chat zusammenzusuchen.",
        "Aus den anwesenden Spielern faire Teams erstellen und vor Ort anpassen.",
        "Spielzeit und Ergebnis festhalten; Tabelle und Basis-Statistiken bleiben aktuell.",
      ],
      detailHeading: "Auch ohne Liga sinnvoll",
      detail: "strikr ist für Teams gedacht, die regelmäßig zusammen spielen, aber keinen Ligabetrieb brauchen. Die Grundorganisation bleibt kostenlos; optionale Pro-Funktionen ergänzen mehr Flexibilität und längere Auswertungen.",
      cta: "Kostenloses Team einrichten",
      related: [
        { href: "/faire-fussballteams", label: "Faire Teamaufteilung ansehen" },
        { href: "/mannschaftskasse-app", label: "Mannschaftskasse ansehen" },
      ],
    },
    en: {
      path: "/training-organisieren",
      title: "Organize football training and attendance | strikr",
      description: "Plan football training, collect RSVPs and create balanced teams in one place. strikr also keeps results and standings for teams outside a league.",
      eyebrow: "Training organization for football teams",
      heading: "Organize football training, from the invite to the result",
      intro: "Who is coming to training? Who cannot make it? strikr helps recreational and amateur teams plan sessions, collect RSVPs and see how many players to expect.",
      pointsHeading: "A simple workflow for training night",
      points: [
        "Plan recurring training dates or add a one-off session.",
        "Collect RSVPs in the team instead of searching through chat replies.",
        "Create balanced teams from attendees and adjust them on site.",
        "Track playing time and results while standings and basic stats stay current.",
      ],
      detailHeading: "Useful even without a league",
      detail: "strikr is built for teams that play together regularly without needing a league. Core organization is free; optional Pro features add more flexibility and a longer history.",
      cta: "Set up a team for free",
      related: [
        { href: "/faire-fussballteams", label: "See fair team selection" },
        { href: "/mannschaftskasse-app", label: "See the team fund" },
      ],
    },
  },
  "team-fund": {
    de: {
      path: "/mannschaftskasse-app",
      title: "Mannschaftskasse-App für Fußballteams | strikr",
      description: "Beitragsarten, Mannschaftskasse und Bierkasse für euer Fußballteam übersichtlich verwalten. strikr hält Einträge und Guthaben im Teamkontext fest.",
      eyebrow: "Mannschaftskasse für euer Team",
      heading: "Mannschaftskasse und Bierkasse übersichtlich verwalten",
      intro: "Beiträge, Ausgaben oder ein Getränk nach dem Training: Mit den Kassenfunktionen in strikr behaltet ihr Team-Einträge und den aktuellen Bestand an einem Ort im Blick.",
      pointsHeading: "Kassenbuchungen passend zum Vereinsalltag",
      points: [
        "Den aktuellen Bestand der Mannschaftskasse im Teamkontext ansehen.",
        "Beiträge und Buchungen verständlich dokumentieren.",
        "Bier für die Runde buchen und den offenen Stand nachvollziehen.",
        "Mit Pro weitere Beitragsarten, getrennte Zahlungswege, Filter und Historie nutzen.",
      ],
      detailHeading: "Übersichtlich statt Zettel und Nebenlisten",
      detail: "Die Kassenfunktionen ergänzen Trainingsorganisation und Teamverwaltung. strikr dokumentiert Einträge; die Seite verspricht keine Zahlungsabwicklung durch strikr. Die Bierkasse kann vorhandene Zahlungswege des Teams abbilden.",
      cta: "Team kostenlos starten",
      related: [
        { href: "/training-organisieren", label: "Trainingsorganisation ansehen" },
        { href: "/faire-fussballteams", label: "Faire Teamaufteilung ansehen" },
      ],
    },
    en: {
      path: "/mannschaftskasse-app",
      title: "Team fund app for football clubs | strikr",
      description: "Keep track of team contributions, the team fund and beer fund in one place. strikr records entries and balances alongside your team activity.",
      eyebrow: "A clear team fund for your club",
      heading: "Manage your team fund and beer fund in one place",
      intro: "Contributions, expenses or a drink after training: strikr helps your team keep fund entries and the current balance visible in one shared place.",
      pointsHeading: "Fund records that fit team life",
      points: [
        "See the current team fund balance in the context of your club.",
        "Record contributions and transactions clearly.",
        "Book beer for the group and follow the outstanding balance.",
        "Use Pro for additional contribution types, separate payment methods, filters and history.",
      ],
      detailHeading: "Clear records instead of side lists",
      detail: "The fund tools complement training organization and team management. strikr records entries; it does not claim to process payments. The beer fund can reflect payment methods already used by the team.",
      cta: "Start a team for free",
      related: [
        { href: "/training-organisieren", label: "See training organization" },
        { href: "/faire-fussballteams", label: "See fair team selection" },
      ],
    },
  },
};

export function getSeoFeatureMetadata(feature: FeatureKey, locale: AppLocale): Metadata {
  const copy = pages[feature][locale];
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: copy.path },
    openGraph: {
      type: "website",
      siteName: "strikr",
      title: copy.title,
      description: copy.description,
      url: copy.path,
    },
    twitter: {
      card: "summary",
      title: copy.title,
      description: copy.description,
    },
  };
}

export default function SeoFeaturePage({
  feature,
  locale,
}: {
  feature: FeatureKey;
  locale: AppLocale;
}) {
  const copy = pages[feature][locale];
  const isGerman = locale === "de";

  return (
    <main className="min-h-screen overflow-hidden bg-[#05080e] text-white">
      <LandingPageTracker />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-black tracking-tight text-white">strikr</Link>
        <Link href="/demo" data-analytics-event="seo_demo_click" className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/80 hover:bg-white/10">
          {isGerman ? "Live-Demo" : "Live demo"}
        </Link>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">{copy.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[1.05] tracking-[-0.05em] sm:text-6xl">{copy.heading}</h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">{copy.intro}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup?next=%2Fclub-setup" data-analytics-event="seo_signup_click" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-50">
              {copy.cta}
            </Link>
            <Link href="/demo" data-analytics-event="seo_demo_click" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10">
              {isGerman ? "Erst die Demo ansehen" : "Explore the demo first"}
            </Link>
          </div>
          <p className="mt-3 text-xs font-semibold text-white/40">{isGerman ? "Ohne Ligabetrieb · Kostenlos starten · Für Web, iOS und Android" : "No league required · Start for free · Web, iOS and Android"}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">{isGerman ? "So hilft strikr" : "How strikr helps"}</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{copy.pointsHeading}</h2>
        </div>
        <ul className="space-y-3">
          {copy.points.map((point) => (
            <li key={point} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-white/75 sm:px-5">
              <span className="mr-2 font-black text-cyan-200">✓</span>{point}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{copy.detailHeading}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">{copy.detail}</p>
          </div>
          <div className="rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.08] to-violet-400/[0.07] p-5 sm:p-6">
            <h2 className="text-lg font-black">{isGerman ? "strikr entdecken" : "Explore strikr"}</h2>
            <div className="mt-4 flex flex-col gap-3">
              {copy.related.map((item) => (
                <Link key={item.href} href={item.href} className="font-semibold text-cyan-100 underline decoration-cyan-300/30 underline-offset-4 hover:text-white">
                  {item.label}
                </Link>
              ))}
              <Link href="/pro" className="font-semibold text-violet-200 underline decoration-violet-300/30 underline-offset-4 hover:text-white">
                {isGerman ? "Free und Pro vergleichen" : "Compare Free and Pro"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>strikr · {isGerman ? "Training redefined." : "Training redefined."}</span>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/impressum" className="hover:text-white">{isGerman ? "Impressum" : "Legal notice"}</Link>
          <Link href="/datenschutz" className="hover:text-white">{isGerman ? "Datenschutz" : "Privacy"}</Link>
          <Link href="/support" className="hover:text-white">Support</Link>
        </div>
      </footer>
    </main>
  );
}
