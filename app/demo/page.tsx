import type { Metadata } from "next";
import DemoApp from "./DemoApp";
import { DEMO_CLUB } from "@/lib/demo/data";

export const metadata: Metadata = {
  title: "strikr Demo",
  description: "strikr ohne Registrierung ausprobieren.",
};

export default function DemoPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const logoUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/club-logos/${DEMO_CLUB.logoPath}`
    : "/icon-dark.png";

  return <DemoApp logoUrl={logoUrl} />;
}
