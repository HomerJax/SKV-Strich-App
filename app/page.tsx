import NativeAppEntryRedirect from "@/components/native/NativeAppEntryRedirect";
import LandingPageTracker from "@/components/analytics/LandingPageTracker";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  Bell,
  Camera,
  ChartColumn,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const APP_STORE_URL = "https://apps.apple.com/app/strikr/id6789918875";

const productBlocks = [
  {
    title: "Zusagen & Anwesenheit",
    text: "Wer ist dabei? Wer fehlt? Trainingsplanung ohne Chat-Chaos.",
    icon: Users,
  },
  {
    title: "Faire Teams",
    text: "Aus den Zusagen möglichst ausgeglichene Teams erstellen und direkt loslegen.",
    icon: Sparkles,
  },
  {
    title: "Ergebnis & Siegerfoto",
    text: "Ergebnis speichern, Sieger festhalten und den Trainingsmoment teilen.",
    icon: Camera,
  },
  {
    title: "Tabelle & Wettbewerb",
    text: "Siege und Ergebnisse werden automatisch zur laufenden Tabelle über die Saison.",
    icon: Trophy,
  },
  {
    title: "Stats & Trophäen",
    text: "Persönliche Statistiken, Spieler-Vergleiche und sammelbare Trophäen für Einsätze und Erfolge.",
    icon: ChartColumn,
  },
  {
    title: "Direkt aufs Smartphone",
    text: "Push- und In-App-Benachrichtigungen halten euer Team auf dem Laufenden.",
    icon: Bell,
  },
];

function InfoCard({
  title,
  text,
  icon: Icon,
}: {
  title: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-center text-white">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/70">{text}</p>
    </div>
  );
}

function StoreButtons() {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noreferrer"
        data-analytics-event="landing_app_store_click"
        className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-black px-5 py-3 text-left text-white shadow-lg transition hover:bg-zinc-800"
      >
        <span className="text-2xl leading-none"></span>
        <span>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-white/65">Laden im</span>
          <span className="block text-base font-black leading-5">App Store</span>
        </span>
      </a>
      <div className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-black/15 bg-white px-5 py-3 text-left text-black shadow-sm">
        <Smartphone className="h-6 w-6" />
        <span>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Android</span>
          <span className="block text-base font-black leading-5">Testphase läuft</span>
        </span>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/home");

  return (
    <main className="min-h-screen bg-white text-black">
      <NativeAppEntryRedirect />
      <LandingPageTracker />

      <section className="mx-auto w-full max-w-5xl px-4 pb-14 pt-10 text-center sm:px-6 lg:px-8 lg:pt-16">
        <div className="flex flex-col items-center">
          <div className="mb-5 inline-flex rounded-full bg-emerald-100 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-800">
            Jetzt kostenlos starten · Founder-Vorteile sichern
          </div>
          <Image src="/icon-dark.png" alt="strikr Logo" width={132} height={132} className="h-[132px] w-[132px]" priority />
          <div className="mt-4 text-[2.2rem] font-black tracking-[-0.04em]">strikr</div>

          <h1 className="mt-7 max-w-3xl text-4xl font-black tracking-[-0.05em] sm:text-5xl">
            Macht aus eurem Mannschaftstraining einen Wettbewerb.
          </h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-zinc-600 sm:text-lg">
            Zusagen. Faire Teams. Spielen. Ergebnis eintragen. strikr macht daraus automatisch eine laufende Tabelle, persönliche Statistiken, Spieler-Vergleiche und Trophäen.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup?next=%2Fclub-setup" data-analytics-event="landing_signup_cta_click" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-7 py-4 text-sm font-black text-white transition hover:bg-zinc-800">
              Team kostenlos starten <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" data-analytics-event="landing_login_click" className="inline-flex items-center justify-center rounded-2xl border border-black/20 px-7 py-4 text-sm font-bold hover:bg-zinc-100">
              Login
            </Link>
          </div>

          <div className="mt-7 w-full max-w-xl rounded-[28px] border border-black/10 bg-zinc-50 p-4 sm:p-5">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">strikr aufs Smartphone</div>
            <StoreButtons />
          </div>
          <p className="mt-4 text-xs font-semibold text-zinc-500">Aktuell komplett kostenlos und ohne Verpflichtung.</p>
        </div>
      </section>

      <section className="w-full bg-black text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">So funktioniert strikr</div>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Vom normalen Training zur eigenen Saison.</h2>
            <p className="mt-4 text-sm leading-6 text-white/70 sm:text-base">Keine komplizierte Vereinsverwaltung. strikr konzentriert sich auf das, was auf dem Platz passiert.</p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {productBlocks.map((block) => <InfoCard key={block.title} {...block} />)}
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-[32px] border border-black bg-black p-6 text-white shadow-xl sm:p-9">
            <div className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">EARLY TEAM / FOUNDER</div>
            <h2 className="mt-5 text-3xl font-black sm:text-4xl">Jetzt einsteigen lohnt sich.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/70">
              strikr ist aktuell komplett kostenlos. Teams, die jetzt früh mit uns starten und Feedback geben, sichern sich Founder-Status und dauerhafte Vorteile, falls später ein Premium-Modell dazukommt.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/signup?next=%2Fclub-setup" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-black hover:bg-zinc-100">
                Founder-Team werden <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-4 text-xs font-semibold text-white/45">Keine Paywall. Keine Verpflichtung. Spätere Änderungen werden transparent angekündigt.</p>
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 bg-zinc-50">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black sm:text-4xl">Bereit fürs nächste Training?</h2>
          <p className="mt-3 text-sm font-medium text-zinc-600">Team anlegen, Spieler einladen und beim nächsten Training einfach ausprobieren.</p>
          <div className="mt-7"><StoreButtons /></div>
          <div className="mt-6">
            <Link href="/signup?next=%2Fclub-setup" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-7 py-4 text-sm font-black text-white hover:bg-zinc-800">Team kostenlos starten <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="font-semibold text-zinc-700">strikr · Training redefined!</div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/impressum" className="hover:text-black">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-black">Datenschutz</Link>
            <Link href="/support" className="hover:text-black">Support</Link>
            <Link href="/account-loeschen" className="hover:text-black">Konto löschen</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
