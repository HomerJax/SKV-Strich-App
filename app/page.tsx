import NativeAppEntryRedirect from "@/components/native/NativeAppEntryRedirect";
import LandingPageTracker from "@/components/analytics/LandingPageTracker";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  Camera,
  ChartColumn,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const trainingBlocks = [
  {
    title: "Anwesenheit",
    text: "Wer ist da? Wer fehlt? Alles klar, ohne Chat-Chaos.",
    icon: Users,
  },
  {
    title: "Faire Teams",
    text: "Teams schnell erstellen, anpassen und direkt ins Training starten.",
    icon: Sparkles,
  },
  {
    title: "Ergebnis & Siegerfoto",
    text: "Ergebnis speichern, Moment festhalten und direkt teilbar machen.",
    icon: Camera,
  },
];

const competitionBlocks = [
  {
    title: "MVP Voting",
    text: "4 MVP-Abstimmungen pro Saison inklusive – mit Pro unbegrenzt.",
    icon: Star,
  },
  {
    title: "Tabelle & Share Cards",
    text: "Aktuelle Tabelle, Siege und Rankings werden sichtbar und teilbar.",
    icon: Trophy,
  },
  {
    title: "Stats & Awards",
    text: "Form, Team Impact, Awards und erweiterte Auswertungen für mehr Motivation.",
    icon: ChartColumn,
  },
];

const productBlocks = [...trainingBlocks, ...competitionBlocks];

function InfoCard({
  title,
  text,
  icon: Icon,
  inverted = false,
}: {
  title: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
  inverted?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] p-5 text-center ${
        inverted
          ? "border border-white/10 bg-white/5 text-white"
          : "border border-black/10 bg-white text-black"
      }`}
    >
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
          inverted ? "bg-white text-black" : "bg-black text-white"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p
        className={`mt-2 text-sm leading-6 ${
          inverted ? "text-white/70" : "text-zinc-600"
        }`}
      >
        {text}
      </p>
    </div>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <NativeAppEntryRedirect />
      <LandingPageTracker />
      {/* HERO */}
      <section className="mx-auto w-full max-w-4xl px-4 pb-14 pt-16 text-center sm:px-6 lg:px-8 lg:pt-20">
        <div className="flex flex-col items-center">
          <Image
            src="/icon-dark.png"
            alt="strikr Logo"
            width={160}
            height={160}
            className="h-[160px] w-[160px]"
            priority
          />

          <div className="mt-6 text-[2.2rem] font-black tracking-[-0.03em]">
            strikr
          </div>

          <div className="mt-8 inline-block rounded-2xl bg-black px-7 py-3.5">
            <p className="text-sm font-semibold text-white sm:text-base">
              Euer Training. Mehr Struktur. Mehr Emotion.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup?next=%2Fclub-setup"
              data-analytics-event="landing_signup_cta_click"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-6 py-3.5 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              Team kostenlos starten
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/login"
              data-analytics-event="landing_login_click"
              className="inline-flex items-center justify-center rounded-2xl border border-black/20 px-6 py-3.5 text-sm font-bold text-black transition hover:bg-zinc-100"
            >
              Login
            </Link>
          </div>

          <p className="mt-3 text-xs font-medium text-zinc-500">
            Kostenlos starten. 4 MVP-Abstimmungen pro Saison inklusive. Bald auch als App verfügbar.
          </p>
        </div>
      </section>

      {/* PRODUCT FLOW */}
      <section className="w-full bg-black text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Was strikr macht
            </div>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Vom Training zum Team-Moment.
            </h2>

            <p className="mt-4 text-sm leading-6 text-white/70 sm:text-base">
              Anwesenheit, Teams, Ergebnis, MVP, Tabelle und Share Cards — ein
              klarer Flow statt Chat-Chaos.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {productBlocks.map((block) => (
              <InfoCard key={block.title} {...block} inverted />
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              strikr Pro
            </div>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Kostenlos starten. Pro nutzen, wenn strikr bei euch läuft.
            </h2>

            <p className="mt-4 text-base leading-7 text-zinc-600 sm:text-lg">
              Free ist zum Ausprobieren da. Mit Pro wird strikr zum dauerhaften
              Team-System: unbegrenztes MVP Voting, volle Tabellen, Stats,
              Premium Share Cards und zukünftige Awards.
            </p>

            <p className="mt-3 text-sm font-semibold text-zinc-500">
              Aktuell als Web-App nutzbar – bald auch als App verfügbar.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-black/10 bg-zinc-50 p-6">
              <div className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-bold text-zinc-700">
                Free
              </div>

              <h3 className="mt-4 text-2xl font-black tracking-tight">
                Zum Starten
              </h3>

              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Für Teams, die strikr testen und den Trainingsflow kennenlernen
                möchten – ohne Abo-Zwang.
              </p>

              <div className="mt-6 space-y-3 text-sm font-semibold text-zinc-800">
                <div>✓ Club erstellen</div>
                <div>✓ Spieler einladen</div>
                <div>✓ Anwesenheit erfassen</div>
                <div>✓ Teams erstellen</div>
                <div>✓ Ergebnis speichern</div>
                <div>✓ Siegerfoto teilen</div>
                <div>✓ Aktuelle Tabelle</div>
                <div>✓ 4 MVP-Abstimmungen pro Saison</div>
              </div>

              <div className="mt-6 rounded-2xl bg-white p-4 text-sm leading-6 text-zinc-600">
                Perfekt zum Reinkommen: Der Kernflow bleibt einfach. Historische
                Tabellen, volle Statistiken und Premium-Auswertungen gehören zu Pro.
              </div>
            </div>

            <div className="rounded-[28px] border border-black bg-black p-6 text-white shadow-xl">
              <div className="inline-flex rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 text-xs font-bold text-amber-100">
                DAHSC Special
              </div>

              <h3 className="mt-4 text-2xl font-black tracking-tight">
                strikr Pro
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/70">
                Für Teams, die strikr dauerhaft nutzen und aus jedem Training
                mehr Struktur, Motivation und Team-Momente machen wollen.
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-bold text-white">
                  4 Wochen Pro kostenlos testen
                </div>
                <div className="mt-1 text-sm leading-6 text-white/65">
                  Danach Free weiter nutzen oder den DAHSC Preis sichern:
                  149 € im ersten Jahr statt 199 €.
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm font-semibold text-white">
                <div>✓ Unbegrenztes MVP Voting</div>
                <div>✓ Volle Statistiken, Formkurven und Team Impact</div>
                <div>✓ Vergangene Tabellen und ewige Tabelle</div>
                <div>✓ Premium Share Cards</div>
                <div>✓ Optionale Strafenkasse / Strafen</div>
                <div>✓ Zukünftige Awards, Badges und Trophäenraum</div>
              </div>

              <div className="mt-6 grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/65">Normalpreis</span>
                  <span className="font-black text-white">199 € / Jahr</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/65">entspricht</span>
                  <span className="font-black text-white">16,58 € / Monat</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/65">DAHSC Special</span>
                  <span className="font-black text-white">149 € im 1. Jahr</span>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <a
                  href="https://wa.me/491772685717?text=Hi%2C%20wir%20interessieren%20uns%20f%C3%BCr%20strikr%20Pro%20und%20das%20Supercup-Angebot."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-zinc-200"
                >
                  WhatsApp
                </a>

                <a
                  href="mailto:mb1607@gmx.de?subject=strikr%20Pro%20Anfrage&body=Hi%2C%20wir%20interessieren%20uns%20f%C3%BCr%20strikr%20Pro%20und%20das%20Supercup-Angebot."
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  E-Mail
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-black/10">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black sm:text-4xl">
            Startet kostenlos. Wenn es passt, wird Pro daraus.
          </h2>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup?next=%2Fclub-setup"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-6 py-3.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Team kostenlos starten
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-black/20 px-6 py-3.5 text-sm font-semibold text-black hover:bg-zinc-100"
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/10 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="font-semibold text-zinc-700">strikr</div>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/impressum" className="hover:text-black">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-black">
              Datenschutz
            </Link>
            <a href="mailto:mb1607@gmx.de" className="hover:text-black">
              Kontakt
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}