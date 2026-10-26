import type { Metadata } from "next";
import DemoApp from "./DemoApp";
import { DEMO_CLUB } from "@/lib/demo/data";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerI18n();
  const title = locale === "en"
    ? "strikr live demo: training, teams and standings"
    : "strikr Live-Demo: Training, Teams & Tabelle";
  const description = locale === "en"
    ? "Try strikr without signing up: explore attendance, balanced teams, results, standings and stats in a sample team."
    : "strikr ohne Registrierung ausprobieren: Zu- und Absagen, faire Teams, Ergebnisse, Tabelle und Statistiken im Beispielteam ansehen.";
  return {
    title,
    description,
    alternates: { canonical: "/demo" },
    openGraph: { type: "website", siteName: "strikr", title, description, url: "/demo" },
    twitter: { card: "summary", title, description },
  };
}

export default function DemoPage() {
  return <DemoApp logoUrl={DEMO_CLUB.logoUrl} />;
}
