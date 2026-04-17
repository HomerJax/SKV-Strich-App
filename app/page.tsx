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
    title: "Teams",
    text: "Fair und automatisch erstellte Teams – mit dem strikr Algorithmus.",
    icon: Sparkles,
  },
  {
    title: "Ergebnis",
    text: "Das Training bleibt dokumentiert statt vergessen.",
    icon: Trophy,
  },
];

const competitionBlocks = [
  {
    title: "MVP",
    text: "Leistung wird sichtbar, ohne das Teamgefühl zu verlieren.",
    icon: Star,
  },
  {
    title: "Tabelle",
    text: "Siege und Teilnahmen fließen in eure Saison – und treiben euch weiter an.",
    icon: Trophy,
  },
  {
    title: "Statistiken",
    text: "Jeder Spieler sieht Fortschritt, Ergebnisse und Entwicklung auf einen Blick.",
    icon: ChartColumn,
  },
];

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
      className={`rounded-[24px] p-6 text-center ${
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
      {/* HERO */}
      <section className="mx-auto w-full max-w-4xl px-4 pb-20 pt-16 text-center sm:px-6 lg:px-8 lg:pt-20">
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
              Macht euer Training zum Erlebnis!
            </p>
          </div>
        </div>
      </section>

      {/* BLACK BLOCK */}
      <section className="w-full bg-black text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Warum strikr
            </div>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Mehr als nur Anwesenheit und Teams.
            </h2>

            <p className="mt-4 text-base leading-7 text-white/75 sm:text-lg">
              strikr bringt Struktur ins Training – und macht daraus etwas, das
              im Team hängen bleibt.
            </p>
          </div>
        </div>
      </section>

      {/* TRAINING (weiß) */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Training
          </div>

          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            Alles, was euer Training braucht.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {trainingBlocks.map((block) => (
            <InfoCard key={block.title} {...block} />
          ))}
        </div>
      </section>

      {/* COMPETITION (schwarz) */}
      <section className="w-full bg-black">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Mehr daraus machen
            </div>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Motivation, die bleibt.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {competitionBlocks.map((block) => (
              <InfoCard key={block.title} {...block} inverted />
            ))}
          </div>
        </div>
      </section>

      {/* EMOTION */}
      <section className="border-t border-black/10 bg-zinc-50">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
              <Camera className="h-5 w-5" />
            </div>

            <h2 className="mt-4 text-3xl font-black sm:text-4xl">
              Und am Ende bleibt mehr als nur ein Ergebnis.
            </h2>

            <p className="mt-4 text-base leading-7 text-zinc-600 sm:text-lg">
              Siegerfoto, MVP und Saison machen aus Training ein Erlebnis, das
              bleibt.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-black/10">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black sm:text-4xl">
            Startet jetzt mit strikr.
          </h2>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-6 py-3.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Team starten
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
    </main>
  );
}