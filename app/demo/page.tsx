import type { Metadata } from "next";
import DemoApp from "./DemoApp";
import { DEMO_CLUB } from "@/lib/demo/data";

export const metadata: Metadata = {
  title: "strikr Demo",
  description: "strikr ohne Registrierung ausprobieren.",
};

export default function DemoPage() {
  return <DemoApp logoUrl={DEMO_CLUB.logoUrl} />;
}
