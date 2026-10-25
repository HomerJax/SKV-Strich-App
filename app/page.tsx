import NativeAppEntryRedirect from "@/components/native/NativeAppEntryRedirect";
import LandingPageTracker from "@/components/analytics/LandingPageTracker";
import ThatsStrikrSection from "@/components/marketing/ThatsStrikrSection";
import RecoveryLandingRedirect from "@/components/auth/RecoveryLandingRedirect";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FREE_HIGHLIGHTS, PRO_HIGHLIGHTS } from "@/lib/billing/product-matrix";
import { INTRO_PRICING, getAnnualSavingsPercent } from "@/lib/billing/pricing";
import {
  ArrowRight,
  Bell,
  Camera,
  ChartColumn,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const APP_STORE_URL = "https://apps.apple.com/app/strikr/id6789918875";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=team.strikr.app";

const flowSteps = [
  {
    number: "01",
    title: "Wer ist dabei?",
    text: "Zusagen und Anwesenheit direkt im Team statt zwischen Chat-Nachrichten.",
    icon: Users,
  },
  {
    number: "02",
    title: "Faire Teams",
    text: "Aus eurer Gruppe möglichst ausgeglichene Teams erstellen und loslegen.",
    icon: Sparkles,
  },
  {
    number: "03",
    title: "Spielen & Ergebnis",
    text: "Gemeinsam spielen, Ergebnis speichern und eure Einheit festhalten.",
    icon: Camera,
  },
  {
    number: "04",
    title: "Alles zählt weiter",
    text: "Tabelle, persönliche Stats, Vergleiche und Trophäen entwickeln sich automatisch weiter.",
    icon: Trophy,
  },
];

const featureNavigation = [
  { href: "#feature-organisation", number: "01", title: "Organisation", hint: "Zusagen & Trainingsplanung", icon: Users },
  { href: "#feature-fair", number: "02", title: "Faire Teams", hint: "Ausgeglichen statt diskutieren", icon: Sparkles },
  { href: "#feature-stats", number: "03", title: "Stats & Badges", hint: "Jedes Training zählt weiter", icon: ChartColumn },
  { href: "#feature-more", number: "04", title: "Mehr entdecken", hint: "Ergebnisse, Fotos & Updates", icon: Trophy },
];

const gameBlocks = [
  {
    eyebrow: "DEINE KARRIERE",
    title: "Persönliche Stats, die bleiben.",
    text: "Einsätze, Siege, Serien und Karrierewerte machen aus einzelnen Trainings eine Geschichte.",
    icon: ChartColumn,
  },
  {
    eyebrow: "TROPHÄEN",
    title: "Verdienen statt nur teilnehmen.",
    text: "Erfolge und Badges geben Spielern Ziele, Fortschritt und kleine Momente zum Feiern.",
    icon: Trophy,
  },
  {
    eyebrow: "TEAM TALK",
    title: "Mehr Gesprächsstoff im Team.",
    text: "Wer führt? Wer hat die Serie? Wer gewinnt mit wem? Genau daraus entstehen Rivalität, Spaß und Team-Dynamik.",
    icon: Users,
  },
];

const productBlocks = [
  {
    title: "Zusagen & Anwesenheit",
    text: "Wer ist dabei? Wer fehlt? Gemeinsame Termine planen – ohne Chat-Chaos.",
    icon: Users,
  },
  {
    title: "Faire Teams",
    text: "Aus den Zusagen möglichst ausgeglichene Teams erstellen und direkt loslegen.",
    icon: Sparkles,
  },
  {
    title: "Ergebnis & Siegerfoto",
    text: "Ergebnis speichern, Sieger festhalten und Spielmomente teilen.",
    icon: Camera,
  },
  {
    title: "Tabelle & Wettbewerb",
    text: "Aus euren Ergebnissen entsteht eine Tabelle – auch ohne Ligabetrieb.",
    icon: Trophy,
  },
  {
    title: "Stats & Trophäen",
    text: "Persönliche Statistiken, Vergleiche und sammelbare Erfolge.",
    icon: ChartColumn,
  },
  {
    title: "Direkt aufs Smartphone",
    text: "Push- und In-App-Benachrichtigungen halten euer Team auf dem Laufenden.",
    icon: Bell,
  },
];

function StoreButtons() {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-3">
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noreferrer"
        data-analytics-event="landing_app_store_click"
        aria-label="strikr im App Store laden"
        className="flex h-14 w-[168px] items-center justify-center transition hover:opacity-85"
      >
        <img
          src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/de-de?size=250x83"
          alt="Im App Store laden"
          className="max-h-12 max-w-[160px] object-contain"
          style={{ width: "160px", height: "48px" }}
        />
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noreferrer"
        data-analytics-event="landing_play_store_click"
        aria-label="strikr bei Google Play laden"
        className="flex h-14 w-[168px] items-center justify-center overflow-hidden transition hover:opacity-85"
      >
        <img
          src="https://play.google.com/intl/en_us/badges/static/images/badges/de_badge_web_generic.png"
          alt="Jetzt bei Google Play"
          className="object-contain"
          style={{ width: "168px", height: "56px", objectFit: "contain" }}
        />
      </a>
    </div>
  );
}

function ProductStage() {
  return (
    <div className="relative mx-auto mt-12 max-w-5xl">
      <div className="pointer-events-none absolute -left-16 top-12 h-64 w-64 rounded-full bg-cyan-400/25 blur-3xl strikr-glow" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-violet-500/30 blur-3xl strikr-glow strikr-delay" />

      <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.055] p-3 shadow-[0_35px_120px_rgba(0,0,0,0.48)] backdrop-blur-xl sm:p-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
        <div className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[27px] border border-white/10 bg-[#080d16]/95 p-5 text-left sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                  Donnerstag · 19:00
                </div>
                <div className="mt-1 text-xl font-black tracking-tight text-white">
                  Training · 18 Spieler
                </div>
              </div>
              <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-black text-emerald-200">
                BEREIT
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/80">
                  Team A
                </div>
                <div className="mt-3 space-y-2 text-sm font-bold text-white/90">
                  <div className="flex justify-between"><span>Alex</span><span className="text-white/35">8.2</span></div>
                  <div className="flex justify-between"><span>Chris</span><span className="text-white/35">7.4</span></div>
                  <div className="flex justify-between"><span>Marco</span><span className="text-white/35">6.8</span></div>
                </div>
              </div>
              <div className="rounded-[22px] border border-violet-300/15 bg-violet-300/[0.06] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200/80">
                  Team B
                </div>
                <div className="mt-3 space-y-2 text-sm font-bold text-white/90">
                  <div className="flex justify-between"><span>Daniel</span><span className="text-white/35">8.0</span></div>
                  <div className="flex justify-between"><span>Flo</span><span className="text-white/35">7.5</span></div>
                  <div className="flex justify-between"><span>Ben</span><span className="text-white/35">6.9</span></div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-black">
                Faire Teams erstellt
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/60">
                Los geht&apos;s →
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="relative overflow-hidden rounded-[27px] border border-white/10 bg-gradient-to-br from-[#0b111c] to-[#111827] p-5 text-left">
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/25 blur-2xl" />
              <div className="relative text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                Ergebnis gespeichert
              </div>
              <div className="relative mt-2 flex items-end justify-between gap-4">
                <div className="text-5xl font-black tracking-[-0.08em] text-white">5:3</div>
                <div className="rounded-full bg-cyan-300 px-3 py-1 text-[10px] font-black text-slate-950">
                  +3 PUNKTE
                </div>
              </div>
              <div className="relative mt-4 text-xs font-semibold text-white/55">
                Tabelle & Stats aktualisiert
              </div>
            </div>

            <div className="grid grid-cols-[0.9fr_1.1fr] gap-3">
              <div className="strikr-float relative overflow-hidden rounded-[24px] border border-amber-300/20 bg-gradient-to-br from-amber-300/10 to-orange-500/5 p-3 text-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(251,191,36,0.18),transparent_48%)]" />
                <Image
                  src="/badges/hero/gold.webp"
                  alt="Gold Trophäe"
                  width={170}
                  height={170}
                  className="relative mx-auto h-24 w-24 object-contain sm:h-28 sm:w-28"
                />
                <div className="relative -mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
                  Trophäe verdient
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-4 text-left">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-200/70">
                  Karriere
                </div>
                <div className="mt-2 text-2xl font-black text-white">67%</div>
                <div className="text-xs font-semibold text-white/45">Siegquote</div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400" />
                </div>
                <div className="mt-2 text-[10px] font-bold text-white/45">12 Siege · 18 Einsätze</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";

  if (code) {
    redirect(
      `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(
        "/login/reset-password",
      )}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/home");

  return (
    <main className="min-h-screen overflow-hidden bg-[#04070d] text-white">
      <RecoveryLandingRedirect />
      <NativeAppEntryRedirect />
      <LandingPageTracker />

      <style>{`
        @keyframes strikrGlow {
          0%, 100% { opacity: .55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes strikrFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes strikrLogoPulse {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(103,232,249,.12)); }
          50% { filter: drop-shadow(0 0 30px rgba(103,232,249,.28)); }
        }
        .strikr-glow { animation: strikrGlow 5.5s ease-in-out infinite; }
        .strikr-delay { animation-delay: -2.2s; }
        .strikr-float { animation: strikrFloat 4.8s ease-in-out infinite; }
        .strikr-logo-pulse { animation: strikrLogoPulse 4.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .strikr-glow, .strikr-float, .strikr-logo-pulse { animation: none; }
        }
      `}</style>

      <section className="relative border-b border-white/8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(34,211,238,0.16),transparent_23%),radial-gradient(circle_at_13%_24%,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_86%_11%,rgba(124,58,237,0.24),transparent_32%),radial-gradient(circle_at_66%_64%,rgba(59,130,246,0.13),transparent_36%)]" />
        <div className="pointer-events-none absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[90px] strikr-glow" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.035),transparent)]" />

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pb-24">
          <header className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/icon-light.png"
                alt="strikr"
                width={42}
                height={42}
                className="h-10 w-10 rounded-xl"
                priority
              />
              <div>
                <div className="text-lg font-black tracking-[-0.04em]">strikr</div>
                <div className="-mt-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/38">
                  Training redefined.
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                data-analytics-event="landing_login_click"
                className="hidden rounded-full px-4 py-2 text-xs font-bold text-white/60 transition hover:text-white sm:inline-flex"
              >
                Login
              </Link>
              <Link
                href="/demo"
                data-analytics-event="landing_demo_click"
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-black text-white backdrop-blur-md transition hover:bg-white/12"
              >
                Live-Demo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </header>

          <div className="mx-auto mt-7 max-w-4xl text-center sm:mt-14 lg:mt-16">
            <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center sm:mb-6 sm:h-28 sm:w-28 lg:h-32 lg:w-32">
              <div className="pointer-events-none absolute inset-[-34px] rounded-full bg-cyan-400/25 blur-3xl strikr-glow" />
              <div className="pointer-events-none absolute inset-[-18px] rounded-full bg-violet-500/20 blur-2xl strikr-glow strikr-delay" />
              <div className="pointer-events-none absolute inset-0 rounded-[34px] border border-cyan-200/15 bg-gradient-to-br from-cyan-300/10 via-white/[0.035] to-violet-400/10 shadow-[0_0_70px_rgba(34,211,238,0.16)]" />
              <Image
                src="/icon-light.png"
                alt="strikr Logo"
                width={150}
                height={150}
                className="strikr-logo-pulse relative h-[72px] w-[72px] rounded-[20px] object-contain sm:h-24 sm:w-24 lg:h-28 lg:w-28"
                priority
              />
            </div>

            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-gradient-to-r from-cyan-300/[0.09] to-violet-400/[0.08] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100 shadow-[0_0_38px_rgba(34,211,238,0.13)]">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,1)]" />
              Dein Team. Dein Ding.
            </div>

            <h1 className="mt-4 text-[2.7rem] font-black leading-[0.98] tracking-[-0.06em] text-white sm:mt-7 sm:text-7xl lg:text-[5.6rem]">
              Mehr aus jedem
              <span className="block bg-gradient-to-r from-white via-cyan-200 to-violet-300 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(103,232,249,0.12)]">
                Training.
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-6 text-white/75 sm:mt-6 sm:text-lg sm:leading-8">
              strikr ist eure App für Hobby- und Freizeitteams.
              Zusagen organisieren, faire Teams bilden, Ergebnisse festhalten
              und mit Tabellen, Stats und Badges für neue Motivation sorgen.
              Ohne Pflichtliga. Ohne Organisationschaos.
            </p>

            <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center">
              <Link
                href="/demo"
                data-analytics-event="landing_demo_click"
                className="group inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black text-slate-950 shadow-[0_0_42px_rgba(103,232,249,0.15)] transition hover:-translate-y-0.5 hover:bg-cyan-50"
              >
                strikr kostenlos ausprobieren
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/signup?next=%2Fclub-setup"
                data-analytics-event="landing_signup_cta_click"
                className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-violet-300/20 bg-gradient-to-r from-white/[0.065] to-violet-400/[0.07] px-7 py-4 text-sm font-black text-white backdrop-blur-md transition hover:bg-white/10"
              >
                Eigenes Team kostenlos starten
              </Link>
            </div>

            <p className="mt-3 text-xs font-semibold text-white/60 sm:mt-4">
              Demo ohne Anmeldung · Free-Tarif verfügbar · Für Hobby- und Freizeitteams
            </p>
            <a href="#features" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-cyan-200/85 underline decoration-cyan-300/30 underline-offset-4 transition hover:text-white">
              Alle Funktionen entdecken ↓
            </a>
          </div>

          <ProductStage />
        </div>
      </section>

      <section id="features" className="relative scroll-mt-8 bg-[#070b12] py-16 sm:py-20">
        <div className="pointer-events-none absolute left-[8%] top-12 h-48 w-48 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="pointer-events-none absolute right-[6%] bottom-10 h-52 w-52 rounded-full bg-violet-500/9 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
              Das steckt in strikr
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-5xl">
              Eine App. Viele Gründe, wieder zu spielen.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              Alles zusammen – oder genau das Feature, das euer Team gerade braucht.
              Entdecke, was strikr für eure Runde verändert.
            </p>
          </div>

          <nav aria-label="strikr Features entdecken" className="mt-9 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {featureNavigation.map(({ href, number, title, hint, icon: Icon }) => (
              <a key={href} href={href}
                className="group flex min-h-28 flex-col rounded-[19px] border border-cyan-300/20 bg-gradient-to-br from-cyan-300/[0.07] to-violet-300/[0.05] p-3.5 transition hover:border-cyan-300/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300 sm:p-4">
                <span className="flex items-center justify-between text-[10px] font-black text-cyan-300/80">
                  {number}<Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="mt-3 text-sm font-black text-white">{title} ↗</span>
                <span className="mt-1 text-[11px] leading-4 text-white/50">{hint}</span>
              </a>
            ))}
          </nav>

          <div id="feature-organisation" className="mt-10 scroll-mt-10">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/85">Organisiert. Aufgestellt. Losgespielt.</div>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">So läuft ein Training mit strikr.</h3>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {flowSteps.map(({ number, title, text, icon: Icon }) => (
              <div
                key={number}
                className="group rounded-[26px] border border-white/9 bg-white/[0.045] p-5 transition hover:-translate-y-1 hover:border-cyan-300/20 hover:bg-white/[0.065]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/7 text-white">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-[11px] font-black tracking-[0.16em] text-white/22">
                    {number}
                  </div>
                </div>
                <h3 className="mt-5 text-lg font-black tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section id="feature-fair" className="relative scroll-mt-8 overflow-hidden bg-[#091523] py-16 sm:py-20">
        <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-[85px]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-14 lg:px-8">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
              Feature 01 / Faire Teams
            </div>
            <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-[-0.06em] text-white sm:text-5xl">
              Ein Klick.<span className="block text-cyan-300">Faire Teams.</span>
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/65 sm:text-base">
              Keine ewigen Diskussionen, wer mit wem spielt: strikr berücksichtigt
              die hinterlegten Spielerstärken und Einstellungen, um möglichst
              ausgeglichene Teams für euren Trainingsabend zu erstellen.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-white/75">
              <span className="rounded-full border border-white/15 px-3 py-2">Spieler auswählen</span>
              <span className="rounded-full border border-white/15 px-3 py-2">Teams berechnen</span>
              <span className="rounded-full border border-white/15 px-3 py-2">Losspielen</span>
            </div>
            <Link href="/demo" data-analytics-event="landing_fair_feature_demo_click"
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-white">
              Selber ausprobieren <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative rounded-[28px] border border-white/15 bg-white/[0.045] p-4 shadow-[0_30px_85px_rgba(0,0,0,.3)] sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">Beispiel · 10 Spieler</span>
              <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-[10px] font-black text-cyan-200">AUSGEGLICHEN</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { title: "Team A", color: "border-cyan-300/35 bg-cyan-300/[0.08]", players: ["Alex", "Chris", "Marco", "Flo", "Ben"] },
                { title: "Team B", color: "border-violet-300/35 bg-violet-300/[0.08]", players: ["Daniel", "Max", "Timo", "Sven", "Luca"] },
              ].map((team) => (
                <div key={team.title} className={`min-w-0 rounded-2xl border p-3 sm:p-4 ${team.color}`}>
                  <p className="text-sm font-black text-white">{team.title}</p>
                  <div className="mt-4 space-y-2">
                    {team.players.map((name) => (
                      <div key={name} className="flex items-center gap-2 text-xs font-semibold text-white/75">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
                        <span className="truncate">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-[11px] font-semibold text-white/45">
              Dein Kader. Deine Einstellungen. Ein fairerer Start.
            </p>
          </div>
        </div>
      </section>

      <section id="feature-stats" className="relative scroll-mt-8 overflow-hidden bg-[#f5f7fa] py-16 text-slate-950 sm:py-24">
        <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-violet-300/35 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-600">
                Feature 02 / Stats, Tabellen & Badges
              </div>
              <h2 className="mt-3 max-w-xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
                Jedes Ergebnis erzählt weiter.
              </h2>
            </div>
            <p className="max-w-xl text-sm font-medium leading-7 text-slate-600 sm:text-base">
              Nach dem Spiel ist nicht Schluss: Ergebnisse, Tabellen,
              Karrierestatistiken und Badges machen Fortschritte sichtbar – auch
              wenn ihr keine Liga spielt.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {gameBlocks.map(({ eyebrow, title, text, icon: Icon }, index) => (
              <div
                key={title}
                className={`relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.07)] ${
                  index === 1 ? "lg:-translate-y-4" : ""
                }`}
              >
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br from-cyan-200/55 to-violet-200/45 blur-2xl" />
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="relative mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {eyebrow}
                </div>
                <h3 className="relative mt-2 text-xl font-black tracking-tight">
                  {title}
                </h3>
                <p className="relative mt-3 text-sm leading-6 text-slate-600">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="feature-more" className="relative scroll-mt-8 bg-[#05080e] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
              Feature 03 / Alle Möglichkeiten
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
              Auch der Rest eures Trainings läuft einfacher.
            </h2>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {productBlocks.map(({ title, text, icon: Icon }) => (
              <div
                key={title}
                className="rounded-[25px] border border-white/9 bg-white/[0.045] p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-blue-300 to-violet-400 text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.16)]">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="mt-4 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ThatsStrikrSection />

      <section className="relative overflow-hidden border-y border-white/8 bg-[#0a0f19] py-16 sm:py-20">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/16 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mx-auto inline-flex rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
            Keine Erklärung nötig
          </div>
          <h2 className="mt-5 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            Klick rein. Erlebe eine gemeinsame Spieleinheit.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
            Die Demo zeigt dir strikr mit einem gefüllten Beispielteam – ohne
            Registrierung und ohne vorher einen Club anzulegen.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/demo"
              data-analytics-event="landing_demo_click"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black text-slate-950 transition hover:bg-cyan-50"
            >
              Demo öffnen <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup?next=%2Fclub-setup"
              data-analytics-event="landing_signup_cta_click"
              className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/6 px-7 py-4 text-sm font-black text-white transition hover:bg-white/10"
            >
              Eigenes Team starten
            </Link>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#f5f7fa] py-16 text-slate-950 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-600">Free oder PRO</div>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-5xl">
              Kostenlos anfangen. Mehr Tiefe, wenn ihr sie braucht.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Free bleibt ein echtes Team-Produkt. PRO schaltet vor allem mehr Flexibilität,
              Historie, Karriere-Stats und tiefere Auswertungen frei.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">FREE</div>
              <h3 className="mt-4 text-2xl font-black">Alles für euren Trainingsabend.</h3>
              <div className="mt-5 space-y-2">
                {FREE_HIGHLIGHTS.map((feature) => (
                  <div key={feature} className="flex gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
                    <span className="font-black text-emerald-600">✓</span><span>{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup?next=%2Fclub-setup" data-analytics-event="landing_signup_cta_click" className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white">
                Team kostenlos starten
              </Link>
            </div>

            <div className="relative overflow-hidden rounded-[30px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-6 shadow-sm sm:p-7">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-300/30 blur-3xl" />
              <div className="relative inline-flex rounded-full bg-violet-700 px-3 py-1 text-xs font-black text-white">PRO</div>
              <div className="relative mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
                <h3 className="text-2xl font-black">Für Teams, die mehr draus machen.</h3>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-800">{INTRO_PRICING.badge}</span>
              </div>
              <div className="relative mt-4 flex flex-wrap items-end gap-4">
                <div><span className="text-3xl font-black text-slate-950">{INTRO_PRICING.monthly.label}</span><span className="ml-1 text-sm font-bold text-slate-500">{INTRO_PRICING.monthly.suffix}</span></div>
                <div className="text-sm font-bold text-violet-700">oder {INTRO_PRICING.yearly.label} {INTRO_PRICING.yearly.suffix} · ca. {getAnnualSavingsPercent()}% sparen</div>
              </div>
              <div className="relative mt-5 space-y-2">
                {PRO_HIGHLIGHTS.map((feature) => (
                  <div key={feature} className="flex gap-3 rounded-2xl bg-white/80 px-3 py-2.5 text-sm font-semibold text-slate-700">
                    <span className="font-black text-violet-600">✓</span><span>{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/pro" data-analytics-event="landing_pro_click" className="relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-5 py-3.5 text-sm font-black text-white transition hover:bg-violet-800">
                PRO ansehen <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="relative mt-3 text-center text-xs font-semibold text-slate-500">
                Einführungspreis für frühe Teams. Spätere Neukundenpreise können höher liegen.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-8 rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-9 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Jetzt loslegen</div>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">Erst spielen. Dann entscheiden, ob ihr PRO braucht.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                Ihr könnt mit Free direkt starten. PRO wird dort sichtbar angeboten, wo zusätzliche Tiefe oder Flexibilität Sinn ergibt.
              </p>
            </div>
            <div className="rounded-[27px] bg-slate-950 p-5 text-white">
              <div className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-white/40">strikr aufs Smartphone</div>
              <div className="mt-3"><StoreButtons /></div>
              <div className="mt-3 text-center text-[11px] font-semibold text-white/35">iOS · Android · Web</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 bg-[#04070d]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <div className="font-black text-white">strikr</div>
            <div className="text-xs font-semibold text-white/35">Training redefined.</div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/login" className="hover:text-white">Login</Link>
            <Link href="/impressum" className="hover:text-white">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-white">Datenschutz</Link>
            <Link href="/support" className="hover:text-white">Support</Link>
            <Link href="/account-loeschen" className="hover:text-white">Konto löschen</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
