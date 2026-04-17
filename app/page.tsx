import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, Camera, Sparkles, Star, Trophy, Users } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const trainingPoints = [
  "Anwesenheit im Blick",
  "faire Teams generieren",
  "Ergebnisse festhalten",
];

const gamePoints = [
  "MVP Voting",
  "Badges & Fortschritt",
  "Siegerfoto & Sharing",
];

const flowSteps = [
  {
    title: "Anwesenheit",
    text: "Wer ist da? Wer fehlt? Sofort klar – ohne Chat-Chaos.",
    icon: Users,
  },
  {
    title: "Teams",
    text: "Aus Zusagen werden faire, spielbare Teams in Sekunden.",
    icon: Sparkles,
  },
  {
    title: "Siegerfoto",
    text: "Das Training endet nicht einfach – es bekommt einen Moment.",
    icon: Camera,
  },
  {
    title: "Ergebnis",
    text: "Das Resultat bleibt sauber dokumentiert und nachvollziehbar.",
    icon: Trophy,
  },
  {
    title: "MVP",
    text: "Leistung wird sichtbar, ohne das Teamgefühl zu verlieren.",
    icon: Star,
  },
];

function BulletList({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item} className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-black" />
          <span className="text-sm text-zinc-700 sm:text-base">{item}</span>
        </div>
      ))}
    </div>
  );
}

function FlowCard({
  title,
  text,
  icon: Icon,
}: {
  title: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{text}</p>
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
      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-24 lg:pt-8">
        <div className="flex justify-end">
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 hover:text-black"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Team starten
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mx-auto flex max-w-4xl flex-col items-center pt-14 text-center sm:pt-16 lg:pt-20">
          <Image
            src="/icon-dark.png"
            alt="strikr Logo"
            width={150}
            height={150}
            className="h-[150px] w-[150px] object-contain"
            priority
          />

          <div className="mt-6 text-[2rem] font-black leading-none tracking-[-0.03em] text-black">
            strikr
          </div>

          <h1 className="mt-10 text-3xl font-semibold leading-tight tracking-tight text-black sm:text-4xl lg:text-[2.9rem]">
            Training organisieren.
            <span className="block text-zinc-600">Und mehr daraus machen.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            strikr verbindet{" "}
            <span className="font-semibold text-black">
              faire Teams, Ergebnisse, MVP, Badges und Sharing
            </span>{" "}
            in einem Flow für echte Mannschaften.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Jetzt Team starten
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="#flow"
              className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-50"
            >
              So funktioniert strikr
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="rounded-[32px] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Kern 1
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Alles fürs Training.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            Anwesenheit, faire Teams und Ergebnisse an einem Ort – klar, schnell
            und direkt vom Platz aus nutzbar.
          </p>

          <div className="mt-6">
            <BulletList items={trainingPoints} />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="rounded-[32px] bg-black p-6 text-white shadow-sm sm:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
            Kern 2
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Und danach beginnt das Spiel.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
            MVP Voting, Badges und Sharing machen aus Training mehr als reine
            Organisation – sie geben ihm Wettbewerb, Fortschritt und Erinnerung.
          </p>

          <div className="mt-6 space-y-3">
            {gamePoints.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-white" />
                <span className="text-sm text-white/82 sm:text-base">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="flow"
        className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
      >
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Der strikr Flow
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
            Vom Training zum MVP
          </h2>
          <p className="mt-4 text-base leading-7 text-zinc-600">
            Kein loses Tool-Sammelsurium, sondern ein klarer Ablauf, den man
            sofort versteht.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flowSteps.map((step) => (
            <FlowCard
              key={step.title}
              title={step.title}
              text={step.text}
              icon={step.icon}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <div className="rounded-[32px] border border-black/10 bg-zinc-50 p-6 text-center sm:p-8">
          <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            Jetzt mit deinem Team starten
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-600">
            strikr ist für Mannschaften gemacht, die Training einfacher
            organisieren und gleichzeitig mehr daraus machen wollen.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Team jetzt anlegen
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-100"
            >
              Ich habe schon einen Zugang
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-5xl flex-col gap-4 border-t border-black/10 px-4 py-8 text-sm text-zinc-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>© {new Date().getFullYear()} strikr</div>

        <div className="flex flex-wrap items-center gap-4">
          <Link href="/login" className="transition hover:text-black">
            Login
          </Link>
          <Link href="/register" className="transition hover:text-black">
            Team starten
          </Link>
          <Link href="/about" className="transition hover:text-black">
            Über strikr
          </Link>
        </div>
      </footer>
    </main>
  );
}